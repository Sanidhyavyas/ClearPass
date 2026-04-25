const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

pool
  .connect()
  .then((client) => {
    console.log("Connected to PostgreSQL (Neon)");
    client.release();
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
  });

module.exports = pool;
