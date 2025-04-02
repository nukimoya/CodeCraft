require("dotenv").config(); // Load environment variables

const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to Railway!');
  } catch (error) {
    console.error('Failed to connect:', error);
  }
})();


module.exports = sequelize, { Sequelize };

