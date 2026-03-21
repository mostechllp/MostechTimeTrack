const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage for leave request screenshots
const leaveStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mostech/leave-requests',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }], // Limit image size
    public_id: (req, file) => {
      // Create a unique filename: userId_timestamp
      const userId = req.user._id;
      const timestamp = Date.now();
      return `leave-${userId}-${timestamp}`;
    }
  }
});

// Configure storage for profile images (if you want to use Cloudinary for profiles too)
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mostech/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 300, height: 300, crop: 'limit' }],
    public_id: (req, file) => {
      const userId = req.user._id;
      return `profile-${userId}`;
    }
  }
});

module.exports = {
  cloudinary,
  leaveStorage,
  profileStorage
};