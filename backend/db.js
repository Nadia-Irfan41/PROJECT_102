require("dotenv").config();
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Create backend/.env with your PostgreSQL connection string (see .env.example).");
  process.exit(1);
}

// Drop sslmode / channel_binding from the URL so the explicit ssl option below is used by node-postgres
const url = new URL(process.env.DATABASE_URL);
const sslMode = url.searchParams.get("sslmode");
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");

// SSL is used for hosted databases (Neon etc.: sslmode=require) or when DB_SSL=true.
// A local PostgreSQL (localhost, no sslmode) connects without SSL.
const useSsl = process.env.DB_SSL === "true" || (!!sslMode && sslMode !== "disable");

const pool = new Pool({
  connectionString: url.toString(),
  ssl: useSsl ? { rejectUnauthorized: true } : false,
});

pool.on("error", (err) => console.error("Unexpected database error:", err.message));

// Only checks the connection. The users table must already exist (see backend/schema.sql).
pool.init = async function () {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected successfully!");
  } catch (err) {
    console.error("Database error:", err.message);
    console.error("-> Check DATABASE_URL in backend/.env and that PostgreSQL is running.");
  }
};

module.exports = pool;
