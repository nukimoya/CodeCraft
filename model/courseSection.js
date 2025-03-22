const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CourseSection = sequelize.define('CourseSection', {
  course_section_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,  
    primaryKey: true,
  },
  course_title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  course_code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  course_description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  course_difficulty: {
    type: DataTypes.ENUM('Beginner', 'Intermediate', 'Advanced'),
    allowNull: true,
  },
  classroom_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Classrooms', 
      key: 'classroom_id',
    },
    allowNull: false,
  }
}, {
  tableName: 'CourseSections', 
  timestamps: true, 
});

module.exports = CourseSection;
