const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const router = require('./routes/masterRoutes');
const setupAssociations = require('./config/associations');

const sequelize = require('./config/database');

dotenv.config();

const app = express();

// CORS should be one of the first middlewares
app.use(cors({
  origin: 'https://code-craft-frontend.vercel.app',  // Make sure the origin matches the frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handling preflight request
app.options('*', cors());  // Allows all options requests to pass CORS check

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined'));

// Setup associations (e.g., for Sequelize)
setupAssociations();

// Use your routes
app.use("/", router);

// Catch-all for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({ error: "No Page" });
});

// Sync the database with Sequelize
sequelize
  .sync({ alter: true })  // Use caution with `alter` in production
  .then(() => {
    console.log('Database & tables created/updated!');
  })
  .catch(err => {
    console.log('Error syncing database:', err);
  });

// Start the server
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
