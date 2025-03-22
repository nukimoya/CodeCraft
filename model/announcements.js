const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Announcement = sequelize.define('Announcement', {
  announcement_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: sequelize.literal('CURRENT_TIME'),
  },
  tag: {
    type: DataTypes.ENUM('assignment', 'resource', 'general', 'important', 'reminder'),
    defaultValue: 'general',
  },
  files: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  links: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  classroom_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Classrooms',
      key: 'classroom_id',
    },
    allowNull: false,
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
}, {
  tableName: 'announcements',
  timestamps: true,
});

module.exports = Announcement;
