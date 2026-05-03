/**
 * seed.js — Populates the database with demo data.
 * Run:  node src/config/seed.js
 */
require('dotenv').config();
const pool = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {

  const client2 = await pool.connect();
  try {
    const { rows: check } = await client2.query('SELECT COUNT(*) FROM users_auth');
    if (parseInt(check[0].count) > 0) {
      console.log('Database already seeded — skipping.');
      return;
    }
  } finally { client2.release(); }


  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Seeding database...');

    // ── Users ──────────────────────────────────────────────
    const adminPass = await bcrypt.hash('admin123', 10);
    const custPass = await bcrypt.hash('customer123', 10);

    const { rows: [admin] } = await client.query(`
      INSERT INTO users_auth(username, password, role)
      VALUES('admin', $1, 'admin')
      ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password
      RETURNING uauth_id
    `, [adminPass]);

    const { rows: [cust1] } = await client.query(`
      INSERT INTO users_auth(username, password, role)
      VALUES('john_doe', $1, 'customer')
      ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password
      RETURNING uauth_id
    `, [custPass]);

    const { rows: [cust2] } = await client.query(`
      INSERT INTO users_auth(username, password, role)
      VALUES('jane_smith', $1, 'customer')
      ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password
      RETURNING uauth_id
    `, [custPass]);

    console.log(`  ✓ Users  →  admin (id:${admin.uauth_id}), john_doe (id:${cust1.uauth_id}), jane_smith (id:${cust2.uauth_id})`);

    // ── Customer profiles ──────────────────────────────────
    const { rows: [c1] } = await client.query(`
      INSERT INTO customers(firstname, lastname, email, phone_number, cuauth_id)
      VALUES('John','Doe','john@example.com','0600000001',$1)
      ON CONFLICT (email) DO UPDATE SET cuauth_id = EXCLUDED.cuauth_id
      RETURNING customer_id
    `, [cust1.uauth_id]);

    const { rows: [c2] } = await client.query(`
      INSERT INTO customers(firstname, lastname, email, phone_number, cuauth_id)
      VALUES('Jane','Smith','jane@example.com','0600000002',$1)
      ON CONFLICT (email) DO UPDATE SET cuauth_id = EXCLUDED.cuauth_id
      RETURNING customer_id
    `, [cust2.uauth_id]);

    console.log(`  ✓ Customers  →  John Doe (id:${c1.customer_id}), Jane Smith (id:${c2.customer_id})`);

    // ── Categories ─────────────────────────────────────────
    const cats = [
      ['Electronics', 'Phones, laptops, gadgets and more'],
      ['Clothing', 'Apparel for all occasions'],
      ['Books', 'Fiction, non-fiction, technical'],
      ['Home & Living', 'Furniture, decor, kitchen'],
      ['Sports', 'Equipment and activewear'],
    ];

    const catIds = {};
    for (const [name, desc] of cats) {
      const { rows: [cat] } = await client.query(`
        INSERT INTO product_categories(category_name, category_description)
        VALUES($1,$2)
        ON CONFLICT DO NOTHING
        RETURNING category_id
      `, [name, desc]);
      if (cat) catIds[name] = cat.category_id;
    }

    // Fill in any that already existed
    const { rows: existingCats } = await client.query('SELECT category_id, category_name FROM product_categories');
    for (const r of existingCats) catIds[r.category_name] = r.category_id;

    console.log('  ✓ Categories  →  Electronics, Clothing, Books, Home & Living, Sports');

    // ── Products ───────────────────────────────────────────
    const products = [
      ['iPhone 15 Pro', 2500000, 30, catIds['Electronics']],
      ['Samsung Galaxy S24', 750000, 25, catIds['Electronics']],
      ['MacBook Air M3', 1500000, 15, catIds['Electronics']],
      ['Sony WH-1000XM5', 250000, 40, catIds['Electronics']],
      ['Nike Air Max 270', 50000, 80, catIds['Sports']],
      ['Adidas Ultraboost', 45000, 60, catIds['Sports']],
      ['Yoga Mat Pro', 20000, 100, catIds['Sports']],
      ['Clean Code (book)', 30000, 50, catIds['Books']],
      ['Atomic Habits', 10000, 75, catIds['Books']],
      ['The Design of Everyday Things', 5000, 40, catIds['Books']],
      ['Linen Shirt (White)', 25000, 45, catIds['Clothing']],
      ['Slim Chinos', 30000, 35, catIds['Clothing']],
      ['Coffee Maker Deluxe', 80000, 20, catIds['Home & Living']],
      ['Ergonomic Desk Chair', 125000, 10, catIds['Home & Living']],
      ['Indoor Plant Set', 17000, 55, catIds['Home & Living']],
    ];

    const prodIds = [];
    for (const [name, price, qty, catId] of products) {
      const { rows: [p] } = await client.query(`
        INSERT INTO products(product_name, price, stock_quantity, category_id)
        VALUES($1,$2,$3,$4)
        RETURNING product_id
      `, [name, price, qty, catId]);
      prodIds.push(p.product_id);
    }

    console.log(`  ✓ Products  →  ${products.length} products created`);

    // ── Sample Orders ──────────────────────────────────────
    const { rows: [order1] } = await client.query(`
      INSERT INTO orders(total_amount, customer_id, order_date, status)
      VALUES(1549.98, $1, NOW() - INTERVAL '3 days', 'delivered')
      RETURNING order_id
    `, [c1.customer_id]);

    await client.query(`
      INSERT INTO order_items(order_id, product_id, quantity, price) VALUES
      ($1, $2, 1, 1199.99),
      ($1, $3, 1, 349.99)
    `, [order1.order_id, prodIds[0], prodIds[3]]);

    const { rows: [order2] } = await client.query(`
      INSERT INTO orders(total_amount, customer_id, order_date, status)
      VALUES(299.97, $1, NOW() - INTERVAL '1 day', 'confirmed')
      RETURNING order_id
    `, [c2.customer_id]);

    await client.query(`
      INSERT INTO order_items(order_id, product_id, quantity, price) VALUES
      ($1, $2, 1, 149.99),
      ($1, $3, 1, 49.99),
      ($1, $4, 2, 39.99)
    `, [order2.order_id, prodIds[4], prodIds[6], prodIds[7]]);

    console.log('  ✓ Orders  →  2 sample orders created');

    await client.query('COMMIT');
    console.log('\n Seed complete!\n');
    console.log('Demo credentials:');
    console.log('  Admin    →  username: admin      | password: admin123');
    console.log('  Customer →  username: john_doe   | password: customer123');
    console.log('  Customer →  username: jane_smith | password: customer123\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
