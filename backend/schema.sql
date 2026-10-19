-- Minimal users table used by Registration, Login and Forgot Password.
-- (The original project's tables already exist in Neon; this is only for a fresh database.)
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL
);
