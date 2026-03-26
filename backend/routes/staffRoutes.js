const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  punchIn,
  punchOut,
  takeBreak,
  resumeWork,
  getTodayAttendance,
  requestLeave,
  getMyLeaves,
  cancelLeaveRequest,
  updateProfile,
  getMyDailyReports,
  getMyDailyReportById
} = require('../controllers/staffController');
const { leaveStorage, profileStorage } = require('../config/cloudinary');
const multer = require('multer');
const { submitReport, getMyReports, updateReport } = require('../controllers/reportController');

// Configure multer with Cloudinary storages
const uploadLeave = multer({ storage: leaveStorage });
const uploadProfile = multer({ storage: profileStorage });

router.use(protect);

router.get('/today', getTodayAttendance);
router.post('/punch-in', punchIn);
router.post('/punch-out', punchOut);
router.post('/break', takeBreak);
router.post('/resume', resumeWork);

// Leave routes with Cloudinary upload
router.post('/leave', uploadLeave.single('emailScreenshot'), requestLeave);
router.get('/leaves', getMyLeaves);
router.delete('/leave/:id', cancelLeaveRequest);

// Profile route with Cloudinary upload
router.put('/profile', uploadProfile.single('profileImage'), updateProfile);

router.post('/reports', submitReport);
router.get('/reports', getMyReports);
router.put('/reports/:id', updateReport);

router.get('/reports/daily', getMyDailyReports);
router.get('/reports/daily/:id', getMyDailyReportById);

module.exports = router;