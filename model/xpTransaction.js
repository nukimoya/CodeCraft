const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");
const User = require("./user");

const XpTransaction = sequelize.define("XpTransaction", {
  transaction_id: {
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
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  activity_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  timestamps: true,
  tableName: "XpTransactions"
});

// Define association
XpTransaction.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(XpTransaction, { foreignKey: 'user_id' });

module.exports = XpTransaction; 