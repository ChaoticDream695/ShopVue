'use strict';

/**
 * Generic body-field validator.
 * Usage:  validate(['username','password'])  →  middleware
 */
const validate = (requiredFields) => (req, res, next) => {
  const missing = requiredFields.filter(
    (field) => req.body[field] === undefined || req.body[field] === ''
  );
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missing.join(', ')}`
    });
  }
  next();
};

/**
 * Sanitise a string — strip leading/trailing whitespace.
 */
const sanitise = (req, _res, next) => {
  for (const key of Object.keys(req.body)) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  }
  next();
};

module.exports = { validate, sanitise };
