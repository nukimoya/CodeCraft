const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Add timeout and connection options
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 60000, // Increase timeout to 60 seconds
  secure: true // Use HTTPS
});

// Add connection test
const testConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('Cloudinary connection successful:', result);
    return true;
  } catch (error) {
    console.error('Cloudinary connection failed:', error);
    return false;
  }
};

// Test connection on startup
testConnection();

module.exports = cloudinary;
