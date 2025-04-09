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
app.use(express.json());
app.use(cookieParser());

// Setup associations
setupAssociations();

// Middleware
app.use(cors({
  origin: 'https://code-craft-frontend.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
app.use(morgan('combined'));
app.use("/", router);


app.use("*", (req, res) => {
    res.status(404).json({ error: "No Page" });
  });


sequelize
  .sync({ alter: true })
  .then(() => {
    console.log('Database & tables created/updated!');
  })
  .catch(err => console.log('Error syncing database:', err));

 const PORT = process.env.PORT || 5005;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
  

