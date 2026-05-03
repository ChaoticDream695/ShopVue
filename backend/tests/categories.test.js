process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const { setupTestDb, teardownTestDb, clearTables, createAdminToken, createCustomerToken } = require('./helpers');

let adminToken;
let customerToken;

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
});

describe('GET /api/categories', () => {
  it('should return all categories', async () => {
    await pool.query(`INSERT INTO product_categories(category_name) VALUES('Books'),('Games')`);
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('should return empty array when no categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/categories', () => {
  it('should create category as admin', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_name: 'Furniture', category_description: 'Home furniture' });

    expect(res.status).toBe(201);
    expect(res.body.category_name).toBe('Furniture');
  });

  it('should reject creation by customer', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ category_name: 'Test' });

    expect(res.status).toBe(403);
  });

  it('should reject missing category_name', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_description: 'No name given' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/categories/:id', () => {
  it('should update category as admin', async () => {
    const { rows } = await pool.query(
      `INSERT INTO product_categories(category_name) VALUES('Old') RETURNING *`
    );
    const res = await request(app)
      .put(`/api/categories/${rows[0].category_id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.category_name).toBe('Updated');
  });

  it('should return 404 for non-existent category', async () => {
    const res = await request(app)
      .put('/api/categories/99999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_name: 'X' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/categories/:id', () => {
  it('should delete category as admin', async () => {
    const { rows } = await pool.query(
      `INSERT INTO product_categories(category_name) VALUES('ToDelete') RETURNING *`
    );
    const res = await request(app)
      .delete(`/api/categories/${rows[0].category_id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Category deleted');
  });

  it('should return 404 for non-existent category', async () => {
    const res = await request(app)
      .delete('/api/categories/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
