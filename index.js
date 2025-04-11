// const express = require('express');
// const cors = require('cors');
// const morgan = require('morgan');
// const cookieParser = require('cookie-parser');
// const dotenv = require('dotenv');
// const router = require('./routes/masterRoutes');
// const setupAssociations = require('./config/associations');

// const sequelize = require('./config/database'); 

// dotenv.config();

// const app = express();

// // CORS middleware - add this first
// app.use(cors({
//   origin: 'https://code-craft-frontend.vercel.app',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true
// }));

// // Handle preflight requests
// app.options('*', cors());

// // Standard middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use(morgan('combined'));

// // Setup associations
// setupAssociations();

// // Test endpoint
// app.get("/test", (req, res) => {
//   console.log("Test endpoint hit");
//   res.status(200).json({ message: "API is working" });
// });

// // Your main routes
// app.use("/", router);

// // Catch-all for undefined routes - must be last
// app.use("*", (req, res) => {
//   res.status(404).json({ error: "No Page" });
// });

// // Database sync
// sequelize
//   .sync({ alter: true })
//   .then(() => {
//     console.log('Database & tables created/updated!');
//   })
//   .catch(err => console.log('Error syncing database:', err));

// // Start the server
// const PORT = process.env.PORT || 5005;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });


const express = require('express');
const app = express();

// Basic CORS setup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://code-craft-frontend.vercel.app');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Simple test endpoint
app.get('/test', (req, res) => {
  return res.json({ message: 'Test endpoint working' });
});

// Export for Vercel
module.exports = app;