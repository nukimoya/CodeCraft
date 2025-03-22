const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SlideQuestionAttempt = sequelize.define('SlideQuestionAttempt', {
  attempt_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'user_id'
    },
    allowNull: false
  },
  slide_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Slides',
      key: 'slide_id'
    },
    allowNull: false
  },
  classroom_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Classrooms',
      key: 'classroom_id'
    },
    allowNull: false
  },
  course_section_id: {
    type: DataTypes.UUID,
    references: {
      model: 'CourseSections',
      key: 'course_section_id'
    },
    allowNull: false
  },
  questions_attempted: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  completed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Class methods for progress tracking
SlideQuestionAttempt.getLastAttempts = async function(userId, slideId, limit = 5) {
  return await this.findAll({
    where: {
      user_id: userId,
      slide_id: slideId
    },
    order: [['completed_at', 'DESC']],
    limit: limit
  });
};

// Get performance analysis
SlideQuestionAttempt.getPerformanceAnalysis = async function(userId, slideId) {
  const attempts = await this.getLastAttempts(userId, slideId);
  
  if (attempts.length === 0) {
    return {
      attempts: [],
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      improvementNeeded: true,
      message: "No attempts recorded yet. Try answering the slide questions to track your progress."
    };
  }
  
  const scores = attempts.map(attempt => attempt.score);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const latestScore = scores[0];
  
  return {
    attempts: attempts,
    averageScore: averageScore,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    improvementNeeded: latestScore < 60,
    message: latestScore < 60
      ? "Your latest score is below 60%. Review the slide content before trying again."
      : latestScore >= 80
        ? "Great job! You're showing strong understanding of this slide's content."
        : "You're making progress. Continue reviewing the challenging concepts to improve your score."
  };
};

// Additional method to track progress across multiple slides
SlideQuestionAttempt.getProgressAcrossSlides = async function(userId, slideIds) {
  const results = {};
  
  for (const slideId of slideIds) {
    const latestAttempt = await this.findOne({
      where: {
        user_id: userId,
        slide_id: slideId
      },
      order: [['completed_at', 'DESC']]
    });
    
    results[slideId] = latestAttempt 
      ? { 
          completed: true, 
          score: latestAttempt.score,
          passed: latestAttempt.score >= 60,
          completedAt: latestAttempt.completed_at
        }
      : { 
          completed: false, 
          score: null,
          passed: false,
          completedAt: null
        };
  }
  
  return results;
};

module.exports = SlideQuestionAttempt;