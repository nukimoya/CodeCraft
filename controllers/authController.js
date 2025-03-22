const express = require('express');
const User = require('../model/user');
const bcryptjs = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
require('dotenv').config();
const auth = require('../middleware/auth');
const { updateStreak } = require('../utils/updateStreak');
const nodemailer = require('nodemailer');

// Constants for validation
const VALIDATION_RULES = {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 30,
    PASSWORD_MIN_LENGTH: 8,
    ROLES: ['Learner', 'Admin'],
    LEVELS: ['Beginner', 'Intermediate', 'Advanced']
};

// Validation functions
const validateUsername = (username) => {
    if (!username || typeof username !== 'string') {
        return 'Username is required';
    }
    if (username.length < VALIDATION_RULES.USERNAME_MIN_LENGTH) {
        return 'Username must be at least ${VALIDATION_RULES.USERNAME_MIN_LENGTH} characters';
    }
    if (username.length > VALIDATION_RULES.USERNAME_MAX_LENGTH) {
        return 'Username must be less than ${VALIDATION_RULES.USERNAME_MAX_LENGTH} characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return 'Username can only contain letters, numbers, and underscores';
    }
    return null;
};

const validatePassword = (password) => {
    if (!password) {
        return 'Password is required';
    }
    if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
        return 'Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*]/.test(password)) {
        return 'Password must contain at least one special character (!@#$%^&*)';
    }
    return null;
};

