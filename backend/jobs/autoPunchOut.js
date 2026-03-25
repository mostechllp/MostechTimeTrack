const cron = require('node-cron');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Auto punch-out for missed punches (runs at 12:05 AM daily)
const scheduleAutoPunchOut = () => {
  // Run at 12:05 AM every day
  cron.schedule('5 0 * * *', async () => {
    console.log('Running auto punch-out job...', new Date().toLocaleString());
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find all attendance records from yesterday that have punch-in but no punch-out
      const pendingPunchOuts = await Attendance.find({
        date: {
          $gte: yesterday,
          $lt: today
        },
        punchIn: { $ne: null },
        punchOut: null
      }).populate('userId', 'firstName lastName email');
      
      console.log(`Found ${pendingPunchOuts.length} records without punch out`);
      
      let autoPunchedCount = 0;
      
      for (const attendance of pendingPunchOuts) {
        // Set punch out time to 11:59 PM of that day
        const autoPunchOutTime = new Date(attendance.date);
        autoPunchOutTime.setHours(23, 59, 59, 999);
        
        attendance.punchOut = autoPunchOutTime;
        
        // Calculate total worked hours
        let totalWorkedMs = autoPunchOutTime - attendance.punchIn;
        
        // Subtract break times
        if (attendance.breaks && attendance.breaks.length > 0) {
          attendance.breaks.forEach(breakPeriod => {
            if (breakPeriod.breakEnd) {
              totalWorkedMs -= (breakPeriod.breakEnd - breakPeriod.breakStart);
            }
          });
        }
        
        const totalWorkedHours = totalWorkedMs / (1000 * 60 * 60);
        attendance.totalWorkedHours = parseFloat(totalWorkedHours.toFixed(2));
        
        // Calculate overtime
        if (totalWorkedHours > 9) {
          attendance.overtimeHours = parseFloat((totalWorkedHours - 9).toFixed(2));
        }
        
        // Determine status
        if (totalWorkedHours >= 4) {
          attendance.status = "present";
        } else if (totalWorkedHours > 0) {
          attendance.status = "half-day";
        } else {
          attendance.status = "absent";
        }
        
        await attendance.save();
        autoPunchedCount++;
        
        console.log(`Auto punched out for user: ${attendance.userId?.email} - Worked: ${totalWorkedHours.toFixed(2)} hrs`);
      }
      
      console.log(`Auto punch-out completed. Processed ${autoPunchedCount} records.`);
      
      // Optional: Send email notifications to users who were auto-punched out
      if (autoPunchedCount > 0) {
        const sendEmail = require('../utils/emailService');
        const admins = await User.find({ role: 'admin' });
        
        for (const admin of admins) {
          await sendEmail({
            email: admin.email,
            subject: `Auto Punch-Out Notification - ${new Date().toLocaleDateString()}`,
            html: `
              <h3>Auto Punch-Out Summary</h3>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Records Auto-Punched:</strong> ${autoPunchedCount}</p>
              <p>The following staff members had their attendance automatically punched out at 11:59 PM:</p>
              <ul>
                ${pendingPunchOuts.map(record => `
                  <li>${record.userId?.firstName} ${record.userId?.lastName} (${record.userId?.email}) - Worked: ${(record.totalWorkedHours || 0).toFixed(2)} hrs</li>
                `).join('')}
              </ul>
              <p>Please review these records for accuracy.</p>
            `
          });
        }
      }
      
    } catch (error) {
      console.error('Error in auto punch-out job:', error);
    }
  });
  
  console.log('Auto punch-out scheduler started - runs daily at 12:05 AM');
};

// Also run at 11:55 PM to catch any active sessions 
const schedulePreMidnightCheck = () => {
  cron.schedule('55 23 * * *', async () => {
    console.log('Running pre-midnight punch-out check...');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activeSessions = await Attendance.find({
        date: { $gte: today },
        punchIn: { $ne: null },
        punchOut: null
      }).populate('userId', 'email');
      
      if (activeSessions.length > 0) {
        console.log(`Found ${activeSessions.length} active sessions that need punch out`);
        
        const sendEmail = require('../utils/emailService');
        
        // Send reminders to users with active sessions
        for (const session of activeSessions) {
          if (session.userId?.email) {
            await sendEmail({
              email: session.userId.email,
              subject: 'Reminder: Please Punch Out',
              html: `
                <h3>Reminder: You haven't punched out yet!</h3>
                <p>You started work today at ${new Date(session.punchIn).toLocaleTimeString()}. </p>
                <p>Please punch out before midnight to ensure your attendance is recorded correctly.</p>
                <p>If you don't punch out, the system will automatically punch you out at 11:59 PM.</p>
                <a href="${process.env.FRONTEND_URL}/staff" style="background: #020c4c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Punch Out Now</a>
              `
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in pre-midnight check:', error);
    }
  });
};

module.exports = { scheduleAutoPunchOut, schedulePreMidnightCheck };