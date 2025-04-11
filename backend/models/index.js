const { Sequelize } = require('sequelize');
require('dotenv').config(); // loads .env

// create sequelize instance with environment variables
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: false, // turn off SQL logging
  }
);

// test connection
sequelize
  .authenticate()
  .then(() => console.log('✅ Connected to MySQL database!'))
  .catch((err) => console.error('❌ Unable to connect to DB:', err));

module.exports = { sequelize };
