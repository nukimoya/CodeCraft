const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PastQuestion = sequelize.define('PastQuestion', {
  past_question_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  past_question_name: {
    type: DataTypes.STRING,
    allowNull: false, 
  },
  course_section_id: {
    type: DataTypes.UUID,
    references: {
      model: 'CourseSections', 
      key: 'course_section_id',
    },
    allowNull: false,
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  file_names: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
  },
  file_urls: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
  },
  classroom_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Classrooms', 
      key: 'classroom_id',
    },
    allowNull: false,
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
}, 
{
  tableName: 'PastQuestions',
  timestamps: true,
});

module.exports = PastQuestion;