const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Classroom = sequelize.define('Classroom', {
  classroom_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  join_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  is_active: {  // Added is_active field
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['admin_id', 'name'], 
    },
  ],
});

module.exports = Classroom;
