const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");

const User = sequelize.define("User", {
  user_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  Username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  Email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  Password: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  Role: {
    type: DataTypes.ENUM("Learner", "Admin"),
    defaultValue: "Learner",
  },
  Level: {
    type: DataTypes.ENUM("Beginner", "Intermediate", "Advanced"),
    defaultValue: "Beginner",
  },
  CreatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  UpdatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  
  AvatarURL: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  last_active_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  current_streak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  highest_streak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  total_active_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  xp: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
}, {
  timestamps: true,  // Automatically adds `createdAt` and `updatedAt`
  tableName: "Users", // Explicitly define table name
});

module.exports = User;
