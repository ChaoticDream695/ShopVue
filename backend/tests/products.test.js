process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const { setupTestDb, teardownTestDb, clearTables, createAdminToken, createCustomerToken } = require('./helpers');

let adminToken;
let customerToken;
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

  const { rows } = await pool.query(
    `INSERT INTO product_categories(category_name, category_description)
     VALUES('Electronics','Test category') RETURNING *`
  );
  categoryId = rows[0].category_id;
});

describe('GET /api/products', () => {
  it('should return empty product list', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('should return products', async () => {
    await pool.query(
      `INSERT INTO products(product_name, price, stock_quantity, category_id)
       VALUES('Laptop',999.99,10,$1)`,
      [categoryId]
    );

    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBe(1);
    expect(res.body.products[0].product_name).toBe('Laptop');
  });

  it('should support search query param', async () => {
    await pool.query(
      `INSERT INTO products(product_name, price, stock_quantity, category_id) VALUES
       ('Laptop Pro',1200,5,$1),('Mouse',25,100,$1)`,
      [categoryId]
    );
    const res = await request(app).get('/api/products?search=lap');
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBe(1);
    expect(res.body.products[0].product_name).toBe('Laptop Pro');
  });

  it('should filter by category_id', async () => {
    const { rows: cat2 } = await pool.query(
      `INSERT INTO product_categories(category_name) VALUES('Books') RETURNING *`
    );
    await pool.query(
      `INSERT INTO products(product_name, price, stock_quantity, category_id) VALUES
       ('Laptop',999,5,$1),('Novel',15,50,$2)`,
      [categoryId, cat2[0].category_id]
    );

    const res = await request(app).get(`/api/products?category_id=${cat2[0].category_id}`);
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBe(1);
    expect(res.body.products[0].product_name).toBe('Novel');
  });
});

describe('GET /api/products/:id', () => {
  it('should return a product by id', async () => {
    const { rows } = await pool.query(
      `INSERT INTO products(product_name,price,stock_quantity,category_id)
       VALUES('Phone',499,20,$1) RETURNING *`,
      [categoryId]
    );
    const res = await request(app).get(`/api/products/${rows[0].product_id}`);
    expect(res.status).toBe(200);
    expect(res.body.product_name).toBe('Phone');
    expect(res.body.category_name).toBe('Electronics');
  });

  it('should return 404 for non-existent product', async () => {
    const res = await request(app).get('/api/products/99999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/products', () => {
  it('should create product as admin', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ product_name: 'Tablet', price: 350, stock_quantity: 15, category_id: categoryId });

    expect(res.status).toBe(201);
    expect(res.body.product_name).toBe('Tablet');
  });

  it('should reject creation by customer', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ product_name: 'Tablet', price: 350, stock_quantity: 15, category_id: categoryId });

    expect(res.status).toBe(403);
  });

  it('should reject unauthenticated creation', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ product_name: 'Tablet', price: 350, stock_quantity: 15, category_id: categoryId });

    expect(res.status).toBe(401);
  });

  it('should reject missing fields', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ product_name: 'Incomplete' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/products/:id', () => {
  let productId;

  beforeEach(async () => {
    const { rows } = await pool.query(
      `INSERT INTO products(product_name,price,stock_quantity,category_id)
       VALUES('OldName',100,5,$1) RETURNING *`,
      [categoryId]
    );
    productId = rows[0].product_id;
  });

  it('should update product as admin', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ product_name: 'NewName', price: 200 });

    expect(res.status).toBe(200);
    expect(res.body.product_name).toBe('NewName');
    expect(parseFloat(res.body.price)).toBe(200);
  });

  it('should return 404 for non-existent product', async () => {
    const res = await request(app)
      .put('/api/products/99999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ product_name: 'X' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/products/:id', () => {
  it('should delete product as admin', async () => {
    const { rows } = await pool.query(
      `INSERT INTO products(product_name,price,stock_quantity,category_id)
       VALUES('ToDelete',50,1,$1) RETURNING *`,
      [categoryId]
    );

    const res = await request(app)
      .delete(`/api/products/${rows[0].product_id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product deleted');
  });

  it('should reject deletion by customer', async () => {
    const { rows } = await pool.query(
      `INSERT INTO products(product_name,price,stock_quantity,category_id)
       VALUES('Protected',50,1,$1) RETURNING *`,
      [categoryId]
    );

    const res = await request(app)
      .delete(`/api/products/${rows[0].product_id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });

  it('should return 404 for non-existent product', async () => {
    const res = await request(app)
      .delete('/api/products/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
