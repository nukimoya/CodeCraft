const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClassroomStudent = sequelize.define('ClassroomStudent', {
  student_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users', 
      key: 'user_id'
    },
    allowNull: false,
  },
  classroom_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Classrooms', 
      key: 'classroom_id'
    },
    allowNull: false,
  }
}, {
  tableName: 'ClassroomStudents', 
});

module.exports = ClassroomStudent;
