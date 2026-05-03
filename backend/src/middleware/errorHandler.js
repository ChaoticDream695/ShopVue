const errorHandler = (err, req, res, _next) => {
  console.error(err.stack);

  if (err.code === '23505') { // Postgres unique violation
    return res.status(409).json({ error: 'Resource already exists' });
  }
  if (err.code === '23503') { // Postgres foreign key violation
    return res.status(400).json({ error: 'Referenced resource not found' });
  }
  if (err.code === '23502') { // Postgres not-null violation
    return res.status(400).json({ error: 'Required field missing' });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
};

module.exports = errorHandler;
