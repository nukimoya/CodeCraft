const User = require('../model/user');
const Classroom = require('../model/classroom');
const ClassroomStudent = require('../model/classroomStudent');
const CourseSection = require('../model/courseSection');
const Slide = require('../model/slides');

function setupAssociations() {
  // Many-to-Many: User <-> Classroom (via ClassroomStudent)
  User.belongsToMany(Classroom, { 
    through: ClassroomStudent, 
    foreignKey: 'student_id', 
    otherKey: 'classroom_id',
    as: 'classrooms' 
  });
  Classroom.belongsToMany(User, { 
    through: ClassroomStudent, 
    foreignKey: 'classroom_id', 
    otherKey: 'student_id',
    as: 'students'
  });

  // Defining ClassroomStudent associations for clarity
  ClassroomStudent.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
  ClassroomStudent.belongsTo(Classroom, { foreignKey: 'classroom_id', as: 'classroom' });

  // One-to-Many: Course Rep managing multiple Classrooms
  User.hasMany(Classroom, { foreignKey: 'course_rep_id', as: 'managed_classrooms' });
  Classroom.belongsTo(User, { foreignKey: 'course_rep_id', as: 'course_rep' });

  // One-to-Many: Classroom containing multiple Course Sections
  Classroom.hasMany(CourseSection, { as: 'courseSections', foreignKey: 'classroom_id' });
  CourseSection.belongsTo(Classroom, { foreignKey: 'classroom_id', as: 'classroom' });

  // One-to-Many: Classroom and Slides
  Classroom.hasMany(Slide, { as: 'slides', foreignKey: 'classroom_id' });
  Slide.belongsTo(Classroom, { foreignKey: 'classroom_id', as: 'classroom' });

  // One-to-Many: CourseSection and Slides
  CourseSection.hasMany(Slide, { foreignKey: 'course_section_id', as: 'slides' });
  Slide.belongsTo(CourseSection, { foreignKey: 'course_section_id', as: 'courseSection' });
}

module.exports = setupAssociations;
