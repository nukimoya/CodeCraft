// utils.js
const generateJoinCode = () => {
    try {
        return Math.random().toString(36).substring(2, 7).toUpperCase(); 
    } catch (error) {
        console.error('Error generating join code:', error);
        return null;
    }
};

module.exports = { generateJoinCode };