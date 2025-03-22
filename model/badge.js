const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");

const Badge = sequelize.define("Badge", {
  badge_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  xp_threshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  badge_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  }
}, {
  timestamps: true,
  tableName: "Badges"
});

module.exports = Badge; 