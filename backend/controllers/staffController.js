const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const User = require("../models/User");

const { cloudinary, leaveStorage } = require('../config/cloudinary');
const multer = require('multer');

// Configure multer with Cloudinary storage
const upload = multer({ 
  storage: leaveStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});


// @desc    Punch in
// @route   POST /api/staff/punch-in
const punchIn = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    let attendance = await Attendance.findOne({
      userId: req.user._id,
      date: startOfDay
    });

    if (!attendance) {
      attendance = new Attendance({
        userId: req.user._id,
        date: startOfDay,
        punchIn: now
      });
    } else if (!attendance.punchIn) {
      attendance.punchIn = now;
    } else {
      return res.status(400).json({ message: 'Already punched in today' });
    }

    await attendance.save();
    
    res.json({ 
      success: true, 
      attendance: {
        ...attendance.toObject(),
        activeSession: true,
        currentWorkSeconds: 0
      }
    });
  } catch (error) {
    console.error('Error in punchIn:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Punch out
// @route   POST /api/staff/punch-out
const punchOut = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: startOfDay
    });

    if (!attendance || !attendance.punchIn) {
      return res.status(404).json({ message: 'No punch in found' });
    }

    if (attendance.punchOut) {
      return res.status(400).json({ message: 'Already punched out today' });
    }

    attendance.punchOut = now;
    await attendance.save();
    
    res.json({ 
      success: true, 
      attendance: {
        ...attendance.toObject(),
        activeSession: false,
        currentWorkSeconds: 0
      }
    });
  } catch (error) {
    console.error('Error in punchOut:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Take break
// @route   POST /api/staff/break
const takeBreak = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: startOfDay
    });

    if (!attendance || !attendance.punchIn) {
      return res.status(404).json({ message: 'No active session' });
    }

    // Check if already on break
    const lastBreak = attendance.breaks[attendance.breaks.length - 1];
    if (lastBreak && !lastBreak.breakEnd) {
      return res.status(400).json({ message: 'Already on break' });
    }

    attendance.breaks.push({ breakStart: now });
    await attendance.save();

    // Calculate current work seconds after break
    let totalMs = now - attendance.punchIn;
    if (attendance.breaks && attendance.breaks.length > 0) {
      attendance.breaks.forEach(breakPeriod => {
        if (breakPeriod.breakEnd) {
          totalMs -= (breakPeriod.breakEnd - breakPeriod.breakStart);
        } else {
          totalMs -= (now - breakPeriod.breakStart);
        }
      });
    }
    const currentWorkSeconds = Math.max(0, Math.floor(totalMs / 1000));

    res.json({ 
      success: true, 
      attendance: {
        ...attendance.toObject(),
        currentWorkSeconds,
        isActive: true,
        isOnBreak: true,
        activeBreakStart: now
      }
    });
  } catch (error) {
    console.error('Error in takeBreak:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Resume work
// @route   POST /api/staff/resume
const resumeWork = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: startOfDay
    });

    if (!attendance || !attendance.punchIn) {
      return res.status(404).json({ message: 'No active session' });
    }

    const lastBreak = attendance.breaks[attendance.breaks.length - 1];
    if (!lastBreak || lastBreak.breakEnd) {
      return res.status(400).json({ message: 'Not on break' });
    }

    lastBreak.breakEnd = now;
    lastBreak.duration = (now - lastBreak.breakStart) / (1000 * 60);
    await attendance.save();

    // Calculate current work seconds after resuming
    let totalMs = now - attendance.punchIn;
    if (attendance.breaks && attendance.breaks.length > 0) {
      attendance.breaks.forEach(breakPeriod => {
        if (breakPeriod.breakEnd) {
          totalMs -= (breakPeriod.breakEnd - breakPeriod.breakStart);
        }
      });
    }
    const currentWorkSeconds = Math.max(0, Math.floor(totalMs / 1000));

    res.json({ 
      success: true, 
      attendance: {
        ...attendance.toObject(),
        currentWorkSeconds,
        isActive: true,
        isOnBreak: false
      }
    });
  } catch (error) {
    console.error('Error in resumeWork:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get today's attendance
// @route   GET /api/staff/today
const getTodayAttendance = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    let attendance = await Attendance.findOne({
      userId: req.user._id,
      date: startOfDay
    });

    if (!attendance) {
      return res.json({
        hasAttendance: false,
        message: 'No attendance record for today'
      });
    }

    // Calculate current worked seconds (for active sessions)
    let currentWorkSeconds = 0;
    let isActive = false;
    let isOnBreak = false;
    let activeBreakStart = null;
    
    if (attendance.punchIn && !attendance.punchOut) {
      isActive = true;
      let totalMs = now - attendance.punchIn;
      
      // Subtract break times
      if (attendance.breaks && attendance.breaks.length > 0) {
        attendance.breaks.forEach(breakPeriod => {
          if (breakPeriod.breakEnd) {
            totalMs -= (breakPeriod.breakEnd - breakPeriod.breakStart);
          } else {
            isOnBreak = true;
            activeBreakStart = breakPeriod.breakStart;
            totalMs -= (now - breakPeriod.breakStart);
          }
        });
      }
      currentWorkSeconds = Math.max(0, Math.floor(totalMs / 1000));
    }

    // Calculate total worked hours for completed sessions
    let totalWorkedHours = attendance.totalWorkedHours;
    if (attendance.punchIn && attendance.punchOut) {
      totalWorkedHours = attendance.totalWorkedHours;
    }

    const response = {
      hasAttendance: true,
      attendance: {
        _id: attendance._id,
        userId: attendance.userId,
        date: attendance.date,
        punchIn: attendance.punchIn,
        punchOut: attendance.punchOut,
        totalWorkedHours: totalWorkedHours,
        overtimeHours: attendance.overtimeHours || 0,
        status: attendance.status,
        breaks: attendance.breaks || [],
        currentWorkSeconds: currentWorkSeconds,
        isActive: isActive,
        isOnBreak: isOnBreak,
        activeBreakStart: activeBreakStart
      }
    };
    
    console.log('Attendance data:', {
      punchIn: attendance.punchIn,
      punchOut: attendance.punchOut,
      currentWorkSeconds,
      isActive,
      isOnBreak
    });
    
    res.json(response);
  } catch (error) {
    console.error('Error in getTodayAttendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Request leave
// @route   POST /api/staff/leave
const requestLeave = async (req, res) => {
  try {
    const { date, reason, leaveId } = req.body;
    
    // Check if leaveId already exists
    const existingLeave = await Leave.findOne({ leaveId });
    if (existingLeave) {
      return res.status(400).json({ message: 'Leave ID already exists. Please try again.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Email screenshot is required' });
    }

    const cloudinaryResult = req.file;
    
    const leave = new Leave({
      userId: req.user._id,
      leaveId, // Save the unique ID
      date,
      reason,
      emailScreenshot: cloudinaryResult.path,
      cloudinaryPublicId: cloudinaryResult.filename,
      status: 'pending'
    });

    await leave.save();
    await leave.populate('userId', 'email firstName lastName');

    res.status(201).json({ 
      success: true, 
      message: 'Leave request submitted successfully',
      leave 
    });

  } catch (error) {
    console.error('Error in requestLeave:', error);
    
    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (deleteError) {
        console.error('Error deleting uploaded file:', deleteError);
      }
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Cancel leave request (deletes image from Cloudinary)
// @route   DELETE /api/staff/leave/:id
const cancelLeaveRequest = async (req, res) => {
  try {
    const leave = await Leave.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Only allow cancellation of pending requests
    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot cancel a processed leave request' });
    }

    // Delete image from Cloudinary
    if (leave.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(leave.cloudinaryPublicId);
    }

    // Delete the leave request
    await leave.deleteOne();

    res.json({ 
      success: true, 
      message: 'Leave request cancelled successfully' 
    });

  } catch (error) {
    console.error('Error in cancelLeaveRequest:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's leaves
// @route   GET /api/staff/leaves
const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ userId: req.user._id })
      .sort({ date: -1 })
      .select('-cloudinaryPublicId'); // Don't send public ID to frontend
    
    res.json(leaves);
  } catch (error) {
    console.error('Error in getMyLeaves:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update profile
// @route   PUT /api/staff/profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const user = await User.findById(req.user._id);

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    if (req.file) {
      // If using Cloudinary, req.file.path contains the URL
      user.profileImage = req.file.path;
    }

    await user.save();

    // Return the updated user data (excluding password)
    res.json({ 
      success: true, 
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        role: user.role,
        isFirstLogin: user.isFirstLogin
      }
    });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
module.exports = {
  punchIn,
  punchOut,
  takeBreak,
  resumeWork,
  getTodayAttendance,
  requestLeave,
  getMyLeaves,
  updateProfile,
  cancelLeaveRequest
};
