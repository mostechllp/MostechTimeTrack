import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import {
  PlayIcon,
  StopIcon,
  PauseIcon,
  RefreshIcon,
} from "@heroicons/react/outline";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmModal from "../../components/resuable/ConfirmModal";
import ReportModal from "../../components/resuable/ReportModal";

const StaffDashboard = () => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workSeconds, setWorkSeconds] = useState(0);
  const [, setLastSync] = useState(null);
  const [showPunchInConfirm, setShowPunchInConfirm] = useState(false);
  const [showPunchOutConfirm, setShowPunchOutConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [existingReport, setExistingReport] = useState(null);
  const [systemTime, setSystemTime] = useState(new Date());
  // eslint-disable-next-line no-unused-vars
  const [hasSubmittedReport, setHasSubmittedReport] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return "00:00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatHours = (hours) => {
    return `${hours.toFixed(2)} hrs`;
  };

  // Format date with leading zeros
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format time in 24-hour format with leading zeros
  const formatTime24 = (date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const fetchAttendance = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/staff/today");
      setAttendanceData(data);
      setLastSync(new Date());

      if (data.hasAttendance && data.attendance) {
        setWorkSeconds(data.attendance.currentWorkSeconds || 0);
      }
      return data;
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAttendance().finally(() => setLoading(false));
  }, [fetchAttendance]);

  // Local timer effect - updates every second when active and not on break
  useEffect(() => {
    let timerInterval;

    const isActiveAndNotOnBreak =
      attendanceData?.hasAttendance &&
      attendanceData.attendance?.isActive &&
      !attendanceData.attendance?.isOnBreak;

    if (isActiveAndNotOnBreak) {
      timerInterval = setInterval(() => {
        setWorkSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [attendanceData]);

  // Sync with server every 30 seconds
  useEffect(() => {
    let syncInterval;

    const isActive =
      attendanceData?.hasAttendance && attendanceData.attendance?.isActive;

    if (isActive) {
      syncInterval = setInterval(() => {
        fetchAttendance();
      }, 30000);
    }

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [attendanceData, fetchAttendance]);

  const checkExistingReport = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await axiosInstance.get(`/staff/reports?date=${today}`);
      if (data) {
        setExistingReport(data);
        setHasSubmittedReport(true);
      }
    } catch (error) {
      console.error("Error checking report:", error);
    }
  }, []);

  useEffect(() => {
    if (attendanceData?.hasAttendance && attendanceData.attendance?.punchOut) {
      checkExistingReport();
    }
  }, [attendanceData, checkExistingReport]);

  const handlePunchIn = () => setShowPunchInConfirm(true);
  const handlePunchOut = () => setShowPunchOutConfirm(true);

  const confirmPunchIn = async () => {
    try {
      const { data } = await axiosInstance.post("/staff/punch-in");
      setAttendanceData({
        hasAttendance: true,
        attendance: {
          ...data.attendance,
          isActive: true,
          isOnBreak: false,
        },
      });
      setWorkSeconds(0);
      const day = new Date().getDay();
      if (day === 0) {
        toast.success(
          "Punched in successfully! Working on Sunday? Great dedication! 💪",
        );
      } else {
        toast.success("Punched in successfully");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to punch in");
    } finally {
      setShowPunchInConfirm(false);
    }
  };

  const confirmPunchOut = async () => {
    try {
      const { data } = await axiosInstance.post("/staff/punch-out");
      setAttendanceData({
        hasAttendance: true,
        attendance: {
          ...data.attendance,
          isActive: false,
          isOnBreak: false,
        },
      });
      setWorkSeconds(0);
      toast.success("Punched out successfully");
      setShowReportModal(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to punch out");
    } finally {
      setShowPunchOutConfirm(false);
    }
  };

  const handleBreak = async () => {
    try {
      const { data } = await axiosInstance.post("/staff/break");

      setAttendanceData({
        hasAttendance: true,
        attendance: {
          ...data.attendance,
          isActive: true,
          isOnBreak: true,
        },
      });

      if (data.attendance.currentWorkSeconds !== undefined) {
        setWorkSeconds(data.attendance.currentWorkSeconds);
      }

      toast.success("Break started");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start break");
    }
  };

  const handleResume = async () => {
    try {
      const { data } = await axiosInstance.post("/staff/resume");

      setAttendanceData({
        hasAttendance: true,
        attendance: {
          ...data.attendance,
          isActive: true,
          isOnBreak: false,
        },
      });

      if (data.attendance.currentWorkSeconds !== undefined) {
        setWorkSeconds(data.attendance.currentWorkSeconds);
      }

      toast.success("Resumed work");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resume");
    }
  };

  const handleReportSubmit = useCallback(async (reportData) => {
    const response = await axiosInstance.post("/staff/reports", {
      ...reportData,
      date: new Date().toISOString(),
    });
    setExistingReport(response.data);
    setHasSubmittedReport(true);
    return response.data;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: "#020c4c" }}
        ></div>
      </div>
    );
  }

  const attendance = attendanceData?.attendance;
  const isPunchedIn = attendance?.punchIn && !attendance?.punchOut;
  const isOnBreak = attendance?.isOnBreak;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 mb-6">
          {/* Header Section - Responsive */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <h1
              className="text-xl md:text-2xl font-bold text-center md:text-left"
              style={{ color: "#020c4c" }}
            >
              Welcome, {user?.firstName || "Staff"}!
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center md:justify-end">
              {/* Current System Time - Live Clock */}
              <div className="text-center sm:text-right bg-gray-50 px-3 py-2 rounded-lg">
                <div
                  className="text-sm md:text-base font-mono font-medium"
                  style={{ color: "#020c4c" }}
                >
                  {formatTime24(systemTime)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(systemTime)}
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => {
                  fetchAttendance();
                  toast.success("Refreshed");
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors mx-auto sm:mx-0"
                title="Refresh"
              >
                <RefreshIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Timer Section - Responsive */}
          <div className="text-center py-4 md:py-8">
            <p className="text-sm md:text-lg mb-2">
              {isPunchedIn
                ? isOnBreak
                  ? "On Break"
                  : "Working"
                : "Not Punched In"}
              {isPunchedIn && !isOnBreak && (
                <span className="ml-2 px-2 py-0.5 md:px-3 md:py-1 bg-green-100 text-green-800 rounded-full text-xs md:text-sm font-medium animate-pulse inline-block">
                  Active
                </span>
              )}
              {isOnBreak && (
                <span className="ml-2 px-2 py-0.5 md:px-3 md:py-1 bg-orange-100 text-orange-800 rounded-full text-xs md:text-sm font-medium inline-block">
                  On Break
                </span>
              )}
            </p>

            {/* Responsive timer - smaller on mobile */}
            <div
              className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 md:mb-8 font-mono tracking-wider break-all"
              style={{ color: "#020c4c" }}
            >
              {formatTime(workSeconds)}
            </div>

            {/* Buttons - Responsive layout */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:space-x-4">
              {!isPunchedIn && (
                <button
                  onClick={handlePunchIn}
                  className="px-6 py-3 sm:px-8 sm:py-4 rounded-lg text-white font-medium flex items-center justify-center space-x-2 hover:opacity-90 transition text-base sm:text-lg"
                  style={{ background: "#020c4c" }}
                >
                  <PlayIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Punch In</span>
                </button>
              )}

              {isPunchedIn && !isOnBreak && (
                <>
                  <button
                    onClick={handleBreak}
                    className="px-6 py-3 sm:px-8 sm:py-4 rounded-lg text-white font-medium flex items-center justify-center space-x-2 hover:opacity-90 transition text-base sm:text-lg"
                    style={{ background: "#FFA500" }}
                  >
                    <PauseIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span>Take Break</span>
                  </button>
                  <button
                    onClick={handlePunchOut}
                    className="px-6 py-3 sm:px-8 sm:py-4 rounded-lg text-white font-medium flex items-center justify-center space-x-2 hover:opacity-90 transition text-base sm:text-lg"
                    style={{ background: "#dc2626" }}
                  >
                    <StopIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span>Punch Out</span>
                  </button>
                </>
              )}

              {isOnBreak && (
                <button
                  onClick={handleResume}
                  className="px-6 py-3 sm:px-8 sm:py-4 rounded-lg text-white font-medium flex items-center justify-center space-x-2 hover:opacity-90 transition text-base sm:text-lg"
                  style={{ background: "#059669" }}
                >
                  <RefreshIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Resume Work</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards - Responsive Grid */}
        {attendance && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Today's Work Card */}
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
              <h3
                className="text-base md:text-lg font-semibold mb-3 md:mb-4"
                style={{ color: "#020c4c" }}
              >
                Today's Work
              </h3>
              <div className="space-y-2">
                {attendance.punchIn && (
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Punch In:</span>
                    <span className="font-mono">
                      {new Date(attendance.punchIn).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        },
                      )}
                    </span>
                  </div>
                )}
                {attendance.punchOut && (
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Punch Out:</span>
                    <span className="font-mono">
                      {new Date(attendance.punchOut).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        },
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-sm md:text-base">
                  <span className="text-gray-600">Worked:</span>
                  <span style={{ color: "#020c4c" }}>
                    {formatHours(attendance.totalWorkedHours || 0)}
                  </span>
                </div>
                {attendance.overtimeHours > 0 && (
                  <div className="flex justify-between text-xs md:text-sm text-orange-600">
                    <span>Overtime:</span>
                    <span className="font-medium">
                      +{formatHours(attendance.overtimeHours)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Breaks Card */}
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
              <h3
                className="text-base md:text-lg font-semibold mb-3 md:mb-4"
                style={{ color: "#020c4c" }}
              >
                Breaks
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-gray-600">Total Breaks:</span>
                  <span>{attendance.breaks?.length || 0}</span>
                </div>
                {attendance.breaks?.length > 0 && (
                  <div className="mt-2 text-xs md:text-sm text-gray-500 max-h-32 overflow-y-auto">
                    {attendance.breaks.map((breakItem, idx) => (
                      <div key={idx} className="text-xs mb-1">
                        {breakItem.breakStart &&
                          `Break ${idx + 1}: ${new Date(
                            breakItem.breakStart,
                          ).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}`}
                        {breakItem.breakEnd &&
                          ` - ${new Date(breakItem.breakEnd).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            },
                          )}`}
                        {breakItem.duration &&
                          ` (${Math.round(breakItem.duration)} min)`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 sm:col-span-2 lg:col-span-1">
              <h3
                className="text-base md:text-lg font-semibold mb-3 md:mb-4"
                style={{ color: "#020c4c" }}
              >
                Status
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-bold capitalize ${
                      attendance.status === "present"
                        ? "text-green-600"
                        : attendance.status === "half-day"
                          ? "text-yellow-600"
                          : "text-gray-600"
                    }`}
                  >
                    {attendance.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-gray-600">Total Hours:</span>
                  <span className="font-bold" style={{ color: "#020c4c" }}>
                    {formatHours(attendance.totalWorkedHours || 0)}
                  </span>
                </div>
                {attendance.overtimeHours > 0 && (
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-gray-600">Overtime:</span>
                    <span className="font-bold text-orange-600">
                      +{formatHours(attendance.overtimeHours)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showPunchInConfirm}
        onClose={() => setShowPunchInConfirm(false)}
        onConfirm={confirmPunchIn}
        title="Confirm Punch In"
        message="Are you sure you want to punch in?"
      />
      <ConfirmModal
        isOpen={showPunchOutConfirm}
        onClose={() => setShowPunchOutConfirm(false)}
        onConfirm={confirmPunchOut}
        title="Confirm Punch Out"
        message="Are you sure you want to punch out?"
      />
      <ReportModal
        key={existingReport?._id || "new"}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        date={new Date()}
        existingReport={existingReport}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
};

export default StaffDashboard;
