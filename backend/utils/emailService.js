const sgMail = require("@sendgrid/mail");
const sendEmail = async (options) => {
  try {
    const API_KEY = process.env.SENDGRID_API_KEY?.trim();

    if (!API_KEY) {
      throw new Error('SendGrid API key missing at send time');
    }

    
    sgMail.setApiKey(API_KEY);

    const msg = {
      to: options.email,
      from: {
        email: process.env.FROM_EMAIL || "fidha@mostech.ae",
        name: "Mostech Business Solutions",
      },
      subject: options.subject,
      html: options.html,
    };

    const response = await sgMail.send(msg);
    return response;

  } catch (error) {
    console.error("SendGrid Error:", error.response?.body || error);
    throw new Error("Failed to send email");
  }
};

module.exports = sendEmail;