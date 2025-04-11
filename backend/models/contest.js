const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Contest = sequelize.define('Contest', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  }
});

module.exports = Contest;
