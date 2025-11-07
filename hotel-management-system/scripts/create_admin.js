const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/hoteldb';
const pool = new Pool({ connectionString });

async function createAdmin(email, password, full_name = 'Admin') {
  const hash = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `INSERT INTO admins (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id`,
      [email, hash, full_name]
    );
    await client.query('COMMIT');
    console.log('Admin created with id', res.rows[0].id);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating admin', err);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@hotel.com';
  const password = process.env.INITIAL_ADMIN_PASSWORD || 'password';
  createAdmin(email, password).then(() => process.exit(0));
}

module.exports = createAdmin;
