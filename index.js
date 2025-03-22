const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const router = require('./routes/masterRoutes');
const setupAssociations = require('./config/associations');
// const courseRepRouter = require('./routes/courseRep');
// const studentRouter = require('./routes/students');
const sequelize = require('./config/database'); 
// const setupAssociations = require('./config/associations'); 
// const questRouter = require('./routes/questRoute.js');
// const wellnessRouter = require('./routes/wellness.js');

dotenv.config();


const app = express();
app.use(express.json());
app.use(cookieParser());
// Setup associations
setupAssociations();

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use("/", router);
// app.use(authRouter);
// app.use(courseRepRouter);
// app.use(studentRouter);
// app.use(questRouter);
// app.use(wellnessRouter);

app.use("*", (req, res) => {
    res.status(404).json({ error: "No Page" });
  });


sequelize
  .sync({ alter: true }) // WARNING: This will drop and recreate all tables
  .then(() => {
    console.log('Database & tables created/updated!');
  })
  .catch(err => console.log('Error syncing database:', err));

 const PORT = process.env.PORT || 5005;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
  
