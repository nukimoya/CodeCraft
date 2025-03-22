const { Op } = require('sequelize');
const User = require('../model/user');

const updateStreak = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Use UTC dates to avoid timezone issues
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const userLastActiveDate = user.last_active_date
    ? new Date(Date.UTC(
        new Date(user.last_active_date).getUTCFullYear(),
        new Date(user.last_active_date).getUTCMonth(),
        new Date(user.last_active_date).getUTCDate()
      ))
    : null;

  // Convert dates to ISO strings for comparison
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const lastActiveDateStr = userLastActiveDate?.toISOString().split('T')[0];

  console.log('Today (UTC):', todayStr);
  console.log('Yesterday (UTC):', yesterdayStr);
  console.log('Last Active Date (UTC):', lastActiveDateStr);

  // Skip if already logged in today
  if (lastActiveDateStr === todayStr) {
    console.log('User already active today. No streak update needed.');
    return user;
  }

  // Update streak logic
  if (!lastActiveDateStr) {
    console.log('First activity detected.');
    user.current_streak = 1;
    user.highest_streak = 1;
    user.total_active_days = 1;
  } else if (lastActiveDateStr === yesterdayStr) {
    console.log('User was active yesterday. Incrementing streak.');
    user.current_streak += 1;
    user.highest_streak = Math.max(user.current_streak, user.highest_streak);
    user.total_active_days += 1;
  } else {
    console.log('Break in streak detected. Resetting to 1.');
    user.current_streak = 1;
    user.total_active_days += 1;
  }

  user.last_active_date = todayStr;
  await user.save();

  return user;
};

module.exports = { updateStreak };