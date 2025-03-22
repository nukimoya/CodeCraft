const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");
const User = require("./user");
const Badge = require("./badge");

const UserBadge = sequelize.define("UserBadge", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  badge_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Badge,
      key: 'badge_id'
    }
  },
  earned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  timestamps: true,
  tableName: "UserBadges"
});

// Define associations
UserBadge.belongsTo(User, { foreignKey: 'user_id' });
UserBadge.belongsTo(Badge, { foreignKey: 'badge_id' });
User.hasMany(UserBadge, { foreignKey: 'user_id' });
Badge.hasMany(UserBadge, { foreignKey: 'badge_id' });

module.exports = UserBadge; 