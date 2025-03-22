const express = require("express");
const User = require("../model/user");
const Classroom = require("../model/classroom");
const ClassroomStudent = require("../model/classroomStudent");
const CourseSection = require("../model/courseSection");
const Slide = require("../model/slides");
const PastQuestion = require("../model/pastQuestions");
const Announcement = require("../model/announcements");
const Question = require("../model/question");
const SlideQuestionAttempt = require("../model/slideQuestionAttempt");
const XpTransaction = require("../model/xpTransaction");
const { checkAndAwardBadges } = require('../utils/badgeUtils');
const { Op } = require('sequelize');
const sequelize = require("sequelize");

const profile = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { user_id: req.user.id },
      attributes: [
        "user_id",
        "Username",
        "Email",
        "Level",
        "xp",
        "current_streak",
        "highest_streak",
        "total_active_days",
        "Role",
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "Learner profile not found" });
    }

    res.status(200).json({
      message: "Learner profile retrieved successfully",
      user,
    });
  } catch (error) {
    console.error("Error fetching learner profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const update = async (req, res) => {
  try {
    const { username } = req.body;

    const user = await User.findOne({ where: { user_id: req.user.id } });
    console.log("User found in DB:", user);

    await User.update(
      { Username: username },
      { where: { user_id: req.user.id, Role: "Learner" } } // ✅ Fix role check
    );

    res.status(200).json({
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating learner profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const availableClassrooms = async (req, res) => {
  try {
    const classrooms = await Classroom.findAll({
      attributes: ["classroom_id", "name", "join_code", "is_active"],
      where: { is_active: true },
    });

    console.log("Fetched classrooms:", classrooms);

    if (!classrooms || classrooms.length === 0) {
      return res.status(404).json({ error: "No classrooms found" });
    }

    res.status(200).json({ classrooms });
  } catch (error) {
    console.error("Error fetching available classrooms:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const join = async (req, res) => {
  try {
    const classroomId = req.params.classroomId;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!classroomId || !uuidRegex.test(classroomId)) {
      return res.status(400).json({ error: 'Invalid classroom ID format' });
    }
    
    const classroom = await Classroom.findOne({ 
      where: { 
        classroom_id: classroomId,
        is_active: true
      } 
    });

    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found or inactive' });
    }

    // Check if already enrolled
    const isStudentInClassroom = await ClassroomStudent.findOne({
      where: { 
        student_id: req.user.id,
        classroom_id: classroomId 
      },
    });

    if (isStudentInClassroom) {
      return res.status(400).json({ 
        error: "You are already enrolled in this classroom" 
      });
    }

    // Enroll the student
    const enrollment = await ClassroomStudent.create({
      student_id: req.user.id,
      classroom_id: classroomId,
      joined_at: new Date()
    });

    res.status(200).json({ 
      message: "Successfully enrolled in classroom",
      classroom: {
        id: classroom.classroom_id,
        name: classroom.name
      }
    });
  } catch (error) {
    console.error("Error joining classroom:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message
    });
  }
};

const classrooms = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { user_id: req.user.id },
      include: [{
        model: Classroom,
        as: 'classrooms',
        through: { attributes: [] },
        include: [{
          model: CourseSection,
          as: 'courseSections',
          attributes: ['course_section_id', 'course_title', 'course_code']
        }],
        attributes: [
          'classroom_id',
          'name',
        ]
      }]
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.status(200).json({
      message: 'Classrooms retrieved successfully',
      classrooms: user.classrooms
    });
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const enrolled = async (req, res) => {
  try {
    const { classroomId } = req.params; // ✅ Extract classroomId from URL

    if (!classroomId) {
      return res.status(400).json({ error: "Classroom ID is required" });
    }

    const classroomStudent = await ClassroomStudent.findOne({
      where: {
        student_id: req.user.id,
        classroom_id: classroomId
      }
    });

    if (!classroomStudent) {
      return res.status(404).json({
        error: "Classroom not found or you do not have permission to access it"
      });
    }

    res.status(200).json({ 
      message: "You are enrolled in this classroom",
      classroom: classroomStudent
     });
  } catch (error) {
    console.error("Error fetching enrollment status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const sections = async (req, res) => {
  try {
    const studentClassroom = await ClassroomStudent.findOne({
      where: { 
        student_id: req.user.id, 
        classroom_id: req.params.classroomId 
      }
    });

    if (!studentClassroom) {
      return res.status(404).json({ error: 'You are not enrolled in this classroom' });
    }

    const sections = await CourseSection.findAll({
      where: { classroom_id: req.params.classroomId }
    });

    res.status(200).json({
      message: 'Sections retrieved successfully',
      sections
    });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const slides = async (req, res) => {
  try {
    const studentClassroom = await ClassroomStudent.findOne({
      where: { 
        student_id: req.user.id, 
        classroom_id: req.params.classroomId 
      }
    });

    if (!studentClassroom) {
      return res.status(404).json({ error: 'You are not enrolled in this classroom' });
    }

    const slides = await Slide.findAll({
      where: { 
        classroom_id: req.params.classroomId,
        course_section_id: req.params.sectionId
      }
    });

    res.status(200).json({
      message: 'Slides retrieved successfully',
      slides
    });
  } catch (error) {
    console.error('Error fetching slides:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const pastQuestions = async (req, res) => {
  try {
    const studentClassroom = await ClassroomStudent.findOne({
      where: { 
        student_id: req.user.id, 
        classroom_id: req.params.classroomId 
      }
    });

    if (!studentClassroom) {
      return res.status(404).json({ error: 'You are not enrolled in this classroom' });
    }

    const pastQuestions = await PastQuestion.findAll({
      where: { 
        classroom_id: req.params.classroomId,
        course_section_id: req.params.sectionId
      }
    });

    res.status(200).json({
      message: 'Past questions retrieved successfully',
      pastQuestions
    });
  } catch (error) {
    console.error('Error fetching past questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const announcements = async (req, res) => {
  try {
    const studentClassroom = await ClassroomStudent.findOne({
      where: { 
        student_id: req.user.id, 
        classroom_id: req.params.classroomId 
      }
    });

    if (!studentClassroom) {
      return res.status(404).json({ error: 'You are not enrolled in this classroom' });
    }

    const announcements = await Announcement.findAll({
      where: { classroom_id: req.params.classroomId },
      order: [['date', 'DESC']]
    });

    res.status(200).json({
      message: 'Announcements retrieved successfully',
      announcements
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Implement fetchLeaderboard directly in learnerController
const fetchLeaderboard = async (classroomId) => {
  try {
    const students = await ClassroomStudent.findAll({
      where: { classroom_id: classroomId },
      include: [{
        model: User,
        as: 'student', 
        attributes: [
          'user_id',
          'Username',  // Changed from 'username' to 'Username'
          'Level',     // Changed from 'level' to 'Level'
          'current_streak',
          'highest_streak',
          'total_active_days',
          'xp'
        ],
        where: { Role: 'Learner' }
      }],
    });

    // Map the data with correct property references matching your column names
    const leaderboardData = students
      .map(student => ({
        student_id: student.student.user_id,
        name: student.student.Username || `Student ${student.student.user_id}`, // Changed to Username
        current_streak: student.student.current_streak || 0,
        highest_streak: student.student.highest_streak || 0,
        total_active_days: student.student.total_active_days || 0,
        xp: student.student.xp || 0  // Changed to get xp from student object
      }))
      .sort((a, b) => {
        if (b.highest_streak !== a.highest_streak) return b.highest_streak - a.highest_streak;
        if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak;
        return b.total_active_days - a.total_active_days;
      });

    return leaderboardData;
  } catch (error) {
    console.error('Error in fetchLeaderboard:', error.message);
    throw error;
  }
};

const get_leaderboard = async (req, res) => {
    const { classroomId } = req.params;

    try {
        // Check if the user is enrolled in this classroom
        const isEnrolled = await ClassroomStudent.findOne({
            where: {
                classroom_id: classroomId,
                student_id: req.user.id
            }
        });
        console.log("isEnrolled", isEnrolled);

        if (!isEnrolled) {
            return res.status(403).json({ 
                error: 'You are not enrolled in this classroom' 
            });
        }

        // Fetch leaderboard data using our local implementation
        const leaderboard = await fetchLeaderboard(classroomId);

        // Add ranking to the leaderboard data
        const rankedLeaderboard = leaderboard.map((entry, index) => ({
            rank: index + 1,
            ...entry
        }));

        // Find the current user's position in the leaderboard
        const userPosition = rankedLeaderboard.findIndex(entry => 
            entry.student_id === req.user.id
        );

        res.status(200).json({
            message: 'Leaderboard fetched successfully',
            leaderboard: rankedLeaderboard,
            userStats: userPosition !== -1 ? {
                rank: rankedLeaderboard[userPosition].rank,
                xp: rankedLeaderboard[userPosition].xp,
                position: userPosition + 1,
                totalParticipants: rankedLeaderboard.length
            } : null
        });

    } catch (error) {
        console.error('Error Fetching Leaderboard:', error);
        res.status(500).json({ 
            error: 'An error occurred while fetching the leaderboard',
            details: error.message 
        });
    }
};

const test = async (req, res) => {
  try {
    const { classroomId, sectionId, slideId } = req.params;
    
    // Get all questions for the slide - including pending_review for testing
    const allQuestions = await Question.findAll({
      where: {
        slide_id: slideId,
        course_section_id: sectionId,
        classroom_id: classroomId,
        status: {
          [Op.in]: ['approved', 'pending_review'] // Accept both statuses
        }
      }
    });

    console.log('Questions found:', {
      total: allQuestions.length,
      byStatus: allQuestions.reduce((acc, q) => {
        acc[q.status] = (acc[q.status] || 0) + 1;
        return acc;
      }, {})
    });

    if (allQuestions.length === 0) {
      return res.status(200).json({
        message: 'No questions available for this slide',
        debug: {
          queryParams: {
            slide_id: slideId,
            course_section_id: sectionId,
            classroom_id: classroomId
          }
        }
      });
    }
   // Backend: Shuffling logic (already correct)
const shuffledQuestions = allQuestions.map(q => {
const shuffledOptions = q.options
  .map((value, originalIndex) => ({ 
    value, 
    originalIndex,
    sort: Math.random() 
  }))
  .sort((a, b) => a.sort - b.sort);

const optionMapping = shuffledOptions.map(opt => opt.originalIndex);

return {
  question_id: q.question_id,
  question_text: q.question_text,
  options: shuffledOptions.map(opt => opt.value),
  correct_answer: q.correct_answer,
  option_mapping: optionMapping // Send this to the frontend
};
})
    .sort(() => 0.5 - Math.random())
    .slice(0, 25);

    res.status(200).json({
      message: 'Test questions retrieved successfully',
      questions: shuffledQuestions,
      debug: {
        totalQuestions: allQuestions.length,
        returnedQuestions: shuffledQuestions.length
      }
    });
  } catch (error) {
    console.error('Error fetching test questions:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      debug: {
        message: error.message
      }
    });
  }
}

const submit_test = async (req, res) => {
  try {
    const { classroomId, sectionId, slideId } = req.params;
    const { userAnswers } = req.body;
    const userId = req.user.id;

    // Validate userAnswers
    if (!Array.isArray(userAnswers) || userAnswers.length === 0) {
      return res.status(400).json({ error: 'Invalid user answers format' });
    }

    // Verify classroom membership for students
    if (req.user.role === 'student') {
      const classroomStudent = await ClassroomStudent.findOne({
        where: { 
          student_id: userId, 
          classroom_id: classroomId 
        }
      });

      if (!classroomStudent) {
        return res.status(403).json({ error: 'Not enrolled in this classroom' });
      }
    }

    // Fetch the full questions to verify answers
    const questions = await Question.findAll({
      where: {
        slide_id: slideId,
        course_section_id: sectionId,
        classroom_id: classroomId,
        question_id: userAnswers.map(a => a.question_id)
      }
    });

    if (questions.length === 0) {
      return res.status(404).json({ error: 'No questions found' });
    }

    // Scoring logic
    const scoredAnswers = userAnswers.map(userAnswer => {
      const question = questions.find(q => q.question_id === userAnswer.question_id);

      if (!question) {
        console.error(`Question not found for ID: ${userAnswer.question_id}`);
        return null;
      }

      // The selected_option is already the original index
      const originalOptionIndex = userAnswer.selected_option;

      // Validate that both the answer and correct_answer exist
      const isCorrect = question.correct_answer !== undefined && 
                       originalOptionIndex !== undefined && 
                       question.correct_answer === originalOptionIndex;

      return {
        question_id: userAnswer.question_id,
        question_text: question.question_text,
        user_selected_option: originalOptionIndex, // Original index
        correct_answer: question.correct_answer,
        correct_option: question.options[question.correct_answer],
        is_correct: isCorrect,
        options: question.options
      };
    }).filter(answer => answer !== null);

    if (scoredAnswers.length === 0) {
      return res.status(400).json({ error: 'No valid answers could be processed' });
    }

    const score = (scoredAnswers.filter(a => a.is_correct).length / scoredAnswers.length) * 100;

    // Record the attempt
    await SlideQuestionAttempt.create({
      user_id: userId,
      slide_id: slideId,
      classroom_id: classroomId,
      course_section_id: sectionId,
      questions_attempted: scoredAnswers,
      score
    });

    // Get performance analysis including past attempts
    const performanceAnalysis = await SlideQuestionAttempt.getPerformanceAnalysis(userId, slideId);

    // Prepare personalized feedback based on performance
    let feedbackMessage = performanceAnalysis.message;
    
    // Add more detailed feedback for improvement if needed
    if (performanceAnalysis.improvementNeeded) {
      // Identify weak areas
      const weakTopics = scoredAnswers
        .filter(a => !a.is_correct)
        .map(a => a.question_text)
        .slice(0, 3); // Get up to 3 topics to focus on
        
      feedbackMessage += " Focus on these areas: " + 
        (weakTopics.length > 0 ? weakTopics.join(", ") : "Review all topics in this slide");
    }

    res.status(200).json({
      message: 'Test submitted successfully',
      currentScore: score,
      performanceHistory: {
        attempts: performanceAnalysis.attempts.length,
        averageScore: performanceAnalysis.averageScore.toFixed(1),
        highestScore: performanceAnalysis.highestScore,
        recentScores: performanceAnalysis.attempts.map(a => ({
          score: a.score,
          date: a.completed_at
        })).slice(0, 5)
      },
      feedback: feedbackMessage,
      scoredAnswers
    });
  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({ 
      error: 'Internal server error',
    });
  }
}

// Helper function to calculate level based on XP
const calculateLevel = (xp) => {
  if (xp >= 5000) return "Advanced";
  if (xp >= 1000) return "Intermediate";
  return "Beginner";
};

// XP update function
const xp_update = async (req, res) => {
  const { amount, reason, activity_type } = req.body;
  const userId = req.user.id;
  
  try {
    // Import the sequelize instance correctly
    const sequelize  = require('../config/database'); // Ensure this path is correct
    
    // Verify sequelize is properly initialized
    if (!sequelize || typeof sequelize.transaction !== 'function') {
      throw new Error('Sequelize instance is not properly initialized');
    }
    
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Find the user first
      const user = await User.findByPk(userId, { transaction });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Calculate new XP
      const newXp = user.xp + amount;
      
      // Update user XP
      await user.update({ 
        xp: newXp 
      }, { transaction });
      
      // Calculate level
      const oldLevel = calculateLevel(user.xp);
      const newLevel = calculateLevel(newXp);
      const levelUp = newLevel !== oldLevel;
      
      // If level changed, update it
      if (levelUp) {
        await user.update({ 
          Level: newLevel 
        }, { transaction });
      }
      
      // Create XP transaction record
      await XpTransaction.create({
        user_id: userId,
        amount,
        reason,
        activity_type,
        timestamp: new Date()
      }, { transaction });
      
      // Check for badge unlocks if needed
      let newBadges = [];
      
      // Commit the transaction
      await transaction.commit();
      
      res.status(200).json({
        success: true,
        currentXp: newXp,
        level: newLevel,
        levelUp,
        newBadges
      });
    } catch (error) {
      // Rollback transaction in case of error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating XP:', error);
    res.status(500).json({ 
      error: 'Failed to update XP',
      message: error.message 
    });
  }
};

const xp_get = async (req, res) => {
  const userId = req.user.id;
  const xp = await User.findByPk(userId, { attributes: ['xp'] });
  res.status(200).json({ xp: xp.xp });
};

const slides_progress = async (req, res) => {
  try {
    const { classroomId, sectionId, slideId } = req.params;
    const userId = req.user.id;

    // Verify classroom enrollment for learners
    if (req.user.Role === 'Learner') {
      const enrollment = await ClassroomStudent.findOne({
        where: { 
          student_id: userId, 
          classroom_id: classroomId 
        }
      });

      if (!enrollment) {
        return res.status(403).json({ error: 'Not enrolled in this classroom' });
      }
    }

    // Get slide details with included section info
    const slide = await Slide.findOne({
      where: {
        slide_id: slideId,
        classroom_id: classroomId,
        course_section_id: sectionId
      },
      include: [{
        model: CourseSection,
        as: 'courseSection',
        attributes: ['course_section_id', 'course_title']
      }]
    });

    if (!slide) {
      return res.status(404).json({ error: 'Slide not found' });
    }

    // Get all attempts for this slide
    const attempts = await SlideQuestionAttempt.findAll({
      where: {
        user_id: userId,
        slide_id: slideId,
        classroom_id: classroomId,
        course_section_id: sectionId
      },
      order: [['completed_at', 'DESC']],
      limit: 5
    });

    if (attempts.length === 0) {
      return res.status(200).json({
        slideName: slide.slide_name || `Slide ${slide.slide_number}`,
        sectionName: slide.courseSection?.title,
        progressSummary: {
          attemptCount: 0,
          lastFiveScores: [],
          averageScore: '0.0',
          highestScore: '0.0',
          lowestScore: '0.0',
          performanceTrend: 'Not started'
        },
        needsImprovement: true,
        studyRecommendation: 'Start your learning journey with this slide!',
        performanceMessage: 'No attempts yet. Take your first quiz to begin tracking progress.'
      });
    }

    // Calculate performance metrics
    const scores = attempts.map(a => a.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    
    // Calculate improvement trend
    let trend = "Not enough data";
    if (attempts.length >= 2) {
      const firstScore = attempts[attempts.length - 1].score;
      const lastScore = attempts[0].score;
      
      if (lastScore > firstScore) {
        trend = "Improving";
      } else if (lastScore < firstScore) {
        trend = "Declining";
      } else {
        trend = "Stable";
      }
    }
    
    // Generate study recommendations
    let studyRecommendation = "";
    const needsImprovement = averageScore < 70;

    if (needsImprovement) {
      const latestAttempt = attempts[0];
      const missedQuestions = latestAttempt.questions_attempted
        .filter(q => !q.is_correct)
        .slice(0, 3);
        
      studyRecommendation = "Based on your performance, we recommend reviewing the following topics:";
      
      if (missedQuestions.length > 0) {
        missedQuestions.forEach((q, idx) => {
          studyRecommendation += `\n${idx + 1}. ${q.question_text}`;
        });
      } else {
        studyRecommendation += " Review all slide content thoroughly.";
      }
    } else if (averageScore >= 80) {
      studyRecommendation = "Great work! You're showing strong understanding of this slide's content. Consider exploring advanced topics.";
    } else {
      studyRecommendation = "You're making good progress. Continue practice to reinforce your understanding.";
    }

    // Generate performance message
    let performanceMessage = "";
    if (trend === "Improving") {
      performanceMessage = "Keep up the great work! Your scores are improving.";
    } else if (trend === "Declining") {
      performanceMessage = "Your recent scores show a decline. Consider reviewing the material again.";
    } else if (trend === "Stable") {
      performanceMessage = averageScore >= 70 
        ? "You're maintaining a good performance level." 
        : "You're consistent, but there's room for improvement.";
    }

    res.status(200).json({
      slideName: slide.slide_name || `Slide ${slide.slide_number}`,
      sectionName: slide.courseSection?.title,
      progressSummary: {
        attemptCount: attempts.length,
        lastFiveScores: attempts.map(a => ({
          score: a.score.toFixed(1),
          date: a.completed_at,
          passingStatus: a.score >= 60 ? "Pass" : "Needs Improvement"
        })),
        averageScore: averageScore.toFixed(1),
        highestScore: highestScore.toFixed(1),
        lowestScore: lowestScore.toFixed(1),
        performanceTrend: trend
      },
      needsImprovement,
      studyRecommendation,
      performanceMessage
    });
  } catch (error) {
    console.error('Error fetching progress data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

module.exports = {
  profile,
  update,
  join,
  availableClassrooms,
  classrooms,
  enrolled,
  sections,
  slides,
  pastQuestions,
  announcements,
  get_leaderboard,
  test,
  submit_test,
  xp_update,
  xp_get,
  slides_progress
};
