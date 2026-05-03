process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, teardownTestDb, clearTables } = require('./helpers');

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTables();
});

describe('POST /api/auth/register', () => {
  it('should register an admin user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'admin1', password: 'pass123', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.username).toBe('admin1');
  });

  it('should register a customer with profile info', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'customer1',
        password: 'pass123',
        role: 'customer',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        phone_number: '0123456789'
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('customer');
  });

  it('should reject invalid role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user1', password: 'pass', role: 'superuser' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role/i);
  });

  it('should reject customer registration without profile info', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'customer2', password: 'pass', role: 'customer' });

    expect(res.status).toBe(400);
  });

  it('should reject duplicate username', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'duplicate', password: 'pass', role: 'admin' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'duplicate', password: 'pass2', role: 'admin' });

    expect(res.status).toBe(409);
  });

  it('should reject missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'nopass' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'loginuser', password: 'secret123', role: 'admin' });
  });

  it('should login and return a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('loginuser');
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('should reject non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ghost', password: 'pass' });

    expect(res.status).toBe(401);
  });

  it('should reject missing credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'meuser', password: 'pass123', role: 'admin' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'meuser', password: 'pass123' });

    token = loginRes.body.token;
  });

  it('should return authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('meuser');
    expect(res.body.password).toBeUndefined();
  });

  it('should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should reject invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(403);
  });
});
