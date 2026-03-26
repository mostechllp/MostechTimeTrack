const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['staff', 'admin'],
    default: 'staff'
  },
  firstName: String,
  lastName: String,
  profileImage: {
    type: String,
    default: null
  },
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  joiningDate: { 
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  inactivatedAt: {
    type: Date,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.pre('save', function() {
  if (this.joiningDate) {
    const date = new Date(this.joiningDate);
    date.setHours(0, 0, 0, 0);
    this.joiningDate = date;
  }
});

module.exports = mongoose.model('User', userSchema);