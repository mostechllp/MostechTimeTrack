const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leaveId: {
    type: String,
    required: true,
    unique: true, 
    index: true 
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  leaveDays: {
    type: Number,
    required: true,
    default: 1
  },
  reason: {
    type: String,
    required: true
  },
  emailScreenshot: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'auto-approved'],
    default: 'pending'
  },
  rejectionReason: String,
   autoApproved: {
    type: Boolean,
    default: false
  },
  autoApprovedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Leave', leaveSchema);