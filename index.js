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
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Setup associations
setupAssociations();

app.use(morgan('combined'));
app.use("/", router);

app.get("/test", (req, res) => {
  res.status(200);
  console.log("Working fine")
})

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
  

