-- Ejecutar: psql -U postgres -d hoteldb -f db/init.sql

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id),
  category VARCHAR(50),
  name VARCHAR(255),
  description TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  cost NUMERIC(10,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  track_inventory BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  amount NUMERIC(12,2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(50),
  transaction_reference TEXT
);

-- Añade más tablas (bookings, rooms, cash_registers, cashiers, blacklist, etc.) según necesites.
