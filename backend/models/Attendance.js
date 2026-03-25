const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    }
  },
  punchIn: {
    type: Date,
    default: null
  },
  punchOut: {
    type: Date,
    default: null
  },
  totalWorkedHours: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day'],
    default: 'absent'
  },
  breaks: [{
    breakStart: Date,
    breakEnd: Date,
    duration: Number
  }]
});

// Pre-save hook to calculate hours
attendanceSchema.pre('save', function() {
  if (this.punchIn && this.punchOut) {
    let totalMs = this.punchOut - this.punchIn;
    
    // Subtract break times
    if (this.breaks && this.breaks.length > 0) {
      this.breaks.forEach(breakPeriod => {
        if (breakPeriod.breakEnd) {
          totalMs -= (breakPeriod.breakEnd - breakPeriod.breakStart);
        }
      });
    }
    
    const totalHours = totalMs / (1000 * 60 * 60);
    this.totalWorkedHours = parseFloat(totalHours.toFixed(2));
    
    // Calculate overtime (more than 9 hours)
    if (this.totalWorkedHours > 9) {
      this.overtimeHours = parseFloat((this.totalWorkedHours - 9).toFixed(2));
      this.status = 'present';
    } else if (this.totalWorkedHours >= 4) {
      this.status = 'present';
    } else if (this.totalWorkedHours > 0) {
      this.status = 'half-day';
    } else {
      this.status = 'absent';
    }
  }
});

module.exports = mongoose.model('Attendance', attendanceSchema);