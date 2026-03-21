const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  morningSession: {
    punchIn: Date,
    punchOut: Date,
    isPresent: { type: Boolean, default: false }
  },
  afternoonSession: {
    punchIn: Date,
    punchOut: Date,
    isPresent: { type: Boolean, default: false }
  },
  breaks: [{
    breakStart: Date,
    breakEnd: Date,
    duration: Number // in minutes
  }],
  totalWorkedHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day'],
    default: 'absent'
  }
});

attendanceSchema.pre('save', function() {
  if (this.date) {
    const d = new Date(this.date);
    d.setHours(0, 0, 0, 0);
    this.date = d;
  }
});

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);