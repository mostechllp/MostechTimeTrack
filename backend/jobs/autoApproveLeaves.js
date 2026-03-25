const cron = require("node-cron");
const { autoApproveLeaves } = require("../controllers/adminController");

// Run every day at midnight (00:00)
const scheduleAutoApprove = () => {
  // For production: run at midnight every day
  cron.schedule("0 0 * * *", async () => {
    console.log("Running auto-approve leaves job...");
    try {
      const req = { body: {} };
      const res = {
        json: (data) => console.log("Auto-approve result:", data.message),
        status: (code) => ({
          json: (data) => console.log("Error:", data.message),
        }),
      };
      await autoApproveLeaves(req, res);
      console.log("Auto-approve job completed");
    } catch (error) {
      console.error("Auto-approve job failed:", error);
    }
  });

  console.log("Auto-approve scheduler started - will run daily at midnight");
};

// For development: run every hour (optional)
const scheduleHourlyForDev = () => {
  if (process.env.NODE_ENV === "development") {
    cron.schedule("0 * * * *", async () => {
      console.log("Development: Running auto-approve leaves check...");
      try {
        const req = { body: {} };
        const res = {
          json: (data) => console.log("Dev auto-approve:", data.message),
          status: (code) => ({
            json: (data) => console.log("Error:", data.message),
          }),
        };
        await autoApproveLeaves(req, res);
      } catch (error) {
        console.error("Dev auto-approve failed:", error);
      }
    });
    console.log("Development auto-approve scheduler started - runs hourly");
  }
};

module.exports = { scheduleAutoApprove, scheduleHourlyForDev };
