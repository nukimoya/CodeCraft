const { Sequelize } = require("sequelize");


require("dotenv").config(); // Load environment variables

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT  || 16042,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
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