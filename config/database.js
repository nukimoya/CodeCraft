require("dotenv").config(); // Load environment variables

const { Sequelize } = require("sequelize");

const databaseUrl = process.env.MASTER_DB;

// Check if DATABASE_URL exists
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not defined");
  // You might want to throw an error or provide a fallback
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT
  }
);

// Self-invoking function to test connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to the railway online database!');
  } catch (error) {
    console.error('Failed to connect:', error);
  }
})();

// Fix the module exports syntax
module.exports = sequelize;