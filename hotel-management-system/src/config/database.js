const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/hoteldb';

const pool = new Pool({
  connectionString,
  // ssl: { rejectUnauthorized: false }, // enable only for cloud DB with SSL
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
