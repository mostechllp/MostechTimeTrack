const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Attendance = require('./models/Attendance');
const User = require('./models/User');

dotenv.config();

const fixCurrentAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: 'fidha@mostech.ae' });
    if (!user) {
      console.log('User not found');
      return;
    }

    // Find today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({
      userId: user._id,
      date: { $gte: today }
    });

    if (!attendance) {
      console.log('No attendance record for today');
      return;
    }

    console.log('Current attendance:', {
      date: attendance.date.toLocaleString(),
      morningPunchIn: attendance.morningSession?.punchIn?.toLocaleString()
    });

    // Fix: Set the punch-in time to current time
    const now = new Date();
    now.setHours(11, 58, 0); // Set to 11:58 AM since that's when you punched in
    
    attendance.morningSession.punchIn = now;
    attendance.date = now; // Also update the main date field
    
    await attendance.save();
    
    console.log('✅ Fixed attendance. New punch-in time:', now.toLocaleString());

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
};

fixCurrentAttendance();