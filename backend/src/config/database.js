const { Pool } = require('pg');
require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: isTest
    ? (process.env.TEST_DB_NAME || 'ecommerce_test_db')
    : (process.env.DB_NAME || 'ecommerce_db'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
