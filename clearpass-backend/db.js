const { Pool } = require("pg");
const logger = require("./utils/logger");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

pool
  .connect()
  .then((client) => {
    logger.info("Connected to PostgreSQL (Neon)");
    client.release();
  })
  .catch((err) => {
    logger.error("Database connection failed", { message: err.message });
  });

module.exports = pool;
