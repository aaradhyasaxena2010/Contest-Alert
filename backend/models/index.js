const Sequelize = require('sequelize');
const sequelize = new Sequelize('contest_alert', 'root', 'Dinku2010$', {
  host: 'localhost',
  dialect: 'mysql',
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import your models here
db.User = require('./User')(sequelize, Sequelize.DataTypes);  // 👈 this must match!

module.exports = db;
