require("dotenv").config(); // Load environment variables

const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME, // Database name
  process.env.DB_USERNAME, // Username
  process.env.DB_PASSWORD, // Password
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false, // Optional: Disable query logging
  }
);

module.exports = sequelize, { Sequelize };

