# 🧠 CodeCraft Backend

CodeCraft is a gamified e-learning platform designed to help learners master programming languages like Python, Java, and JavaScript through interactive courses, quests, and AI-driven feedback. This repository contains the backend code for managing authentication, user roles, courses, progress tracking, and more.

## 🌐 Live URL

- **Frontend**: [https://code-craft-frontend.vercel.app](https://code-craft-frontend.vercel.app)  
- **Backend API**: Hosted via [Railway](https://railway.app)

---

## 🚀 Features

- 🔐 **JWT Authentication** with email confirmation
- 🧪 **Aptitude Testing** and AI-powered career path suggestions (via Groq)
- 📘 **Multi-language Learning Paths**: Python, Java, JavaScript (Beginner → Advanced)
- 📊 **User Profiles** with trackable progress
- 🌐 **Public APIs** secured with CORS
- 📬 Email services using **Nodemailer**
- ☁️ File uploads via **Cloudinary**
- 🧠 AI integration with Groq SDK
- 🔁 Rate limiting and IP trust configuration for production

---

## 🛠️ Tech Stack

| Layer       | Tools                                      |
|-------------|--------------------------------------------|
| **Backend** | Node.js, Express, Sequelize ORM            |
| **Database**| PostgreSQL (hosted on Railway)             |
| **Auth**    | JWT, bcrypt, cookie-parser                 |
| **Storage** | Cloudinary, Multer                         |
| **AI**      | Groq SDK                                   |
| **Email**   | Nodemailer                                 |
| **DevOps**  | Railway (Backend), Vercel (Frontend)       |

---

## 📁 Project Structure

codecraft-backend/
│
├── config/ # DB & model associations
├── controllers/ # Request handlers
├── middleware/ # Auth, validation, rate limiter, etc.
├── models/ # Sequelize models
├── routes/ # API route definitions
├── utils/ # Email templates, helpers, etc.
├── .env # Environment variables (not committed)
├── index.js # Entry point
└── README.md