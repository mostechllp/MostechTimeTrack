const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  createStaff,
  getAllStaff,
  getMonthlyReport,
  getLeaveRequests,
  updateLeaveStatus,
  getDashboardStats,
  getAttendanceSummary,
  cleanupOldRejectedLeaves,
  getLiveAttendance
} = require('../controllers/adminController');
const { getAllReports, getUserReports } = require('../controllers/reportController');

router.use(protect);
router.use(admin);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/attendance-summary', getAttendanceSummary);

// Staff management
router.post('/create-staff', createStaff);
router.get('/staff', getAllStaff);

// Reports
router.get('/reports/monthly', getMonthlyReport);

// Leave management
router.get('/leaves', getLeaveRequests);
router.put('/leaves/:id', updateLeaveStatus);
router.delete('/leaves/cleanup', cleanupOldRejectedLeaves); 

router.get('/reports', getAllReports);
router.get('/reports/live', getLiveAttendance);
router.get('/reports/user/:userId', getUserReports);

module.exports = router;