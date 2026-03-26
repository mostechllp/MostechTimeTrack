const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require('crypto');
const sendEmail = require("../utils/emailService");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

/// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        message:
          "Your account has been deactivated. Please contact the administrator.",
        isActive: false,
      });
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      _id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage,
      isFirstLogin: user.isFirstLogin,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Change password
// @route   POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isPasswordMatch = await user.comparePassword(currentPassword);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    user.isFirstLogin = false;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Request password reset - send email with reset link
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });
    }

    // Check if account is active
    if (user.isActive === false) {
      return res.status(400).json({ 
        message: 'Your account is deactivated. Please contact administrator.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #020c4c; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { padding: 20px; background: #f9f9f9; border: 1px solid #ddd; }
          .button { 
            background: #020c4c; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px;
            display: inline-block;
            margin: 20px 0;
          }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${user.firstName || 'User'},</p>
            <p>We received a request to reset your password for your Mostech Business Solutions account.</p>
            <p>Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 12px;">${resetUrl}</p>
            <div class="warning">
              <p><strong>⚠️ Note:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
            </div>
            <p style="margin-top: 20px;">Best regards,<br>Mostech Business Solutions Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request - Mostech Business Solutions',
      html: emailHtml
    });

    res.json({ 
      success: true, 
      message: 'If an account exists with this email, a password reset link has been sent.' 
    });

  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Password reset token is invalid or has expired. Please request a new one.' 
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.isFirstLogin = false;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Password has been reset successfully. Please login with your new password.' 
    });

  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { 
  login, 
  changePassword,
  forgotPassword,
  resetPassword
};
