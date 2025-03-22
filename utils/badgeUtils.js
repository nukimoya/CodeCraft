const Badge = require('../model/badge');
const UserBadge = require('../model/userBadge');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

const checkAndAwardBadges = async (userId, currentXp) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Find badges that the user qualifies for based on XP
    const eligibleBadges = await Badge.findAll({
      where: {
        xp_threshold: { [Op.lte]: currentXp }
      },
      transaction
    });
    
    // Find badges the user already has
    const userBadges = await UserBadge.findAll({
      where: { user_id: userId },
      attributes: ['badge_id'],
      transaction
    });
    
    const existingBadgeIds = userBadges.map(ub => ub.badge_id);
    
    // Filter out badges the user already has
    const newBadges = eligibleBadges.filter(
      badge => !existingBadgeIds.includes(badge.badge_id)
    );
    
    // Award new badges
    if (newBadges.length > 0) {
      await Promise.all(
        newBadges.map(badge => 
          UserBadge.create({
            user_id: userId,
            badge_id: badge.badge_id,
            earned_at: new Date()
          }, { transaction })
        )
      );
    }
    
    await transaction.commit();
    return newBadges;
  } catch (error) {
    await transaction.rollback();
    console.error('Error checking badges:', error);
    return [];
  }
};

module.exports = { checkAndAwardBadges }; 