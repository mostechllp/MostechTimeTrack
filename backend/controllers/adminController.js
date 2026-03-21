const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const sendEmail = require('../utils/emailService');
const bcrypt = require('bcryptjs');

// @desc    Create staff user
// @route   POST /api/admin/create-staff
// @desc    Create staff user
// @route   POST /api/admin/create-staff
const createStaff = async (req, res) => {
  try {
    const { email, firstName, lastName, joiningDate } = req.body;


    // Check if user already exists BEFORE doing anything else
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);

     let parsedJoiningDate;
    if (joiningDate) {
      parsedJoiningDate = new Date(joiningDate);
      // Set to start of day for consistency
      parsedJoiningDate.setHours(0, 0, 0, 0);
    } else {
      parsedJoiningDate = new Date();
      parsedJoiningDate.setHours(0, 0, 0, 0);
    }

    const user = new User({
      email,
      firstName,
      lastName,
      password: tempPassword,
      role: 'staff',
      isFirstLogin: true,
       joiningDate: parsedJoiningDate
    });

    await user.save();


    // Send email with credentials
    let emailSent = false;
    try {
      
      await sendEmail({
        email: user.email,
        subject: 'Your Mostech Business Solutions Account Credentials',
        html: `
          <h2>Welcome to Mostech Business Solutions</h2>
          <p>Your account has been created. Here are your login credentials:</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          <p><strong>Joining Date:</strong> ${user.joiningDate.toLocaleDateString()}</p>
          <p>Please login and change your password immediately.</p>
          <a href="${process.env.FRONTEND_URL}/login">Login Here</a>
        `
      });
      
      emailSent = true;
      
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't throw here - we still want to return success for user creation
    }

    // Return success response
    return res.status(201).json({ 
      message: emailSent 
        ? 'Staff created successfully. Credentials sent to email.' 
        : 'Staff created successfully but email could not be sent. Please contact admin.',
      user: { 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName ,
        joiningDate: user.joiningDate
      },
      tempPassword: !emailSent ? tempPassword : undefined // Only send password if email failed
    });

  } catch (error) {
    console.error('Server error in createStaff:', error);
    
    // Check if this is a duplicate key error (race condition)
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'User already exists (race condition)',
        error: 'duplicate'
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};
// @desc    Get all staff
// @route   GET /api/admin/staff
const getAllStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).select('-password');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get monthly attendance report (using aggregation)
// @route   GET /api/admin/reports/monthly
// @desc    Get monthly attendance report
// @route   GET /api/admin/reports/monthly
const getMonthlyReport = async (req, res) => {
  try {
    const { month, year, staffId } = req.query;
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Create date range
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    console.log('Fetching report for:', { month, year, staffId });
    console.log('Current time:', now.toLocaleString());
    console.log('Current hour:', currentHour);
    console.log('Current day:', currentDay);

    // Build query
    const query = {
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    if (staffId && staffId !== 'all') {
      query.userId = staffId;
    }

    // Get all attendance records
    const attendance = await Attendance.find(query)
      .populate({
        path: 'userId',
        select: 'email firstName lastName',
        match: { role: 'staff' }
      })
      .sort({ date: 1, 'userId.firstName': 1 });

    // Filter out records where userId is null
    let validAttendance = attendance.filter(record => record.userId !== null);

    // Apply cutoff logic for today's records
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    validAttendance = validAttendance.map(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      
      // Check if this is today's record
      if (recordDate.getTime() === today.getTime()) {
        const recordCopy = record.toObject();
        
        // Determine if day is complete based on day type and current time
        const isDayComplete = isDayCompleteCheck(now, currentDay, currentHour);
        
        if (!isDayComplete) {
          // Day is not complete - mark as "incomplete" or filter out
          // Option 1: Filter out completely (recommended)
          return null;
          
          // Option 2: Mark as incomplete but still show with note
          // recordCopy.status = 'in-progress';
          // recordCopy.totalWorkedHours = 'In Progress';
          // return recordCopy;
        }
        
        return record;
      }
      
      return record;
    }).filter(record => record !== null); // Remove null entries (incomplete days)

    // Group by user and date to remove duplicates
    const uniqueRecords = [];
    const seen = new Set();

    validAttendance.forEach(record => {
      const dateStr = record.date.toISOString().split('T')[0];
      const key = `${record.userId._id}-${dateStr}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecords.push(record);
      }
    });

    console.log(`Returning ${uniqueRecords.length} completed day records`);
    res.json(uniqueRecords);
    
  } catch (error) {
    console.error('Error in getMonthlyReport:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to check if a day is complete
const isDayCompleteCheck = (now, day, hour) => {
  // Sunday
  if (day === 0) return true; // Full day is complete (no work)
  
  // Saturday - day ends at 1 PM
  if (day === 6) {
    return hour >= 13; // Complete after 1 PM
  }
  
  // Weekday - day ends at 6 PM
  return hour >= 18; // Complete after 6 PM
};


// @desc    Get all leave requests
// @route   GET /api/admin/leaves
const getLeaveRequests = async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate('userId', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .select('-cloudinaryPublicId'); // Don't send public ID
    
    res.json(leaves);
  } catch (error) {
    console.error('Error in getLeaveRequests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update leave status
// @route   PUT /api/admin/leaves/:id
const updateLeaveStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const leave = await Leave.findById(req.params.id).populate('userId');

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Store old status and public ID for potential rollback
    const oldStatus = leave.status;
    const oldPublicId = leave.cloudinaryPublicId;

    leave.status = status;
    if (status === 'rejected') {
      leave.rejectionReason = rejectionReason;
    }
    await leave.save();

    // If rejected, we might want to keep the image for records
    // If approved, we keep it
    // You can add logic here to delete rejected images after some time

    // Send email notification
    const emailSubject = status === 'approved' 
      ? 'Leave Request Approved' 
      : 'Leave Request Rejected';
    
    const emailHtml = status === 'approved' ? `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #020c4c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .approved { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; }
          .screenshot-link { margin-top: 15px; }
          .screenshot-link a { color: #020c4c; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Leave Request Approved</h1>
          </div>
          <div class="content">
            <div class="approved">
              <p>Your leave request for <strong>${new Date(leave.date).toLocaleDateString()}</strong> has been <strong>APPROVED</strong>.</p>
            </div>
            <div class="screenshot-link">
              <p>Your uploaded screenshot: <a href="${leave.emailScreenshot}" target="_blank">View Image</a></p>
            </div>
            <p>Have a great time off!</p>
            <p>Best regards,<br>Mostech Business Solutions Team</p>
          </div>
        </div>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #020c4c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .rejected { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Leave Request Rejected</h1>
          </div>
          <div class="content">
            <div class="rejected">
              <p>Your leave request for <strong>${new Date(leave.date).toLocaleDateString()}</strong> has been <strong>REJECTED</strong>.</p>
              ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
            </div>
            <p>Please contact your manager if you have any questions.</p>
            <p>Best regards,<br>Mostech Business Solutions Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      email: leave.userId.email,
      subject: emailSubject,
      html: emailHtml
    });

    // Remove sensitive data before sending response
    const leaveResponse = leave.toObject();
    delete leaveResponse.cloudinaryPublicId;

    res.json({ 
      success: true, 
      message: `Leave request ${status}`,
      leave: leaveResponse 
    });

  } catch (error) {
    console.error('Error in updateLeaveStatus:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete old rejected leaves (cron job - optional)
// @route   DELETE /api/admin/leaves/cleanup
const cleanupOldRejectedLeaves = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find rejected leaves older than 30 days
    const oldLeaves = await Leave.find({
      status: 'rejected',
      createdAt: { $lt: thirtyDaysAgo }
    });

    // Delete images from Cloudinary
    for (const leave of oldLeaves) {
      if (leave.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(leave.cloudinaryPublicId);
      }
    }

    // Delete records from database
    const result = await Leave.deleteMany({
      status: 'rejected',
      createdAt: { $lt: thirtyDaysAgo }
    });

    res.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} old rejected leaves` 
    });

  } catch (error) {
    console.error('Error in cleanupOldRejectedLeaves:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    // Get total staff count
    const totalStaff = await User.countDocuments({ role: 'staff' });
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get present today count (staff who have punched in today)
    const presentToday = await Attendance.distinct('userId', {
      date: {
        $gte: today,
        $lt: tomorrow
      },
      status: { $in: ['present', 'half-day'] }
    });
    
    // Get pending leave requests count
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    
    // Get recent activity (last 5 attendance records)
    const recentActivity = await Attendance.find()
      .populate('userId', 'firstName lastName email')
      .sort({ date: -1 })
      .limit(5)
      .select('userId date status totalWorkedHours');
    
    // Get leave requests summary
    const leaveSummary = await Leave.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format leave summary
    const leaveStats = {
      pending: 0,
      approved: 0,
      rejected: 0
    };
    
    leaveSummary.forEach(item => {
      leaveStats[item._id] = item.count;
    });
    
    res.json({
      totalStaff,
      presentToday: presentToday.length,
      pendingLeaves,
      leaveStats,
      recentActivity
    });
    
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get attendance summary for chart
// @route   GET /api/admin/dashboard/attendance-summary
const getAttendanceSummary = async (req, res) => {
  try {
    const { days = 7 } = req.query; // Default to last 7 days
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const attendance = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);
    
    // Format for chart
    const dates = [...new Set(attendance.map(a => a._id.date))].sort();
    
    const summary = dates.map(date => {
      const dayData = {
        date,
        present: 0,
        absent: 0,
        'half-day': 0
      };
      
      attendance
        .filter(a => a._id.date === date)
        .forEach(a => {
          dayData[a._id.status] = a.count;
        });
      
      return dayData;
    });
    
    res.json(summary);
    
  } catch (error) {
    console.error('Error getting attendance summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get live attendance for today
// @route   GET /api/admin/reports/live
const getLiveAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('userId', 'email firstName lastName')
    .sort({ 'userId.firstName': 1 });

    // Calculate current status for each record
    const now = new Date();
    const liveData = attendance.map(record => {
      const recordObj = record.toObject();
      
      // Calculate if still in session
      const morningActive = record.morningSession?.punchIn && !record.morningSession?.punchOut;
      const afternoonActive = record.afternoonSession?.punchIn && !record.afternoonSession?.punchOut;
      
      return {
        ...recordObj,
        isActive: morningActive || afternoonActive,
        activeSession: morningActive ? 'morning' : afternoonActive ? 'afternoon' : null
      };
    });

    res.json({
      date: today.toLocaleDateString(),
      records: liveData,
      isComplete: isDayCompleteCheck(now, now.getDay(), now.getHours())
    });
  } catch (error) {
    console.error('Error in getLiveAttendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createStaff,
  getAllStaff,
  getMonthlyReport,
  getLeaveRequests,
  updateLeaveStatus,
  getDashboardStats,  
  getAttendanceSummary,
  cleanupOldRejectedLeaves,
  getLiveAttendance
};