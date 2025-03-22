'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns exist before adding them
    const table = await queryInterface.describeTable('CourseSections');
    
    const columnsToAdd = [];

    if (!table.course_description) {
      columnsToAdd.push(
        queryInterface.addColumn('CourseSections', 'course_description', {
          type: Sequelize.TEXT,
          allowNull: true
        })
      );
    }

    if (!table.course_difficulty) {
      columnsToAdd.push(
        queryInterface.addColumn('CourseSections', 'course_difficulty', {
          type: Sequelize.ENUM('Beginner', 'Intermediate', 'Advanced'),
          allowNull: true
        })
      );
    }

    return Promise.all(columnsToAdd);
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('CourseSections');
    
    const columnsToRemove = [];

    if (table.course_description) {
      columnsToRemove.push(
        queryInterface.removeColumn('CourseSections', 'course_description')
      );
    }

    if (table.course_difficulty) {
      columnsToRemove.push(
        queryInterface.removeColumn('CourseSections', 'course_difficulty')
      );
      columnsToRemove.push(
        queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_CourseSections_course_difficulty";')
      );
    }

    return Promise.all(columnsToRemove);
  }
}; 