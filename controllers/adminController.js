const express = require("express");
const nodemailer = require("nodemailer");
require('dotenv').config();
const User = require("../model/user");
const Classroom = require("../model/classroom");
const ClassroomStudent = require("../model/classroomStudent");
const CourseSection = require("../model/courseSection");
const Slide = require("../model/slides");
const PastQuestion = require("../model/pastQuestions");
const Announcement = require("../model/announcements");
const Question = require("../model/question");
// const SlideQuestionAttempt = require("../model/slideQuestionAttempt");

const { generateJoinCode } = require('../utils/joincode');
const sequelize = require('../config/database');
const { fetchLeaderboard } = require('../utils/fetchLeaderboard');
const { Groq } = require('groq-sdk'); 

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY
});

async function generateQuestionsWithGroq(slideContent, slideNumber) {
  const prompt = `IMPORTANT: Provide ONLY a valid JSON array. Do not include any explanatory text before or after.

Generate 25 multiple choice questions based on the following structured slide content.
Ensure questions cover different aspects and difficulty levels.

Main Concepts: ${slideContent.split('Main Concepts:')[1]?.split('Key Definitions:')[0] || ''}
Key Definitions: ${slideContent.split('Key Definitions:')[1]?.split('Examples:')[0] || ''}
Examples: ${slideContent.split('Examples:')[1]?.split('Additional Notes:')[0] || ''}
Additional Notes: ${slideContent.split('Additional Notes:')[1] || ''}

Generate questions in this EXACT JSON format:
[
  {
    "question_text": "Precise question about the content",
    "options": ["option A", "option B", "option C", "option D"],
    "correct_answer": 0,
    "question_type": "definition",
    "difficulty_level": "medium"
  }
]

Slide ${slideNumber} content: ${slideContent}

JSON ARRAY:`;

  let response;
  try {
    response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 3000,
    });

    const responseText = response.choices[0]?.message?.content?.trim();
    
    if (!responseText) {
      throw new Error('Empty response from Groq API');
    }

    const jsonMatch = responseText.match(/\[.*\]/s);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in response');
    }

    const questions = JSON.parse(jsonMatch[0]);
    return questions.map(q => ({
      ...q,
      slide_number: slideNumber
    }));

  } catch (error) {
    console.error('Detailed error generating questions:', {
      message: error.message,
      responseText: response?.choices?.[0]?.message?.content || 'No response available',
      error: error.stack
    });
    
    // Re-throw with more context
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
}

