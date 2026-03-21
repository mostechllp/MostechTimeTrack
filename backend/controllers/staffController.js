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


// @desc    Punch out
// @route   POST /api/staff/punch-out
const punchOut = async (req, res) => {
  try {
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const session = hours < 13 ? "morningSession" : "afternoonSession";

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);


    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (!attendance) {
      return res.status(404).json({ message: "No punch in found" });
    }

    // Set punch out time
    if (session === "morningSession") {
      attendance.morningSession.punchOut = now;
      // determine isPresent based on full session completion
    } else {
      attendance.afternoonSession.punchOut = now;
    }

    // Calculate session durations
    const morningDuration = attendance.morningSession.punchIn && attendance.morningSession.punchOut
      ? (attendance.morningSession.punchOut - attendance.morningSession.punchIn) / (1000 * 60 * 60)
      : 0;
      
    const afternoonDuration = attendance.afternoonSession.punchIn && attendance.afternoonSession.punchOut
      ? (attendance.afternoonSession.punchOut - attendance.afternoonSession.punchIn) / (1000 * 60 * 60)
      : 0;

    // Check if sessions are fully completed (within reasonable threshold)
    const FULL_MORNING_HOURS = 4; // 9 AM to 1 PM is 4 hours
    const FULL_AFTERNOON_HOURS = 4; // 2 PM to 6 PM is 4 hours
    const THRESHOLD = 0.5; // 30 minutes threshold for considering a session complete

    // Determine if morning session is fully completed (worked close to 4 hours)
    const isMorningComplete = morningDuration >= (FULL_MORNING_HOURS - THRESHOLD);
    
    // Determine if afternoon session is fully completed (worked close to 4 hours)
    const isAfternoonComplete = afternoonDuration >= (FULL_AFTERNOON_HOURS - THRESHOLD);

    // Set isPresent flags based on full session completion
    attendance.morningSession.isPresent = isMorningComplete;
    attendance.afternoonSession.isPresent = isAfternoonComplete;

    // Calculate total worked hours (actual hours, regardless of status)
    attendance.totalWorkedHours = morningDuration + afternoonDuration;

    // Determine status based on business rules
    if (day === 6) { // Saturday
      // On Saturday, full morning session (4 hours) = present
      attendance.status = isMorningComplete ? "present" : "absent";
    } else { // Weekday
      if (isMorningComplete && isAfternoonComplete) {
        attendance.status = "present"; // Worked both full sessions
      } else if (isMorningComplete || isAfternoonComplete) {
        attendance.status = "half-day"; // Worked one full session
      } else {
        attendance.status = "absent"; // Didn't complete any full session
      }
    }

    await attendance.save();
    
    // Calculate current work duration
    const currentWorkSeconds = calculateCurrentWorkDuration(attendance);

    res.json({ 
      success: true, 
      attendance: {
        ...attendance.toObject(),
        currentWorkSeconds,
        isOnBreak: false,
        activeSession: null,
        serverTime: new Date().toISOString(),
        displayInfo: {
          morningDuration: morningDuration.toFixed(2),
          afternoonDuration: afternoonDuration.toFixed(2),
          isMorningComplete,
          isAfternoonComplete
        }
      }
    });
  } catch (error) {
    console.error("Error in punchOut:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Take break
// @route   POST /api/staff/break
const takeBreak = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (!attendance) {
      return res.status(404).json({ message: "No active session" });
    }

    attendance.breaks.push({
      breakStart: now,
    });

    await attendance.save();

    // Calculate current work duration after break
    const currentWorkSeconds = calculateCurrentWorkDuration(attendance);

    res.json({
      success: true,
      attendance: {
        ...attendance.toObject(),
        currentWorkSeconds,
        isOnBreak: true,
        activeSession:
          attendance.morningSession?.punchIn &&
          !attendance.morningSession?.punchOut
            ? "morning"
            : attendance.afternoonSession?.punchIn &&
                !attendance.afternoonSession?.punchOut
              ? "afternoon"
              : null,
        serverTime: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in takeBreak:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Resume from break
// @route   POST /api/staff/resume
const resumeWork = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (!attendance) {
      return res.status(404).json({ message: "No active session" });
    }

    const lastBreak = attendance.breaks[attendance.breaks.length - 1];
    if (lastBreak && !lastBreak.breakEnd) {
      lastBreak.breakEnd = now;
      lastBreak.duration = (now - lastBreak.breakStart) / (1000 * 60);
    }

    await attendance.save();

    // Calculate current work duration after resuming
    const currentWorkSeconds = calculateCurrentWorkDuration(attendance);

    res.json({
      success: true,
      attendance: {
        ...attendance.toObject(),
        currentWorkSeconds,
        isOnBreak: false,
        activeSession:
          attendance.morningSession?.punchIn &&
          !attendance.morningSession?.punchOut
            ? "morning"
            : attendance.afternoonSession?.punchIn &&
                !attendance.afternoonSession?.punchOut
              ? "afternoon"
              : null,
        serverTime: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in resumeWork:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get today's attendance
// @route   GET /api/staff/today
const getTodayAttendance = async (req, res) => {
  try {
    const now = new Date();
    const day = now.getDay();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    let attendance = await Attendance.findOne({
      userId: req.user._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (!attendance) {
      return res.json({
        hasAttendance: false,
        message: "No attendance record for today",
      });
    }

    // Calculate current work duration
    const currentWorkSeconds = calculateCurrentWorkDuration(attendance);
    
    // Calculate session durations for display
    const morningDuration = attendance.morningSession?.punchIn 
      ? (new Date() - new Date(attendance.morningSession.punchIn)) / (1000 * 60 * 60)
      : 0;
      
    const afternoonDuration = attendance.afternoonSession?.punchIn
      ? (new Date() - new Date(attendance.afternoonSession.punchIn)) / (1000 * 60 * 60)
      : 0;

    // Check if on break
    const isOnBreak = attendance.breaks?.some((b) => !b.breakEnd) || false;

    // Determine active session
    let activeSession = null;
    if (attendance.morningSession?.punchIn && !attendance.morningSession?.punchOut) {
      activeSession = "morning";
    } else if (attendance.afternoonSession?.punchIn && !attendance.afternoonSession?.punchOut) {
      activeSession = "afternoon";
    }

    res.json({
      hasAttendance: true,
      attendance: {
        ...attendance.toObject(),
        currentWorkSeconds,
        isOnBreak,
        activeSession,
        serverTime: now.toISOString(),
        displayInfo: {
          morningDuration: morningDuration.toFixed(2),
          afternoonDuration: afternoonDuration.toFixed(2)
        }
      },
    });
  } catch (error) {
    console.error("Error in getTodayAttendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Punch in
// @route   POST /api/staff/punch-in
const punchIn = async (req, res) => {
  try {
    const now = new Date();
    console.log("Punch in attempt at:", now.toLocaleString());

    // Create copies for date ranges
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Find existing attendance for today
    let attendance = await Attendance.findOne({
      userId: req.user._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    const hours = now.getHours();
    const session = hours < 13 ? "morningSession" : "afternoonSession";

    if (!attendance) {
      attendance = new Attendance({
        userId: req.user._id,
        date: startOfDay,
        [session]: {
          punchIn: now,
          isPresent: false,
        },
      });
    } else {
      attendance[session].punchIn = now;
    }

    await attendance.save();
    
    // Calculate current work duration
    const currentWorkSeconds = calculateCurrentWorkDuration(attendance);

    res.json({
      success: true,
      attendance: {
        ...attendance.toObject(),
        currentWorkSeconds,
        isOnBreak: false,
        activeSession: session === "morningSession" ? "morning" : "afternoon",
        serverTime: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in punchIn:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update the calculateCurrentWorkDuration function to handle negative values
const calculateCurrentWorkDuration = (attendance) => {
  if (!attendance) return 0;

  const now = new Date();
  let totalWorkMs = 0;

  // Add morning session time
  if (attendance.morningSession?.punchIn) {
    const punchIn = new Date(attendance.morningSession.punchIn);
    // Only calculate if punchIn is not in the future
    if (punchIn <= now) {
      const morningEnd = attendance.morningSession.punchOut
        ? new Date(attendance.morningSession.punchOut)
        : now;
      totalWorkMs += morningEnd - punchIn;
    }
  }

  // Add afternoon session time
  if (attendance.afternoonSession?.punchIn) {
    const punchIn = new Date(attendance.afternoonSession.punchIn);
    if (punchIn <= now) {
      const afternoonEnd = attendance.afternoonSession.punchOut
        ? new Date(attendance.afternoonSession.punchOut)
        : now;
      totalWorkMs += afternoonEnd - punchIn;
    }
  }

  // Subtract break times
  if (attendance.breaks && attendance.breaks.length > 0) {
    attendance.breaks.forEach((breakPeriod) => {
      const breakStart = new Date(breakPeriod.breakStart);
      if (breakPeriod.breakEnd) {
        const breakEnd = new Date(breakPeriod.breakEnd);
        totalWorkMs -= breakEnd - breakStart;
      } else {
        // Ongoing break
        totalWorkMs -= now - breakStart;
      }
    });
  }

  // Ensure we don't return negative values
  const seconds = Math.max(0, Math.floor(totalWorkMs / 1000));

  return seconds;
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