const signupUser = async (req, res) => {
    try {
        const { username, email, password, level, role } = req.body;

        // Initialize an array to store validation errors
        const validationErrors = [];

        // Username validation
        const usernameError = validateUsername(username);
        if (usernameError) validationErrors.push(usernameError);

        // Email validation
        const trimmedEmail = email?.trim().toLowerCase();
        if (!trimmedEmail || !validator.isEmail(trimmedEmail)) {
            validationErrors.push('Valid email is required');
        }

        // Password validation
        const passwordError = validatePassword(password);
        if (passwordError) validationErrors.push(passwordError);

        // Role validation
        if (!VALIDATION_RULES.ROLES.includes(role)) {
            validationErrors.push(`Role must be one of: ${VALIDATION_RULES.ROLES.join(', ')}`);
        }

        // Level validation
        if (!VALIDATION_RULES.LEVELS.includes(level)) {
            validationErrors.push(`Level must be one of: ${VALIDATION_RULES.LEVELS.join(', ')}`);
        }

        // Return all validation errors at once
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                msg: validationErrors 
            });
        }

        // Check for existing user (both email and username)
        const [existingEmail, existingUsername] = await Promise.all([
            User.findOne({ where: { Email: trimmedEmail } }),
            User.findOne({ where: { Username: username } })
        ]);

        if (existingEmail) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        if (existingUsername) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        // Hash password with automatic salt
        const hashedPassword = await bcryptjs.hash(password, 12);

        // Create user with sanitized and validated data
        const user = await User.create({
            Username: username,
            Email: trimmedEmail,
            Password: hashedPassword,
            Role: role,
            Level: level,
            created_at: new Date(),
            current_streak: 0,
            highest_streak: 0,
            total_active_days: 0,
            xp: 0,
            is_approved: role === 'Admin' ? false : true // Set admin accounts to unapproved by default
        });

        // If the user is signing up as an admin, send confirmation email
        if (role === 'Admin') {
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
                emailType: typeof trimmedEmail,
                emailValue: trimmedEmail,
                bufferHex: Buffer.from(trimmedEmail).toString('hex')
              });
      
            const mailOptions = {
                from: 'StudyMate <sayomikun123@gmail.com>',
                to: trimmedEmail,
                subject: 'Admin Account Registration - Pending Approval',
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
                            <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">Welcome to StudyMate!</h1>
                        </div>

                        <!-- Main Content -->
                        <div style="padding: 20px 0;">
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">Dear <strong>${username}</strong>,</p>
                            
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">Thank you for registering as an Administrator on <strong>StudyMate</strong>. Your account has been created successfully, but requires approval before you can access administrative features.</p>

                            <!-- Account Details Box -->
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                                <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Account Details</h2>
                                <ul style="list-style: none; padding: 0; margin: 0;">
                                    <li style="color: #34495e; padding: 5px 0;">
                                        <strong>Username:</strong> ${username}
                                    </li>
                                    <li style="color: #34495e; padding: 5px 0;">
                                        <strong>Email:</strong> ${trimmedEmail}
                                    </li>
                                    <li style="color: #34495e; padding: 5px 0;">
                                        <strong>Role:</strong> Administrator (Pending Approval)
                                    </li>
                                </ul>
                            </div>

                            <!-- Qualification Requirements Box -->
                            <div style="background-color: #fff3e0; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800;">
                                <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Important: Submit Your Qualifications</h2>
                                <p style="color: #34495e; font-size: 16px; line-height: 1.6;">To complete your administrator application, please reply to this email with the following information:</p>
                                <ul style="color: #34495e; padding-left: 20px; line-height: 1.6;">
                                    <li>Your current academic position or role</li>
                                    <li>Teaching experience and qualifications</li>
                                    <li>Relevant certifications or credentials</li>
                                    <li>Brief explanation of why you'd like to be an administrator</li>
                                    <li>Any references or supporting documentation</li>
                                </ul>
                                <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin-top: 15px;">
                                    <strong>Note:</strong> Your application will be reviewed once we receive your qualifications.
                                </p>
                            </div>

                            <!-- Next Steps Section -->
                            <div style="margin: 20px 0;">
                                <h2 style="color: #2c3e50; font-size: 18px;">What's Next?</h2>
                                <ol style="color: #34495e; padding-left: 20px; line-height: 1.6;">
                                    <li><strong>Submit Qualifications:</strong> Reply to this email with your credentials</li>
                                    <li>Our platform administrators will review your application and qualifications</li>
                                    <li>You will receive another email once your account has been approved</li>
                                    <li>After approval, you'll have full access to administrative features</li>
                                </ol>
                            </div>

                            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">If you have any questions about the application process or required qualifications, please don't hesitate to contact our support team.</p>
                        </div>

                        <!-- Footer -->
                        <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0;">
                            <p style="color: #7f8c8d; font-size: 14px;">Thank you for choosing <strong>StudyMate</strong></p>
                            <p style="color: #7f8c8d; margin-bottom: 20px;">Best Regards,<br>The <strong>StudyMate</strong> Team</p>
                            
                            <!-- Logo -->
                            <div style="display: flex; align-items: center; justify-content: center; margin-top: 20px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#0e161b" style="margin-right: 8px;">
                                    <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                                    <path d="M12 14l-6.16-3.422a12.083 12.083 0 00-.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 016.824-2.998 12.078 12.078 0 00-.665-6.479L12 14z"/>
                                </svg>
                                <span style="color: #0e161b; font-size: 20px; font-weight: bold;">StudyMate</span>
                            </div>
                        </div>
                    </div>
                </body>
                </html>`
            };

            try {
                await new Promise((resolve, reject) => {
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Admin Registration Email Error:', {
                                error: error.message,
                                code: error.code,
                                command: error.command,
                                responseCode: error.responseCode,
                                response: error.response
                            });
                            reject(error);
                        } else {
                            console.log('Admin registration email sent successfully:', info.response);
                            resolve(info);
                        }
                    });
                });
            } catch (emailError) {
                console.error('Failed to send admin registration email:', emailError);
                // Continue with the response even if email fails
            }
        }

        // If the user is signing up as a learner, send welcome email
        if (role === 'Learner') {
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

            const mailOptions = {
                from: 'CodeCraft <sayomikun123@gmail.com>',
                to: trimmedEmail,
                subject: 'Welcome to CodeCraft - Your Learning Journey Begins!',
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
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">Dear <strong>${username}</strong>,</p>
                            
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">Congratulations on joining <strong>StudyMate</strong>! We're excited to support you on your learning journey.</p>

                            <!-- Account Details Box -->
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                                <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Your Account Details</h2>
                                <ul style="list-style: none; padding: 0; margin: 0;">
                                    <li style="color: #34495e; padding: 5px 0;">
                                        <strong>Username:</strong> ${username}
                                    </li>
                                    <li style="color: #34495e; padding: 5px 0;">
                                        <strong>Email:</strong> ${trimmedEmail}
                                    </li>
                                    <li style="color: #34495e; padding: 5px 0;">
                                        <strong>Level:</strong> ${level}
                                    </li>
                                </ul>
                            </div>

                            <!-- Getting Started Section -->
                            <div style="background-color: #e6f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196f3;">
                                <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Getting Started</h2>
                                <p style="color: #34495e; font-size: 16px; line-height: 1.6;">Here's how to make the most of CodeCraft:</p>
                                <ul style="color: #34495e; padding-left: 20px; line-height: 1.6;">
                                    <li>Complete your profile</li>
                                    <li>Join classrooms that match your interests</li>
                                    <li>Track your learning progress</li>
                                    <li>Earn XP and level up</li>
                                    <li>Connect with other learners</li>
                                </ul>
                            </div>

                            <!-- Learning Streak Section -->
                            <div style="margin: 20px 0;">
                                <h2 style="color: #2c3e50; font-size: 18px;">Your Learning Journey</h2>
                                <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
                                    Start building your learning streak today! Consistent learning is the key to success. 
                                    Log in daily, complete activities, and watch your skills grow.
                                </p>
                            </div>

                            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
                                If you have any questions or need help, our support team is always here for you.
                            </p>
                        </div>

                        <!-- Footer -->
                        <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0;">
                            <p style="color: #7f8c8d; font-size: 14px;">Thank you for choosing <strong>CodeCraft</strong></p>
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
                await new Promise((resolve, reject) => {
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Learner Welcome Email Error:', {
                                error: error.message,
                                code: error.code,
                                command: error.command,
                                responseCode: error.responseCode,
                                response: error.response
                            });
                            reject(error);
                        } else {
                            console.log('Learner welcome email sent successfully:', info.response);
                            resolve(info);
                        }
                    });
                });
            } catch (emailError) {
                console.error('Failed to send learner welcome email:', emailError);
                // Continue with the response even if email fails
            }
        }

        // Return success without sensitive data
        res.status(201).json({
            message: role === 'Admin' ? 
                'User created successfully. Please wait for admin approval.' : 
                'User created successfully',
            user: {
                id: user.user_id,
                username: user.Username,
                email: user.Email,
                role: user.Role,
                level: user.Level,
                is_approved: user.is_approved
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ 
                error: 'Account creation failed',
                message: 'Email or username already exists'
            });
        }

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                error: 'Validation error',
                details: error.errors.map(e => e.message)
            });
        }

        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Account creation failed. Please try again later.'
        });
    }
};


//SignIn Logic

// Rate limiting for failed login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 failed attempts
    message: { error: 'Too many login attempts. Please try again later.' }
});

// Constants
const TOKEN_EXPIRY = '1d';
const LOGIN_DELAY = 1000; // 1 second delay for security


// Create JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.user_id,
            role: user.Role,
            email: user.Email,
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { 
            expiresIn: TOKEN_EXPIRY,
            algorithm: 'HS256'
        }
    );
};

// Format user response
const formatUserResponse = (user) => ({
    id: user.user_id,
    username: user.Username,
    email: user.Email,
    role: user.Role,
    level: user.Level,
    current_streak: user.current_streak,
    highest_streak: user.highest_streak,
    total_active_days: user.total_active_days,
    xp: user.xp,
});

const signinUser = async (req, res) => {
    const startTime = Date.now(); // For implementing constant-time response

    try {
        const { email, password } = req.body;

        const trimmedEmail = email.trim().toLowerCase();
        
        // Get user with essential fields only
        const user = await User.findOne({ 
            where: { Email: trimmedEmail },
            attributes: ['user_id', 'Username', 'Email', 'Password', 'Role', 'Level',
                       'current_streak', 'highest_streak', 'total_active_days', 'xp']
        });
        
        // Constant-time password comparison to prevent timing attacks
        const isPasswordValid = user ? await bcryptjs.compare(password, user.Password) : false;
        
        // Security delay to prevent email enumeration
        // const elapsedTime = Date.now() - startTime;
        // await new Promise(resolve => setTimeout(resolve, Math.max(0, LOGIN_DELAY - elapsedTime)));

        if (!user || !isPasswordValid) {
            return res.status(401).json({ 
                error: 'Invalid email or password',
                msg: 'Email or Password Invalid!'
            });
        }

        // Generate JWT token
        const token = generateToken(user);

        // Update streak in background
        updateStreak(user.user_id).catch(error => {
            console.error('Streak update failed:', error);
            // Log to monitoring service if available
        });

        // Set secure cookie with token
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
         console.log(user)
        // Send success response
        res.status(200).json({
            msg: 'Sign-in successful',
            token, // Consider removing this if using httpOnly cookies
            user: formatUserResponse(user)
        });

    } catch (error) {
        console.error('Signin error:', error);
        
        // Handle specific error types
        if (error.name === 'SequelizeConnectionError') {
            return res.status(503).json({ 
                error: 'Service temporarily unavailable',
                msg: 'Please try again later'
            });
        }

        res.status(500).json({ 
            error: 'Internal server error',
            msg: 'An unexpected error occurred'
        });
    }
};

// Middleware composition
const secureSignin = [
    loginLimiter,
    signinUser
];

// const signinUser = async (req, res) => {
//     try {
//         const { email, password } = req.body;
        
//         if (!email || !password) {
//             return res.status(400).json({ error: 'Email and password are required' });
//         }

//         const trimmedEmail = email.trim().toLowerCase();
    
//         const user = await User.findOne({ where: { Email: trimmedEmail } });
//         if (!user) {
//             return res.status(401).json({ error: 'Invalid email or password' });
//         }
    
//         const isPasswordValid = await bcryptjs.compare(password, user.Password);
//         if (!isPasswordValid) {
//             return res.status(401).json({ error: 'Invalid email or password' });
//         }
    
//         // Fixed token generation - removed exp from payload since it's in options
//         const token = jwt.sign(
//             { 
//                 id: user.user_id,
//                 role: user.Role,
//                 iat: Math.floor(Date.now() / 1000)
//             },
//             process.env.JWT_SECRET,
//             { 
//                 expiresIn: '1d',
//                 algorithm: 'HS256'
//             }
//         );
    
//         try {
//             const updatedUser = await updateStreak(user.user_id);
            
//             res.status(200).json({
//                 message: 'Sign-in successful',
//                 token,
//                 user: {
//                     id: updatedUser.user_id,
//                     username: updatedUser.Username,
//                     email: updatedUser.Email,
//                     role: updatedUser.Role,
//                     current_streak: updatedUser.current_streak,
//                     highest_streak: updatedUser.highest_streak,
//                     total_active_days: updatedUser.total_active_days,
//                     xp: updatedUser.xp,
//                 },
//             });
//         } catch (streakError) {
//             console.error('Streak update failed:', streakError);
            
//             res.status(200).json({
//                 message: 'Sign-in successful (streak update failed)',
//                 token,
//                 user: {
//                     id: user.user_id,
//                     username: user.Username,
//                     email: user.Email,
//                     role: user.Role,
//                     current_streak: user.current_streak,
//                     highest_streak: user.highest_streak,
//                     total_active_days: user.total_active_days,
//                     xp: user.xp,
//                 },
//             });
//         }

//     } catch (error) {
//         console.error('Signin error:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };


module.exports = { signupUser, signinUser: secureSignin
    // , loginLimiter 
    };