const profile = async (req, res) => {
    try {
        const user = await User.findOne({
          where: { 
            user_id: req.user.user_id,
            role: 'Admin'
          },
          attributes: [
            'user_id',
            'first_name', 
            'last_name',
            'email',
            'level',
            'role',
            'current_streak',
            'highest_streak',
            'total_active_days',
            'xp'
          ]
        });
    
        if (!user) {
          return res.status(404).json({ error: 'Course representative not found' });
        }
    
        res.status(200).json({
          message: 'Profile fetched successfully',
          user
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
}

const update = async (req, res) => {
    try {
        const { first_name, last_name } = req.body;
    
        await User.update(
          { first_name, last_name },
          { where: { user_id: req.user.user_id, role: 'Admin' } }
        );
    
        res.status(200).json({
          message: 'Profile updated successfully'
        });
      } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
}

const section_create = async (req, res) => {
    const { classroomId } = req.params;
  const { courseTitle, courseCode, courseDescription, courseDifficulty } = req.body;

  try {
    const classroom = await Classroom.findOne({
      where: {
        classroom_id: classroomId,
        admin_id: req.user.id,
      },
    });

    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found or you are not the course rep' });
    }
    const section = await CourseSection.create({
      course_title: courseTitle,
      course_code: courseCode,
      classroom_id: classroomId,
      course_description: courseDescription,
      course_difficulty: courseDifficulty,
    });
    res.status(200).json({
      message: 'Section created successfully',
      section,
    });
  } catch (error) {
    console.error('Error Creating Section:', error);
    res.status(500).json({ error: 'An error occurred while creating the section' });
  }
}

const get_classrooms = async (req, res) => {
    try {
        console.log('Fetching classrooms for user:', req.user.id);

        const classrooms = await Classroom.findAll({
            where: { admin_id: req.user.id },
            include: [{
                model: CourseSection,
                as: 'courseSections',
                attributes: [
                    'course_section_id', 
                    'course_title', 
                    'course_code',
                    'course_description',
                    'course_difficulty'
                ]
            }],
            attributes: [
                'classroom_id',
                'name',
                'join_code',
                'is_active',
                'admin_id',
                'createdAt',
                'updatedAt'
            ]
        });

        console.log('Found classrooms:', classrooms.length);

        res.status(200).json({
            message: 'Classrooms fetched successfully',
            classrooms,
        });
    } catch (error) {
        console.error('Error Fetching Classrooms:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'An error occurred while fetching classrooms',
            details: error.message 
        });
    }
};

const classroom_details = async (req, res) => {
    const { classroomId } = req.params;

    try {
        // Add debug logging
        console.log('Fetching classroom details:', {
            classroomId,
            userId: req.user.id
        });

        const classroom = await Classroom.findOne({
            where: {
                classroom_id: classroomId,
                admin_id: req.user.id
            },
            // Include all relevant fields
            attributes: [
                'classroom_id',
                'name',
                'join_code',
                'is_active',
                'admin_id',
                'createdAt',
                'updatedAt'
            ]
        });

        if (!classroom) {
            return res.status(404).json({ 
                error: 'Classroom not found or you do not have permission to access it' 
            });
        }

        // Add debug logging
        console.log('Found classroom:', classroom);

        res.status(200).json({
            message: 'Classroom fetched successfully',
            classroom
        });
    } catch (error) {
        // Add detailed error logging
        console.error('Error fetching classroom details:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}

const section_list = async (req, res) => {
    const { classroomId } = req.params;

  try {
    const classroom = await Classroom.findOne({
      where: {
        classroom_id: classroomId,
        admin_id: req.user.id,
      },
    });

    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found or you are not the course rep' });
    }

    const sections = await CourseSection.findAll({
      where: { classroom_id: classroomId },
      attributes: ['course_section_id', 'course_title', 'course_code', 'course_description', 'course_difficulty'],
    });

    res.status(200).json({
      message: 'Sections fetched successfully',
      sections,
    });
  } catch (error) {
    console.error('Error Fetching Sections:', error);
    res.status(500).json({ error: 'An error occurred while fetching sections' });
  }
}

// Sanitize the filename by replacing special characters with underscores
const sanitizeFileName = (filename) => {
  return filename
    .replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '_') // Replace special characters with underscore
    .replace(/\s+/g, '_'); // Replace spaces with underscore
};

const slide_upload = async (req, res) => {
    try {
        const { classroomId, courseSectionId } = req.params;
        const { slide_name, slide_number } = req.body;
        const file_url = req.file.path;
    
        const courseSection = await CourseSection.findOne({
          where: {
            course_section_id: courseSectionId,
            classroom_id: classroomId,
          },
        });
    
        if (!courseSection) {
          return res.status(400).json({ error: 'Course section not found' });
        }
    
        if (!slide_number || isNaN(slide_number)) {
          return res.status(400).json({ error: 'Invalid slide number. Please provide a valid number.' });
        }
    
        const existingSlide = await Slide.findOne({
          where: {
            course_section_id: courseSection.course_section_id,
            slide_number: slide_number,
          },
        });
        if (existingSlide) {
          return res.status(400).json({ error: 'Slide number already exists in this course section. Please use a different number.' });
        }
    
        const filename = sanitizeFileName(req.file.originalname);
        const newSlide = await Slide.create({
          slide_name,
          file_name: filename,
          file_url: file_url.replace('http://', 'https://'),
          slide_number: parseInt(slide_number),
          course_section_id: courseSection.course_section_id,
          classroom_id: classroomId,
        });
    
        res.json({ message: 'Slide uploaded successfully', slide: newSlide });
      } catch (error) {
        console.error('Error uploading slide:', error);
        res.status(500).json({ error: 'Failed to upload slide' });
      }
}

const slide_section = async (req, res) => {
    const { classroomId, courseSectionId } = req.params;
  try {
    const slides = await Slide.findAll({
      where: { course_section_id: courseSectionId, classroom_id: classroomId },
      attributes: ['slide_id', 'slide_name', 'file_name', 'file_url', 'slide_number'],
    });

    res.status(200).json({
      message: 'Slides fetched successfully',
      slides,
    });
  } catch (error) {
    console.error('Error Fetching Slides:', error);
    res.status(500).json({ error: 'An error occurred while fetching slides' });
  }
}

const specific_section_details = async (req, res) => {
    const { classroomId, courseSectionId } = req.params;

    try {
      const section = await CourseSection.findOne({
        where: {
          course_section_id: courseSectionId,
          classroom_id: classroomId
        },
        attributes: ['course_section_id', 'course_title', 'course_code', 'course_difficulty']
      });

      if (!section) {
        return res.status(404).json({ 
          error: 'Course section not found' 
        });
      }

      res.status(200).json({
        message: 'Course section fetched successfully',
        section
      });
    } catch (error) {
      console.error('Error fetching course section:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
}

const past_question_upload = async (req, res) => {
    try {
        const { classroomId, courseSectionId } = req.params;
        const { past_question_name } = req.body;
  
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: 'No files uploaded' });
        }
  
        const courseSection = await CourseSection.findOne({
          where: {
            course_section_id: courseSectionId,
            classroom_id: classroomId,
          },
        });
  
        if (!courseSection) {
          return res.status(400).json({ error: 'Course section not found' });
        }
        const file_names = req.files.map(file => file.originalname);
        // Cloudinary returns the URL in the path property
        const file_urls = req.files.map(file => file.path); 
        const newPastQuestion = await PastQuestion.create({
          past_question_name,
          file_names,
          file_urls,
          course_section_id: courseSection.course_section_id,
          classroom_id: classroomId,
        });
  
        res.status(201).json(
          { message: 'Past Question uploaded successfully', past_question: newPastQuestion });
      } catch (error) {
        console.error('Error uploading past question:', error);
        res.status(500).json({ error: 'Failed to upload past question' });
      }
}

const create_announcements = async (req, res) => {
    const { classroomId } = req.params;
    const { content, tag, links } = req.body;

    try {
      const classroom = await Classroom.findOne({
        where: {
          classroom_id: classroomId,
          admin_id: req.user.id,
        },
      });

      if (!classroom) {
        return res.status(404).json({ error: 'Classroom not found or unauthorized' });
      }

      const files = req.files?.map(file => ({
        fileName: file.originalname,
        fileUrl: file.path
      })) || [];

      const parsedLinks = links ? JSON.parse(links) : [];

      const now = new Date();
      const announcement = await Announcement.create({
        content,
        classroom_id: classroomId,
        date: now,
        time: now.toTimeString().split(' ')[0],
        tag: tag || 'general',
        files,
        links: parsedLinks
      });

      res.status(200).json({
        message: 'Announcement created successfully',
        announcement,
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
      res.status(500).json({ error: 'Failed to create announcement' });
    }
}

const update_leaderboard = async (req, res) => {
    const { classroomId } = req.params;

    try {
      // Debug user object structure
      console.log('User object:', {
        id: req.user.id,
        user_id: req.user.user_id,
        role: req.user.Role
      });

      // Check if the user is a course rep for this classroom
      const isCourseRep = await Classroom.findOne({
        where: {
          classroom_id: classroomId,
          admin_id: req.user.id,
        },
      });

      if (!isCourseRep) {
        console.log('User is not a course rep for this classroom. Classroom ID:', classroomId, 'User ID:', req.user.id);
      } else {
        console.log('User is a course rep for this classroom.');
      }

      // Check if the user is a student in this classroom
      const isStudent = await ClassroomStudent.findOne({
        where: {
          classroom_id: classroomId,
          student_id: req.user.id
        }
      });

      if (!isStudent) {
        console.log('User is not a student in this classroom. Classroom ID:', classroomId, 'User ID:', req.user.id);
      } else {
        console.log('User is a student in this classroom.');
      }

      if (!isCourseRep && !isStudent) {
        return res.status(403).json({ 
          error: 'You are not authorized to view this leaderboard' 
        });
      }

      // Query with the CORRECT association alias 'student' as defined in your associations.js
      const students = await ClassroomStudent.findAll({
        where: { classroom_id: classroomId },
        include: [{
          model: User,
          as: 'student', // This matches the alias in your associations.js
          attributes: [
            'user_id',
            'Username',
            'Level',
            'current_streak',
            'highest_streak',
            'total_active_days',
            'xp'
          ],
          where: { Role: 'Learner' }
        }]
      });

      // Map and sort the data
      const leaderboardData = students
        .map(student => {
          // Access the User data through the 'student' property
          const userData = student.student;
          
          if (!userData) {
            console.log('Missing student data for ClassroomStudent:', 
              JSON.stringify(student.dataValues).substring(0, 200));
            return null;
          }
          
          return {
            student_id: userData.user_id,
            name: userData.Username || `Student ${userData.user_id}`,
            current_streak: userData.current_streak || 0,
            highest_streak: userData.highest_streak || 0,
            total_active_days: userData.total_active_days || 0,
            xp: userData.xp || 0
          };
        })
        .filter(Boolean) // Remove any null entries
        .sort((a, b) => {
          if (b.xp !== a.xp) return b.xp - a.xp;
          if (b.highest_streak !== a.highest_streak) return b.highest_streak - a.highest_streak;
          return b.current_streak - a.current_streak;
        });

      // Add ranking to the leaderboard data
      const rankedLeaderboard = leaderboardData.map((entry, index) => ({
        rank: index + 1,
        ...entry
      }));

      res.status(200).json({
        message: 'Leaderboard fetched successfully',
        leaderboard: rankedLeaderboard,
      });

    } catch (error) {
      console.error('Error Fetching Leaderboard:', error);
      res.status(500).json({ 
        error: 'An error occurred while fetching the leaderboard',
        details: error.message 
      });
    }
}

const get_students = async (req, res) => {
    try {
        const classroom = await Classroom.findOne({
          where: {
            classroom_id: req.params.classroomId,
            admin_id: req.user.id
          }
        });
    
        if (!classroom) {
          return res.status(404).json({ error: 'Classroom not found or unauthorized' });
        }
    
        const students = await ClassroomStudent.findAll({
          where: { classroom_id: req.params.classroomId },
          include: [{
            model: User,
            attributes: ['user_id', 'name', 'email', 'level']
          }]
        });
    
        res.status(200).json({
          message: 'Students retrieved successfully',
          students: students.map(s => s.User)
        });
      } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
}

const get_past_question = async (req, res) => {
    const { classroomId, courseSectionId } = req.params;
    
    try {
      // Verify classroom exists and user has access
      const classroom = await Classroom.findOne({
        where: {
          classroom_id: classroomId,
          admin_id: req.user.id
        }
      });

      if (!classroom) {
        return res.status(403).json({ 
          error: 'You do not have access to this classroom' 
        });
      }

      // Verify course section exists
      const courseSection = await CourseSection.findOne({
        where: {
          course_section_id: courseSectionId,
          classroom_id: classroomId
        }
      });

      if (!courseSection) {
        return res.status(404).json({ 
          error: 'Course section not found' 
        });
      }

      const pastQuestions = await PastQuestion.findAll({
        where: { 
          course_section_id: courseSectionId,
          classroom_id: classroomId 
        },
        attributes: [
          'past_question_id',
          'past_question_name',
          'file_names',
          'file_urls'
        ]
      });

      res.status(200).json({
        message: 'Past questions fetched successfully',
        pastQuestions
      });
      
    } catch (error) {
      console.error('Error fetching past questions:', error);
      res.status(500).json({ 
        error: 'An error occurred while fetching past questions' 
      });
    }
}

const get_announcements = async (req, res) => {
    const { tag, startDate, endDate } = req.query;
    
    try {
      const classroom = await Classroom.findOne({
        where: {
          classroom_id: req.params.classroomId,
          admin_id: req.user.id
        }
      });

      if (!classroom) {
        return res.status(404).json({ error: 'Classroom not found or unauthorized' });
      }

      let whereClause = { classroom_id: req.params.classroomId };
      
      if (tag) {
        whereClause.tag = tag;
      }
      
      if (startDate && endDate) {
        whereClause.date = {
          [Op.between]: [startDate, endDate]
        };
      }

      const announcements = await Announcement.findAll({
        where: whereClause,
        order: [['date', 'DESC'], ['time', 'DESC']],
        attributes: [
          'announcement_id',
          'content',
          'date',
          'time',
          'tag',
          'files',
          'links'
        ]
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

const delete_classroom = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
      const classroom = await Classroom.findOne({
        where: {
          classroom_id: req.params.classroomId,
          admin_id: req.user.user_id
        },
        transaction: t
      });

      if (!classroom) {
        await t.rollback();
        return res.status(404).json({ error: 'Classroom not found or unauthorized' });
      }

      // Delete all associated records within transaction
      await Promise.all([
        CourseSection.destroy({
          where: { classroom_id: req.params.classroomId },
          transaction: t
        }),
        ClassroomStudent.destroy({
          where: { classroom_id: req.params.classroomId },
          transaction: t
        }),
        Announcement.destroy({
          where: { classroom_id: req.params.classroomId },
          transaction: t
        })
      ]);

      await classroom.destroy({ transaction: t });
      await t.commit();

      res.status(200).json({ message: 'Classroom deleted successfully' });
    } catch (error) {
      await t.rollback();
      console.error('Error deleting classroom:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
}

const delete_course_section = async (req, res) => {
    try {
        const section = await CourseSection.findOne({
          where: {
            course_section_id: req.params.sectionId,
            classroom_id: req.params.classroomId
          },
          include: [{
            model: Classroom,
            where: { admin_id: req.user.user_id }
          }]
        });
  
        if (!section) {
          return res.status(404).json({ error: 'Course section not found or unauthorized' });
        }
  
        await section.destroy();
  
        res.status(200).json({ message: 'Course section deleted successfully' });
      } catch (error) {
        console.error('Error deleting course section:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
}

const delete_slide = async (req, res) => {
    try {
        const slide = await Slide.findOne({
          where: {
            slide_id: req.params.slideId,
            classroom_id: req.params.classroomId
          }
        });
  
        if (!slide) {
          return res.status(404).json({ error: 'Slide not found' });
        }
  
        await slide.destroy();
  
        res.status(200).json({ message: 'Slide deleted successfully' });
      } catch (error) {
        console.error('Error deleting slide:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
}

const delete_past_question = async (req, res) => {
    try {
        const question = await PastQuestion.findOne({
          where: {
            past_question_id: req.params.questionId,
            classroom_id: req.params.classroomId
          }
        });
  
        if (!question) {
          return res.status(404).json({ error: 'Past question not found' });
        }
  
        await question.destroy();
  
        res.status(200).json({ message: 'Past question deleted successfully' });
      } catch (error) {
        console.error('Error deleting past question:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
}

const delete_announcement = async (req, res) => {
    const { announcementId } = req.params;
    await Announcement.destroy({ where: { announcement_id: announcementId } });
    res.status(200).json({ message: 'Announcement deleted successfully' });
}

const create_classroom = async (req, res) => {
    const { name } = req.body;
    try {
        console.log('Request Body:', req.body);
        console.log('User Info:', req.user);

        if (!req.user || !req.user.id) {
            return res.status(400).json({ error: 'User information is missing' });
        }

        if (!name) {
            return res.status(400).json({ error: 'Classroom name is required' });
        }

        const existingActiveClassroom = await Classroom.findOne({
          where: {
            admin_id: req.user.id,
            is_active: true
          }
        });

        if (existingActiveClassroom) {
          return res.status(409).json({ 
            error: 'You already have an active classroom. Please deactivate your current classroom before creating a new one.'
          });
        }

        const adminEmail = req.user.email
          .trim()
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
          .normalize('NFKC');

        if (!adminEmail || typeof adminEmail !== 'string' || !adminEmail.includes('@')) {
          return res.status(400).json({ error: 'Invalid course representative email' });
        }

        const existingClassroom = await Classroom.findOne({
          where: {
            name,
            admin_id: req.user.id,
          },
        });

        if (existingClassroom) {
          return res.status(409).json({ 
            error: 'A classroom with this name already exists for this admin' 
          });
        }

        const joinCode = generateJoinCode();

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        console.log('Email Debug Info:', {
          emailType: typeof adminEmail,
          emailValue: adminEmail,
          bufferHex: Buffer.from(adminEmail).toString('hex')
        });

        const mailOptions = {
          from: 'Classroom Management <CodeCraft>',
          to: adminEmail.trim(), 
          subject: 'Classroom Join Code',
          headers: {
            'Priority': 'high',
            'X-MS-Exchange-Organization-AuthAs': 'Internal'
          },
          html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; margin-top: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
            <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">Welcome to CodeCraft!</h1>
        </div>

        <!-- Main Content -->
        <div style="padding: 20px 0;">
            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">Dear <strong>${req.user.username}</strong>,</p>
            
            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">We are excited to inform you that your new classroom has been successfully created on <strong>CodeCraft</strong>. As a course rep, you're now ready to manage resources, quizzes, and announcements for your classroom.</p>

            <!-- Classroom Details Box -->
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Classroom Details</h2>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="color: #34495e; padding: 5px 0;">
                        <strong>Classroom Name:</strong> ${name}
                    </li>
                    <li style="color: #34495e; padding: 5px 0;">
                        <strong>Join Code:</strong> <span style="background-color: #e3f2fd; padding: 2px 8px; border-radius: 3px;">${joinCode}</span>
                    </li>
                </ul>
            </div>

            <!-- Next Steps Section -->
            <div style="margin: 20px 0;">
                <h2 style="color: #2c3e50; font-size: 18px;">Your Next Steps</h2>
                <ol style="color: #34495e; padding-left: 20px; line-height: 1.6;">
                    <li><strong>Upload Resources:</strong> Post any relevant course materials for your students to access.</li>
                    <li><strong>Create Quizzes:</strong> Prepare quizzes for your students to assess their learning.</li>
                    <li><strong>Post Announcements:</strong> Keep your students updated with the latest news and course information.</li>
                </ol>
            </div>

            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">If you have any questions or need assistance, don't hesitate to reach out.</p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0;">
            <p style="color: #7f8c8d; font-size: 14px;">Thank you for being a part of <strong>CodeCraft</strong></p>
            <p style="color: #7f8c8d; margin-bottom: 20px;">Best Regards,<br>The <strong>CodeCraft</strong> Team</p>
            
            <!-- Logo -->
            <div style="display: flex; align-items: center; justify-content: center; margin-top: 20px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#0e161b" style="margin-right: 8px;">
                    <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                    <path d="M12 14l-6.16-3.422a12.083 12.083 0 00-.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 016.824-2.998 12.078 12.078 0 00-.665-6.479L12 14z"/>
                </svg>
                <span style="color: #0e161b; font-size: 20px; font-weight: bold;">CodeCraft</span>
            </div>
        </div>
    </div>
</body>
</html>`
        };
          try {
          const emailResult = await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error('Detailed Email Error:', {
                  error: error.message,
                  code: error.code,
                  command: error.command,
                  responseCode: error.responseCode,
                  response: error.response
                });
                reject(error);
              } else {
                console.log('Email sent successfully:', info.response);
                resolve(info);
              }
            });
          });

          const classroom = await Classroom.create({
            name,
            join_code: joinCode,
            admin_id: req.user.id,
            is_active: true
          });

          res.status(200).json({
            message: 'Classroom created successfully and notification email sent',
            classroom,
          });

        } catch (emailError) {
          console.error('Failed to send email:', emailError);
          return res.status(500).json({ 
            error: 'Failed to send notification email. Classroom was not created.',
            details: emailError.message 
          });
        }

      } catch (error) {
        console.error('Error Creating Classroom:', error);
        res.status(500).json({ 
          error: 'An error occurred while creating the classroom',
          details: error.message 
        });
      }
}

const classroom_stats = async (req, res) => {
    try {
        // Get all classrooms for this admin
        const classrooms = await Classroom.findAll({
            where: { admin_id: req.user.id }
        });

        // Get active classroom count
        const activeClassrooms = await Classroom.count({
            where: { 
                admin_id: req.user.id,
                is_active: true 
            }
        });

        // Get total students across all classrooms
        const totalStudents = await ClassroomStudent.count({
            where: {
                classroom_id: classrooms.map(classroom => classroom.classroom_id)
            }
        });

        // Get total course sections
        const totalSections = await CourseSection.count({
            where: {
                classroom_id: classrooms.map(classroom => classroom.classroom_id)
            }
        });

        // Get total announcements
        const totalAnnouncements = await Announcement.count({
            where: {
                classroom_id: classrooms.map(classroom => classroom.classroom_id)
            }
        });

        // Get recent activity (modified to avoid association error)
        const recentAnnouncements = await Announcement.findAll({
            where: {
                classroom_id: classrooms.map(classroom => classroom.classroom_id)
            },
            order: [['createdAt', 'DESC']],
            limit: 5,
            attributes: ['announcement_id', 'content', 'classroom_id', 'createdAt']
        });

        // Get classroom names separately
        const classroomMap = classrooms.reduce((acc, classroom) => {
            acc[classroom.classroom_id] = classroom.name;
            return acc;
        }, {});

        // Remove level distribution query that was causing the error
        // Instead, just return the total count
        const classroomCount = await Classroom.count({
            where: { admin_id: req.user.id }
        });

        res.status(200).json({
            totalClassrooms: classrooms.length,
            activeClassrooms,
            totalStudents,
            totalSections,
            totalAnnouncements,
            // Replace level distribution with simple count
            classroomCount,
            recentActivity: recentAnnouncements.map(announcement => ({
                id: announcement.announcement_id,
                content: announcement.content,
                classroom: classroomMap[announcement.classroom_id],
                date: announcement.createdAt
            }))
        });

    } catch (error) {
        console.error('Error fetching classroom stats:', error);
        res.status(500).json({ 
            error: 'Failed to fetch classroom statistics',
            details: error.message 
        });
    }
};

const slide_section_upload = async (req, res) => {
    try {
        const { classroomId, courseSectionId } = req.params;
        const { slide_name, slide_number } = req.body;
        const file_url = req.file.path;
        
        // Log the file URL for debugging
        console.log('File URL from Cloudinary:', file_url);
        
        // Check if the URL is properly formatted
        if (!file_url.startsWith('http')) {
            console.warn('Warning: File URL does not start with http:', file_url);
        }
        
        const courseSection = await CourseSection.findOne({
          where: {
            course_section_id: courseSectionId,
            classroom_id: classroomId,
          },
        });
    
        if (!courseSection) {
          return res.status(400).json({ error: 'Course section not found' });
        }
    
        if (!slide_number || isNaN(slide_number)) {
          return res.status(400).json({ error: 'Invalid slide number. Please provide a valid number.' });
        }
    
        const existingSlide = await Slide.findOne({
          where: {
            course_section_id: courseSection.course_section_id,
            slide_number: slide_number,
          },
        });
        if (existingSlide) {
          return res.status(400).json({ error: 'Slide number already exists in this course section. Please use a different number.' });
        }
    
        const filename = sanitizeFileName(req.file.originalname);
        const newSlide = await Slide.create({
          slide_name,
          file_name: filename,
          file_url: file_url.replace('http://', 'https://'),
          slide_number: parseInt(slide_number),
          course_section_id: courseSection.course_section_id,
          classroom_id: classroomId,
        });
        
        // Log the created slide with its URL
        console.log('Created slide with URL:', newSlide.file_url);
        
        res.json({ 
            message: 'Slide uploaded successfully', 
            slide: {
                ...newSlide.toJSON(),
                file_url: newSlide.file_url // Ensure URL is included in response
            }
        });
    } catch (error) {
        console.error('Error uploading slide:', error);
        res.status(500).json({ error: 'Failed to upload slide' });
    }
}

const get_questions = async (req, res) => {
  try {
    const { classroomId, sectionId, slideId } = req.params;

    // Validate slide existence first
    const slide = await Slide.findOne({
      where: {
        slide_id: slideId,
        course_section_id: sectionId,
        classroom_id: classroomId
      }
    });

    if (!slide) {
      return res.status(404).json({ 
        error: 'Slide not found or unauthorized access',
        questions: [] 
      });
    }

    // Fetch questions for the specific slide
    const questions = await Question.findAll({
      where: {
        slide_id: slideId,
        course_section_id: sectionId,
        classroom_id: classroomId
      },
      order: [['slide_number', 'ASC']],
      attributes: [
        'question_id', 
        'question_text', 
        'options', 
        'correct_answer', 
        'question_type', 
        'difficulty_level',
        'slide_number'
      ]
    });

    res.status(200).json({
      message: 'Questions retrieved successfully',
      questions: questions.length > 0 ? questions : [],
      slide: {
        slide_id: slide.slide_id,
        slide_name: slide.slide_name,
        slide_number: slide.slide_number
      }
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch questions',
      questions: []
    });
  }
}

const generate_questions = async (req, res) => {
  let transaction;
  try {
    const { classroomId, sectionId, slideId } = req.params;

    // Debug log the IDs
    console.log('Received IDs:', {
      classroomId,
      sectionId,
      slideId
    });

    // Validate UUID parameters
    if (!classroomId || !sectionId || !slideId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: classroomId, sectionId, or slideId',
        questions: []
      });
    }

    // More permissive UUID validation
    const isValidUUID = (uuid) => {
      return typeof uuid === 'string' && 
             uuid.length === 36 && 
             uuid.includes('-');
    };

    if (!isValidUUID(classroomId) || !isValidUUID(sectionId) || !isValidUUID(slideId)) {
      return res.status(400).json({ 
        error: 'Invalid UUID format',
        details: {
          classroomId: { value: classroomId, valid: isValidUUID(classroomId) },
          sectionId: { value: sectionId, valid: isValidUUID(sectionId) },
          slideId: { value: slideId, valid: isValidUUID(slideId) }
        },
        questions: []
      });
    }

    const { slideContent, slideNumber } = req.body;
    
    // Validate slide content and number
    if (!slideContent || !slideNumber) {
      return res.status(400).json({ 
        error: 'Slide content and slide number are required',
        questions: []
      });
    }

    // Start transaction
    transaction = await sequelize.transaction();

    // Validate slide existence and ownership
    const slide = await Slide.findOne({
      where: {
        slide_id: slideId,
        course_section_id: sectionId,
        classroom_id: classroomId
      },
      transaction
    });

    if (!slide) {
      await transaction.rollback();
      return res.status(404).json({ 
        error: 'Slide not found or unauthorized access',
        questions: []
      });
    }

    // First, delete any existing questions for this slide
    await Question.destroy({
      where: {
        slide_id: slideId,
        course_section_id: sectionId,
        classroom_id: classroomId
      },
      transaction
    });

    // Generate new questions
    const generatedQuestions = await generateQuestionsWithGroq(slideContent, slideNumber);
    
    // Save generated questions
    const savedQuestions = await Promise.all(
      generatedQuestions.map(q => Question.create({
        ...q,
        slide_id: slideId,
        course_section_id: sectionId,
        classroom_id: classroomId
      }, { transaction }))
    );

    // Commit transaction
    await transaction.commit();

    res.status(200).json({
      message: 'Questions generated successfully',
      questions: savedQuestions,
      slide: {
        slide_id: slide.slide_id,
        slide_name: slide.slide_name,
        slide_number: slide.slide_number
      }
    });

  } catch (error) {
    // Rollback transaction in case of error
    if (transaction) await transaction.rollback();
    
    console.error('Error generating questions:', {
      error: error.message,
      stack: error.stack,
      params: req.params,
      body: req.body
    });

    res.status(500).json({ 
      error: 'Failed to generate questions',
      details: error.message,
      questions: []
    });
  }
};

const update_questions = async (req, res) => {
  try {
    const { classroomId, sectionId, slideId, questionId } = req.params;

    const question = await Question.findOne({
      where: {
        question_id: questionId,
        classroom_id: classroomId
      },
      include: [{
        model: Slide,
        where: { 
          slide_id: slideId,
          classroom_id: classroomId,
          section_id: sectionId
        }
      }]
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found or unauthorized access' });
    }

    const {
      question_text,
      options,
      correct_answer,
      question_type,
      difficulty_level,
      status,
      feedback
    } = req.body;

    await question.update({
      question_text: question_text || question.question_text,
      options: options || question.options,
      correct_answer: (correct_answer !== undefined) ? correct_answer : question.correct_answer,
      question_type: question_type || question.question_type,
      difficulty_level: difficulty_level || question.difficulty_level,
      status: status || question.status,
      feedback: feedback || question.feedback
    });

    res.status(200).json({
      message: 'Question updated successfully',
      question
    });

  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
}

const delete_questions = async (req, res) => {
  try {
    const { classroomId, sectionId, slideId, questionId } = req.params;

    const question = await Question.findOne({
      where: {
        question_id: questionId,
        classroom_id: classroomId
      },
      include: [{
        model: Slide,
        where: { 
          slide_id: slideId,
          classroom_id: classroomId,
          section_id: sectionId
        }
      }]
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found or unauthorized access' });
    }

    await question.destroy();
    res.status(200).json({
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
}

module.exports = {
    profile,
    update,
    section_create,
    get_classrooms,
    classroom_details,
    section_list,
    slide_upload,
    slide_section,
    specific_section_details,
    past_question_upload,
    create_announcements,
    update_leaderboard,
    get_students,
    get_past_question,
    get_announcements,
    delete_classroom,
    delete_course_section,
    delete_slide,
    delete_past_question,
    create_classroom,
    classroom_stats,
    slide_section_upload,
    get_questions,
    generate_questions,
    update_questions,
    delete_questions,
    delete_announcement
};
  