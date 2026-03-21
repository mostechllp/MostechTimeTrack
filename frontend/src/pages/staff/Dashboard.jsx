/* eslint-disable no-unused-vars */
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
import { DocumentTextIcon } from "@heroicons/react/outline";
import ReportModal from "../../components/resuable/ReportModal";

const StaffDashboard = () => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workSeconds, setWorkSeconds] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [lastWorkedSeconds, setLastWorkedSeconds] = useState(0);
  const [showPunchInConfirm, setShowPunchInConfirm] = useState(false);
  const [showPunchOutConfirm, setShowPunchOutConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemTime, setSystemTime] = useState(new Date());

  // Report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [existingReport, setExistingReport] = useState(null);
  const [hasSubmittedReport, setHasSubmittedReport] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
    if (attendanceData?.hasAttendance) {
      checkExistingReport();
    }
  }, [attendanceData, checkExistingReport]);

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

  useEffect(() => {
    fetchAttendance().finally(() => setLoading(false));
  }, [fetchAttendance]);

  useEffect(() => {
    let interval;

    const shouldPoll = attendanceData?.hasAttendance;

    if (shouldPoll) {
      const isActive =
        attendanceData.attendance?.activeSession &&
        !attendanceData.attendance?.isOnBreak;

      const pollInterval = isActive ? 1000 : 5000;

      interval = setInterval(fetchAttendance, pollInterval);
    }

    return () => clearInterval(interval);
  }, [attendanceData, fetchAttendance]);

  useEffect(() => {
    if (attendanceData?.hasAttendance && attendanceData.attendance) {
      setWorkSeconds(attendanceData.attendance.currentWorkSeconds || 0);

      if (attendanceData.attendance.isOnBreak) {
        setLastWorkedSeconds(attendanceData.attendance.currentWorkSeconds || 0);
      }
    }
  }, [attendanceData]);

  const handlePunchIn = () => {
    setShowPunchInConfirm(true);
  };

  const handlePunchOut = () => {
    setShowPunchOutConfirm(true);
  };

  const confirmPunchIn = async () => {
    try {
      const { data } = await axiosInstance.post("/staff/punch-in");
      setAttendanceData({
        hasAttendance: true,
        attendance: data.attendance,
      });
      setWorkSeconds(data.attendance.currentWorkSeconds || 0);
      toast.success("Punched in successfully");
    } catch (error) {
      toast.error("Failed to punch in");
    } finally {
      setShowPunchInConfirm(false);
    }
  };

  const confirmPunchOut = async () => {
    try {
      const { data } = await axiosInstance.post("/staff/punch-out");
      setAttendanceData({
        hasAttendance: true,
        attendance: data.attendance,
      });
      setWorkSeconds(data.attendance.currentWorkSeconds || 0);
      toast.success("Punched out successfully");
      setShowReportModal(true);
    } catch (error) {
      toast.error("Failed to punch out");
    } finally {
      setShowPunchOutConfirm(false);
    }
  };

  const handleBreak = async () => {
    try {
      setLastWorkedSeconds(workSeconds);
      const { data } = await axiosInstance.post("/staff/break");
      setAttendanceData({
        hasAttendance: true,
        attendance: data.attendance,
      });
      setWorkSeconds(data.attendance.currentWorkSeconds || 0);
      toast.success("Break started");
    } catch (error) {
      toast.error("Failed to start break");
    }
  };

  const handleResume = async () => {
    try {
      const { data } = await axiosInstance.post("/staff/resume");
      setAttendanceData({
        hasAttendance: true,
        attendance: data.attendance,
      });
      setWorkSeconds(data.attendance.currentWorkSeconds || 0);
      toast.success("Resumed work");
    } catch (error) {
      toast.error("Failed to resume");
    }
  };

  const handleReportSubmit = async (reportData) => {
    const response = await axiosInstance.post("/staff/reports", {
      ...reportData,
      date: new Date().toISOString(),
    });
    setExistingReport(response.data);
    setHasSubmittedReport(true);
    return response.data;
  };

  const getStatusWithReason = (attendance) => {
    if (!attendance) return { status: "absent", reason: "" };

    const day = new Date().getDay();
    const now = new Date();

    const morningSeconds = attendance.morningSession?.punchIn
      ? attendance.morningSession.punchOut
        ? (new Date(attendance.morningSession.punchOut) -
            new Date(attendance.morningSession.punchIn)) /
          1000
        : (now - new Date(attendance.morningSession.punchIn)) / 1000
      : 0;

    const afternoonSeconds = attendance.afternoonSession?.punchIn
      ? attendance.afternoonSession.punchOut
        ? (new Date(attendance.afternoonSession.punchOut) -
            new Date(attendance.afternoonSession.punchIn)) /
          1000
        : (now - new Date(attendance.afternoonSession.punchIn)) / 1000
      : 0;

    const totalSeconds = morningSeconds + afternoonSeconds;

    const formatDuration = (seconds) => {
      if (seconds < 60) return `${Math.floor(seconds)} sec`;
      if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
      return `${(seconds / 3600).toFixed(2)} hrs`;
    };

    const isAfternoonActive =
      attendance.activeSession === "afternoon" && !attendance.isOnBreak;

    if (isAfternoonActive) {
      return {
        status: "in-progress",
        reason: `Afternoon session in progress: ${formatDuration(afternoonSeconds)}`,
      };
    }

    const isMorningActive =
      attendance.activeSession === "morning" && !attendance.isOnBreak;

    if (isMorningActive) {
      return {
        status: "in-progress",
        reason: `Morning session in progress: ${formatDuration(morningSeconds)}`,
      };
    }

    if (day === 6) {
      if (attendance.morningSession?.isPresent) {
        return {
          status: "present",
          reason: `Worked ${formatDuration(morningSeconds)} (Saturday)`,
        };
      } else if (attendance.morningSession?.punchIn) {
        return {
          status: "absent",
          reason: `Worked only ${formatDuration(morningSeconds)} on Saturday (need full 4 hrs)`,
        };
      }
    } else {
      if (
        attendance.morningSession?.isPresent &&
        attendance.afternoonSession?.isPresent
      ) {
        return {
          status: "present",
          reason: `Worked full day: ${formatDuration(totalSeconds)}`,
        };
      } else if (attendance.morningSession?.isPresent) {
        return {
          status: "half-day",
          reason: `Worked morning session only: ${formatDuration(morningSeconds)}`,
        };
      } else if (attendance.afternoonSession?.isPresent) {
        return {
          status: "half-day",
          reason: `Worked afternoon session only: ${formatDuration(afternoonSeconds)}`,
        };
      } else if (
        attendance.morningSession?.punchIn ||
        attendance.afternoonSession?.punchIn
      ) {
        return {
          status: "absent",
          reason: `Worked only ${formatDuration(totalSeconds)} (need full 4 hr session)`,
        };
      }
    }

    return { status: "absent", reason: "No work recorded" };
  };

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return "00:00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSessionType = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay();

    if (day === 6) {
      if (hours >= 9 && hours < 13) {
        return "Morning Session (Full Day)";
      } else if (hours < 9) {
        return "Good morning! Saturday session starts at 9 AM. Get ready!";
      } else if (hours >= 13) {
        return "Great work! Saturday shift ends at 1 PM. Enjoy your weekend!";
      }
    }

    if (hours < 9) {
      const timeUntil = 9 - hours;
      if (timeUntil === 1 && minutes > 0) {
        return `Good morning! Session starts in ${60 - minutes} minutes. Get ready!`;
      }
      return `Good morning! Your work day starts at 9 AM. ${timeUntil} hour${timeUntil > 1 ? "s" : ""} to go!`;
    }

    if (hours >= 9 && hours < 13) {
      if (hours === 12 && minutes >= 30) {
        return "Morning Session - Wrapping up! Great work this morning!";
      }
      return "Morning Session (9 AM - 1 PM) - Stay focused!";
    }

    if (hours >= 13 && hours < 14) {
      if (minutes >= 55) {
        return "Lunch Break ending soon! Afternoon session starts in 5 minutes.";
      }
      return "Lunch Break - Enjoy your break! Back at 2 PM.";
    }

    if (hours >= 14 && hours < 18) {
      if (hours === 17 && minutes >= 30) {
        return "Afternoon Session - Almost done! Finish strong!";
      }
      return "Afternoon Session (2 PM - 6 PM) - Keep up the momentum!";
    }

    if (hours >= 18) {
      if (attendanceData?.attendance?.totalWorkedHours > 0) {
        return "Great job today! Time to rest and recharge. See you tomorrow!";
      }
      return "Today's work has ended. Get some rest! See you tomorrow!";
    }

    return "Ready to start? Click Punch In when ready!";
  };

  const canPunchIn = useCallback(() => {
    const now = currentTime;
    const hours = now.getHours();
    const day = now.getDay();

    if (day === 0) return false;

    if (attendanceData?.hasAttendance && attendanceData.attendance) {
      const currentHour = hours;

      if (currentHour >= 9 && currentHour < 13) {
        if (attendanceData.attendance.morningSession?.punchIn) {
          return false;
        }
      }

      if (currentHour >= 14 && currentHour < 18) {
        if (attendanceData.attendance.afternoonSession?.punchIn) {
          return false;
        }
      }
    }

    if (day === 6) {
      return hours >= 9 && hours < 13;
    }

    return (hours >= 9 && hours < 13) || (hours >= 14 && hours < 18);
  }, [attendanceData, currentTime]);

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
  const hasActiveSession = attendance?.activeSession && !attendance?.isOnBreak;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Main Timer Card */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold break-words" style={{ color: "#020c4c" }}>
              Welcome, {user?.firstName || "Staff"}!
            </h1>
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
              <button
                onClick={() => {
                  fetchAttendance();
                  toast.success("Refreshed");
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Refresh"
              >
                <RefreshIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <div className="text-right">
                <div className="text-xs sm:text-sm text-gray-500 font-mono">
                  {systemTime.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center py-4 sm:py-6 lg:py-8">
            <div className="text-xs sm:text-sm text-gray-600 mb-2 px-2">
              {getSessionType()}
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {attendance?.isOnBreak && (
                <span className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs sm:text-sm font-medium">
                  On Break
                </span>
              )}
              {hasActiveSession && (
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-medium animate-pulse">
                  Active
                </span>
              )}
            </div>

            <div
              className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 lg:mb-8 font-mono tracking-wider break-all"
              style={{ color: "#020c4c" }}
            >
              {formatTime(workSeconds)}
            </div>

            {attendance?.isOnBreak && lastWorkedSeconds > 0 && (
              <div className="mb-4 text-xs sm:text-sm text-gray-500">
                Break started at: {formatTime(lastWorkedSeconds)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              {!attendance?.activeSession &&
                canPunchIn() &&
                !attendanceData?.hasAttendance && (
                  <button
                    onClick={handlePunchIn}
                    className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-white font-medium flex items-center justify-center space-x-2 hover:opacity-90 transition text-base sm:text-lg"
                    style={{ background: "#020c4c" }}
                  >
                    <PlayIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span>Punch In</span>
                  </button>
                )}

              {attendance?.activeSession && !attendance?.isOnBreak && (
                <>
                  <button
                    onClick={handleBreak}
                    className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-white font-medium flex items-center justify-center space-x-2 hover:opacity-90 transition text-base sm:text-lg"
                    style={{ background: "#FFA500" }}
                  >
                    <PauseIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span>Take Break</span>
                  </button>

                  <button
                    onClick={handlePunchOut}
                    className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-white font-medium flex items-center justify-center space-x-2 hover:opacity-90 transition text-base sm:text-lg"
                    style={{ background: "#dc2626" }}
                  >
                    <StopIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span>Punch Out</span>
                  </button>
                </>
              )}

              {attendance?.isOnBreak && (
                <button
                  onClick={handleResume}
                  className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-white font-medium flex items-center justify-center space-x-2 hover:opacity-90 transition text-base sm:text-lg"
                  style={{ background: "#059669" }}
                >
                  <RefreshIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Resume Work</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Today's Summary - Responsive Grid */}
        {attendance && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Morning Session */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h3
                className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
                style={{ color: "#020c4c" }}
              >
                Morning Session <span className="text-xs sm:text-sm text-gray-500">(9 AM - 1 PM)</span>
              </h3>
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium ${
                      attendance.morningSession?.isPresent
                        ? "text-green-600"
                        : attendance.morningSession?.punchIn
                          ? "text-orange-600"
                          : "text-gray-500"
                    }`}
                  >
                    {attendance.morningSession?.isPresent
                      ? "Completed (Full Session)"
                      : attendance.morningSession?.punchIn
                        ? "Partial"
                        : "Not Started"}
                  </span>
                </div>
                {attendance.morningSession?.punchIn && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
                      <span className="text-gray-600">Start:</span>
                      <span className="font-mono">
                        {new Date(
                          attendance.morningSession.punchIn,
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                    {attendance.morningSession?.punchOut && (
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
                        <span className="text-gray-600">End:</span>
                        <span className="font-mono">
                          {new Date(
                            attendance.morningSession.punchOut,
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Afternoon Session */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h3
                className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
                style={{ color: "#020c4c" }}
              >
                Afternoon Session{" "}
                {new Date().getDay() === 6 && (
                  <span className="text-xs sm:text-sm text-gray-500">(No Session)</span>
                )}
              </h3>

              {new Date().getDay() === 6 ? (
                <div className="text-center py-4 sm:py-6">
                  <p className="text-gray-500 text-sm sm:text-base">
                    No afternoon session on Saturday
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-2">
                    Saturday shift: 9 AM - 1 PM only
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-sm sm:text-base">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-gray-600">Status:</span>
                    <div className="text-right">
                      <span
                        className={`font-bold capitalize ${
                          attendance.status === "present"
                            ? "text-green-600"
                            : attendance.status === "half-day"
                              ? "text-yellow-600"
                              : attendance.activeSession === "afternoon" &&
                                  !attendance.isOnBreak
                                ? "text-blue-600"
                                : "text-gray-600"
                        }`}
                      >
                        {attendance.activeSession === "afternoon" &&
                        !attendance.isOnBreak
                          ? "In Progress"
                          : attendance.status === "present"
                            ? "Present"
                            : attendance.status === "half-day"
                              ? "Half Day"
                              : "Absent"}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {getStatusWithReason(attendance).reason}
                      </div>
                    </div>
                  </div>

                  {attendance.afternoonSession?.punchIn && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
                      <span className="text-gray-600">Start:</span>
                      <span className="font-mono">
                        {new Date(
                          attendance.afternoonSession.punchIn,
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {attendance.afternoonSession?.punchOut && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
                      <span className="text-gray-600">End:</span>
                      <span className="font-mono">
                        {new Date(
                          attendance.afternoonSession.punchOut,
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Today's Summary */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h3
                className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
                style={{ color: "#020c4c" }}
              >
                Today's Summary
              </h3>
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-gray-600">Worked:</span>
                  <span className="font-bold">
                    {(() => {
                      const seconds = attendance.totalWorkedHours * 3600;
                      if (seconds < 60) {
                        return `${Math.floor(seconds)} sec`;
                      } else if (seconds < 3600) {
                        return `${(seconds / 60).toFixed(1)} min`;
                      } else {
                        return `${(seconds / 3600).toFixed(2)} hrs`;
                      }
                    })()}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-gray-600">Breaks:</span>
                  <span className="font-bold">
                    {attendance.breaks?.length || 0} breaks
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 pt-1">
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
              </div>
            </div>
          </div>
        )}

        {/* Report Button */}
        {hasSubmittedReport && (
          <div className="mt-4 sm:mt-6 flex justify-end">
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm sm:text-base"
            >
              <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>View Today's Report</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={showPunchInConfirm}
        onClose={() => setShowPunchInConfirm(false)}
        onConfirm={confirmPunchIn}
        title="Confirm Punch In"
        message={`Are you sure you want to punch in?`}
      />
      <ConfirmModal
        isOpen={showPunchOutConfirm}
        onClose={() => setShowPunchOutConfirm(false)}
        onConfirm={confirmPunchOut}
        title="Confirm Punch Out"
        message={`Are you sure you want to punch out?\n\nYou cannot punch in again today.`}
      />
      <ReportModal
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