const DailyReport = require('../models/DailyReport');

// @desc    Submit daily report
// @route   POST /api/staff/reports
const submitReport = async (req, res) => {
  try {
    const { workDone, accomplishments, challenges, tomorrowPlan, date } = req.body;
    
    // Set date to start of day
    const reportDate = new Date(date || new Date());
    reportDate.setHours(0, 0, 0, 0);

    // Check if report already exists for this date
    let report = await DailyReport.findOne({
      userId: req.user._id,
      date: reportDate
    });

    if (report) {
      // Update existing report
      report.workDone = workDone;
      report.accomplishments = accomplishments;
      report.challenges = challenges;
      report.tomorrowPlan = tomorrowPlan;
      report.updatedAt = new Date();
      await report.save();
    } else {
      // Create new report
      report = new DailyReport({
        userId: req.user._id,
        date: reportDate,
        workDone,
        accomplishments,
        challenges,
        tomorrowPlan
      });
      await report.save();
    }

    await report.populate('userId', 'firstName lastName email');
    res.status(201).json(report);
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's reports
// @route   GET /api/staff/reports
const getMyReports = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    const query = { userId: req.user._id };

    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(searchDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      query.date = {
        $gte: searchDate,
        $lt: nextDate
      };
    } else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const reports = await DailyReport.find(query)
      .sort({ date: -1 });

    if (date) {
      return res.json(reports[0] || null);
    }
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update report
// @route   PUT /api/staff/reports/:id
const updateReport = async (req, res) => {
  try {
    const { workDone, accomplishments, challenges, tomorrowPlan } = req.body;
    
    const report = await DailyReport.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Only allow updates within 24 hours
    const now = new Date();
    const reportDate = new Date(report.date);
    const hoursDiff = (now - reportDate) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return res.status(400).json({ message: 'Cannot update reports older than 24 hours' });
    }

    report.workDone = workDone;
    report.accomplishments = accomplishments;
    report.challenges = challenges;
    report.tomorrowPlan = tomorrowPlan;
    report.updatedAt = now;
    
    await report.save();
    res.json(report);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin controllers
// @desc    Get all reports (admin)
// @route   GET /api/admin/reports
const getAllReports = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (userId && userId !== 'all') {
      query.userId = userId;
    }

    const reports = await DailyReport.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ date: -1, 'userId.firstName': 1 });

    res.json(reports);
  } catch (error) {
    console.error('Error fetching all reports:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's reports (admin)
// @route   GET /api/admin/reports/user/:userId
const getUserReports = async (req, res) => {
  try {
    const reports = await DailyReport.find({ userId: req.params.userId })
      .populate('userId', 'firstName lastName email')
      .sort({ date: -1 });

    res.json(reports);
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  submitReport,
  getMyReports,
  updateReport,
  getAllReports,
  getUserReports
};