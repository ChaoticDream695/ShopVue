process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const { setupTestDb, teardownTestDb, clearTables, createAdminToken, createCustomerToken } = require('./helpers');

let adminToken;
let customerToken;
let customerId;
let productId;
let categoryId;

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTables();
  adminToken = await createAdminToken();
  const c = await createCustomerToken();
  customerToken = c.token;
  customerId = c.customer_id;

  const { rows: cat } = await pool.query(
    `INSERT INTO product_categories(category_name) VALUES('Tech') RETURNING *`
  );
  categoryId = cat[0].category_id;

  const { rows: prod } = await pool.query(
    `INSERT INTO products(product_name,price,stock_quantity,category_id)
     VALUES('Widget',49.99,100,$1) RETURNING *`,
    [categoryId]
  );
  productId = prod[0].product_id;
});

describe('POST /api/orders', () => {
  it('should create an order as customer', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: productId, quantity: 2 }] });

    expect(res.status).toBe(201);
    expect(parseFloat(res.body.total_amount)).toBeCloseTo(99.98);
    expect(res.body.items.length).toBe(1);
  });

  it('should decrement stock after order', async () => {
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: productId, quantity: 3 }] });

    const { rows } = await pool.query('SELECT stock_quantity FROM products WHERE product_id=$1', [productId]);
    expect(rows[0].stock_quantity).toBe(97);
  });

  it('should reject order with insufficient stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: productId, quantity: 9999 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stock/i);
  });

  it('should reject order with non-existent product', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: 99999, quantity: 1 }] });

    expect(res.status).toBe(404);
  });

  it('should reject order without items', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('should reject order by admin', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ product_id: productId, quantity: 1 }] });

    expect(res.status).toBe(403);
  });

  it('should reject unauthenticated order', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ product_id: productId, quantity: 1 }] });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/orders', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: productId, quantity: 1 }] });
  });

  it('should return customer own orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].customer_id).toBe(customerId);
  });

  it('should return all orders for admin', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/orders/:id', () => {
  let orderId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: productId, quantity: 1 }] });
    orderId = res.body.order_id;
  });

  it('should return order by id for customer (own order)', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.order_id).toBe(orderId);
  });

  it('should return 404 for non-existent order', async () => {
    const res = await request(app)
      .get('/api/orders/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/orders/:id/status', () => {
  let orderId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ product_id: productId, quantity: 1 }] });
    orderId = res.body.order_id;
  });

  it('should update order status as admin', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('should reject invalid status', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'flying' });

    expect(res.status).toBe(400);
  });

  it('should reject status update by customer', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'delivered' });

    expect(res.status).toBe(403);
  });
});
