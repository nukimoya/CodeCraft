'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Classrooms', 'level');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Classrooms', 'level', {
      type: Sequelize.ENUM("Beginner", "Intermediate", "Advanced"),
      defaultValue: "Beginner",
      allowNull: false,
    });
  }
}; 