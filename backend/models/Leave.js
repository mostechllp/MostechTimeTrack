const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  leaveId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  leaveType: {
    type: String,
    enum: ["full-day", "half-day"],
    default: "full-day",
    required: true,
  },
  halfDayTime: {
    type: String,
    enum: ["morning", "afternoon"],
    required: function () {
      return this.leaveType === "half-day";
    },
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: function() {
      return this.leaveType === 'full-day';
    }
  },
  leaveDays: {
    type: Number,
    required: true,
    default: 1,
  },
  reason: {
    type: String,
    required: true,
  },
  emailScreenshot: {
    type: String,
    required: true,
  },
  cloudinaryPublicId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "auto-approved"],
    default: "pending",
  },
  rejectionReason: String,
  autoApproved: {
    type: Boolean,
    default: false,
  },
  autoApprovedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Leave", leaveSchema);
