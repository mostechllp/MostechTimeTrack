const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://mos-time-tracker:LKIHkdJ8wqaHBXYJ@mos-time-tracker.5x0tevd.mongodb.net/?appName=mos-time-tracker');
    console.log('Connected to MongoDB');

    // Admin details
    const adminData = {
      email: 'hr@mostech.ae',
      password: 'MoS@2026#', 
      firstName: 'Mostech',
      lastName: 'Solutions',
      role: 'admin',
      isFirstLogin: false
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('Admin already exists!');
      process.exit(0);
    }

    // Create new admin (password will be hashed by the pre-save middleware)
    const admin = new User(adminData);
    await admin.save();

    console.log('Admin created successfully!');
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();