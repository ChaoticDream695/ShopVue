const pool = require('../src/config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

/**
 * Create test tables and seed minimal data
 */
const setupTestDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users_auth(
      uauth_id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(150) NOT NULL,
      role VARCHAR(20) NOT NULL,
      created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS customers(
      customer_id SERIAL PRIMARY KEY,
      firstname VARCHAR(200) NOT NULL,
      lastname VARCHAR(200) NOT NULL,
      email VARCHAR(200) UNIQUE NOT NULL,
      phone_number VARCHAR(15) NOT NULL,
      cuauth_id INT NOT NULL,
      CONSTRAINT fk_users_auth_test FOREIGN KEY(cuauth_id)
        REFERENCES users_auth(uauth_id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS product_categories(
      category_id SERIAL PRIMARY KEY,
      category_name VARCHAR(100) NOT NULL,
      category_description VARCHAR(150) DEFAULT 'No description',
      created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products(
      product_id SERIAL PRIMARY KEY,
      product_name VARCHAR(100) NOT NULL,
      price NUMERIC(12,2) NOT NULL,
      stock_quantity INT NOT NULL DEFAULT 0,
      category_id INT NOT NULL,
      created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_product_categories_test FOREIGN KEY(category_id)
        REFERENCES product_categories(category_id)
    );
    CREATE TABLE IF NOT EXISTS orders(
      order_id SERIAL PRIMARY KEY,
      total_amount NUMERIC(12,2) NOT NULL,
      order_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      customer_id INT NOT NULL,
      status VARCHAR(30) DEFAULT 'pending',
      CONSTRAINT fk_customers_test FOREIGN KEY(customer_id)
        REFERENCES customers(customer_id)
    );
    CREATE TABLE IF NOT EXISTS order_items(
      order_id INT,
      product_id INT,
      quantity INT NOT NULL,
      price NUMERIC(12,2) NOT NULL,
      PRIMARY KEY(order_id, product_id)
    );
  `);

  // Add FK constraints only if not exist
  try {
    await pool.query(`ALTER TABLE order_items ADD CONSTRAINT fk_orders_test
      FOREIGN KEY(order_id) REFERENCES orders(order_id)`);
  } catch (_) { /* already exists */ }
  try {
    await pool.query(`ALTER TABLE order_items ADD CONSTRAINT fk_products_test
      FOREIGN KEY(product_id) REFERENCES products(product_id)`);
  } catch (_) { /* already exists */ }
};

const teardownTestDb = async () => {
  await pool.query(`
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS product_categories;
    DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS users_auth;
  `);
  await pool.end();
};

const clearTables = async () => {
  await pool.query('DELETE FROM order_items');
  await pool.query('DELETE FROM orders');
  await pool.query('DELETE FROM products');
  await pool.query('DELETE FROM product_categories');
  await pool.query('DELETE FROM customers');
  await pool.query('DELETE FROM users_auth');
  // Reset sequences
  await pool.query('ALTER SEQUENCE users_auth_uauth_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE customers_customer_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE product_categories_category_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE products_product_id_seq RESTART WITH 1');
  await pool.query('ALTER SEQUENCE orders_order_id_seq RESTART WITH 1');
};

const createAdminToken = async () => {
  const password = await bcrypt.hash('admin123', 10);
  const { rows } = await pool.query(
    `INSERT INTO users_auth(username, password, role) VALUES('testadmin','${password}','admin')
     ON CONFLICT (username) DO UPDATE SET password=EXCLUDED.password RETURNING *`
  );
  const user = rows[0];
  return jwt.sign(
    { uauth_id: user.uauth_id, username: user.username, role: user.role, customer_id: null },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const createCustomerToken = async () => {
  const password = await bcrypt.hash('customer123', 10);
  const { rows } = await pool.query(
    `INSERT INTO users_auth(username, password, role) VALUES('testcustomer','${password}','customer')
     ON CONFLICT (username) DO UPDATE SET password=EXCLUDED.password RETURNING *`
  );
  const user = rows[0];
  const { rows: cRows } = await pool.query(
    `INSERT INTO customers(firstname, lastname, email, phone_number, cuauth_id)
     VALUES('Test','User','testuser@example.com','1234567890',$1)
     ON CONFLICT (email) DO UPDATE SET cuauth_id=EXCLUDED.cuauth_id RETURNING *`,
    [user.uauth_id]
  );
  const customer = cRows[0];
  return {
    token: jwt.sign(
      { uauth_id: user.uauth_id, username: user.username, role: user.role, customer_id: customer.customer_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    ),
    customer_id: customer.customer_id
  };
};

module.exports = { setupTestDb, teardownTestDb, clearTables, createAdminToken, createCustomerToken };
