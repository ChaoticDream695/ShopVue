const { Pool } = require('pg');
require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';
const useSSL = process.env.DB_SSL === 'true';

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: isTest
    ? (process.env.TEST_DB_NAME || 'ecommerce_test_db')
    : (process.env.DB_NAME      || 'ecommerce_db'),
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'password',

  // Required for AWS RDS — uses SSL but skips cert verification
  // (for full verification, provide the RDS CA bundle instead)
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
