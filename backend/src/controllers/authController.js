const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const register = async (req, res, next) => {
  const { username, password, role, firstname, lastname, email, phone_number } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password and role are required' });
  }
  if (!['admin', 'customer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or customer' });
  }
  if (role === 'customer' && (!firstname || !lastname || !email || !phone_number)) {
    return res.status(400).json({ error: 'Customer requires firstname, lastname, email, phone_number' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hashed = await bcrypt.hash(password, 10);

    const { rows } = await client.query(
      'INSERT INTO users_auth(username, password, role) VALUES($1,$2,$3) RETURNING uauth_id, username, role, created_on',
      [username, hashed, role]
    );
    const user = rows[0];

    if (role === 'customer') {
      await client.query(
        'INSERT INTO customers(firstname, lastname, email, phone_number, cuauth_id) VALUES($1,$2,$3,$4,$5)',
        [firstname, lastname, email, phone_number, user.uauth_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

const login = async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users_auth WHERE username = $1',
      [username]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    let customerInfo = null;
    if (user.role === 'customer') {
      const { rows: cRows } = await pool.query(
        'SELECT * FROM customers WHERE cuauth_id = $1',
        [user.uauth_id]
      );
      customerInfo = cRows[0] || null;
    }

    const payload = {
      uauth_id: user.uauth_id,
      username: user.username,
      role: user.role,
      customer_id: customerInfo ? customerInfo.customer_id : null
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'default_secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.json({ token, user: payload });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT uauth_id, username, role, created_on FROM users_auth WHERE uauth_id = $1',
      [req.user.uauth_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    let profile = rows[0];
    if (profile.role === 'customer') {
      const { rows: cRows } = await pool.query(
        'SELECT * FROM customers WHERE cuauth_id = $1',
        [profile.uauth_id]
      );
      profile = { ...profile, customer: cRows[0] || null };
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
