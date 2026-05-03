'use strict';

const logger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const color =
      res.statusCode >= 500 ? '\x1b[31m'   // red
      : res.statusCode >= 400 ? '\x1b[33m' // yellow
      : res.statusCode >= 200 ? '\x1b[32m' // green
      : '\x1b[36m';                         // cyan
    console.log(
      `${color}${req.method}\x1b[0m ${req.originalUrl} ${res.statusCode} \x1b[2m${ms}ms\x1b[0m`
    );
  });
  next();
};

module.exports = logger;
