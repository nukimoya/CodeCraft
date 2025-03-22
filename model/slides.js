const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Slide = sequelize.define('Slide', {
  slide_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  slide_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file_url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  course_section_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'CourseSections',
      key: 'course_section_id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
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
  slide_name: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'Slides',
  timestamps: true,
});

module.exports = Slide;