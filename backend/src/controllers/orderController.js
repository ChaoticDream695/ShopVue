const pool = require('../config/database');

// POST /orders — customer only
const createOrder = async (req, res, next) => {
  const { items } = req.body; // [{product_id, quantity}]
  const customer_id = req.user.customer_id;

  if (!customer_id) {
    return res.status(400).json({ error: 'No customer profile linked to this account' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const resolvedItems = [];

    for (const item of items) {
      const { rows } = await client.query(
        'SELECT * FROM products WHERE product_id = $1 FOR UPDATE',
        [item.product_id]
      );
      const product = rows[0];
      if (!product) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Product ${item.product_id} not found` });
      }
      if (product.stock_quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Insufficient stock for product ${product.product_name}` });
      }
      total += parseFloat(product.price) * item.quantity;
      resolvedItems.push({ ...item, price: product.price });

      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2',
        [item.quantity, item.product_id]
      );
    }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders(total_amount, customer_id, order_date)
       VALUES($1,$2,NOW()) RETURNING *`,
      [total, customer_id]
    );
    const order = orderRows[0];

    for (const item of resolvedItems) {
      await client.query(
        'INSERT INTO order_items(order_id, product_id, quantity, price) VALUES($1,$2,$3,$4)',
        [order.order_id, item.product_id, item.quantity, item.price]
      );
    }

    await client.query('COMMIT');

    const { rows: fullOrder } = await client.query(
      `SELECT o.*, json_agg(
         json_build_object('product_id', oi.product_id, 'quantity', oi.quantity, 'price', oi.price, 'product_name', p.product_name)
       ) AS items
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       JOIN products p ON oi.product_id = p.product_id
       WHERE o.order_id = $1
       GROUP BY o.order_id`,
      [order.order_id]
    );

    res.status(201).json(fullOrder[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /orders — customer gets own orders, admin gets all
const getOrders = async (req, res, next) => {
  try {
    let query, params;

    if (req.user.role === 'admin') {
      query = `
        SELECT o.*, c.firstname, c.lastname, c.email,
          json_agg(json_build_object(
            'product_id', oi.product_id,
            'product_name', p.product_name,
            'quantity', oi.quantity,
            'price', oi.price
          )) AS items
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        GROUP BY o.order_id, c.firstname, c.lastname, c.email
        ORDER BY o.order_date DESC
      `;
      params = [];
    } else {
      query = `
        SELECT o.*,
          json_agg(json_build_object(
            'product_id', oi.product_id,
            'product_name', p.product_name,
            'quantity', oi.quantity,
            'price', oi.price
          )) AS items
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        WHERE o.customer_id = $1
        GROUP BY o.order_id
        ORDER BY o.order_date DESC
      `;
      params = [req.user.customer_id];
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /orders/:id
const getOrderById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*,
         json_agg(json_build_object(
           'product_id', oi.product_id,
           'product_name', p.product_name,
           'quantity', oi.quantity,
           'price', oi.price
         )) AS items
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       JOIN products p ON oi.product_id = p.product_id
       WHERE o.order_id = $1
       GROUP BY o.order_id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });

    // Customers can only view their own orders
    if (req.user.role === 'customer' && rows[0].customer_id !== req.user.customer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /orders/:id/status — admin only
const updateOrderStatus = async (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE orders SET status=$1 WHERE order_id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, getOrders, getOrderById, updateOrderStatus };
