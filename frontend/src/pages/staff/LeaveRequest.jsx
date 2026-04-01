import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import axios from "../../utils/axiosConfig";
import toast from "react-hot-toast";
import {
  CalendarIcon,
  PhotographIcon,
  XIcon,
  ClipboardIcon,
  ClipboardCheckIcon,
  MenuIcon,
  ChevronRightIcon,
  ClockIcon,
  InformationCircleIcon,
} from "@heroicons/react/outline";
import ConfirmModal from "../../components/resuable/ConfirmModal";

// List of holidays for 2026
const HOLIDAYS_2026 = [
  new Date(2026, 0, 1),  // New Year's Day
  new Date(2026, 0, 26), // Republic Day
  new Date(2026, 2, 20), // Id-ul-Fitr (Ramzan)
  new Date(2026, 3, 3),  // Good Friday
  new Date(2026, 3, 15), // Vishu
  new Date(2026, 4, 1),  // May Day
  new Date(2026, 4, 27), // Id-ul-Ad'ha (Bakrid)
  new Date(2026, 7, 15), // Independence Day
  new Date(2026, 7, 25), // Milad-i-Sherif
  new Date(2026, 7, 26), // Thiruvonam
  new Date(2026, 9, 2),  // Gandhi Jayanthi
  new Date(2026, 11, 25), // Christmas
];

// Function to check if a date is a holiday
const isHoliday = (date) => {
  return HOLIDAYS_2026.some(holiday => 
    holiday.getFullYear() === date.getFullYear() &&
    holiday.getMonth() === date.getMonth() &&
    holiday.getDate() === date.getDate()
  );
};

// Function to check if a date is a Sunday
const isSunday = (date) => {
  return date.getDay() === 0;
};

// Function to calculate working days between two dates
const calculateWorkingDays = (startDate, endDate, leaveType) => {
  if (!startDate) return 0;
  
  if (leaveType === 'half-day') {
    return 0.5; // Half day = 0.5 days
  }
  
  if (!endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) return 0;
  
  let workingDays = 0;
  let currentDate = new Date(start);
  
  while (currentDate <= end) {
    if (!isSunday(currentDate) && !isHoliday(currentDate)) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
};

// Function to format date for display
const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

const LeaveRequest = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      leaveType: 'full-day'
    }
  });
  const [leaves, setLeaves] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [leaveId, setLeaveId] = useState("");
  const [copied, setCopied] = useState(false);
  const [showLeaveRequestDeleteConfirm, setShowLeaveRequestDeleteConfirm] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Watch form values
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const leaveType = watch("leaveType");
  const halfDayTime = watch("halfDayTime");
  
  // Calculate working days
  const [workingDays, setWorkingDays] = useState(0);
  const [excludedDates, setExcludedDates] = useState({ sundays: 0, holidays: 0 });

  // Update working days when dates change
  useEffect(() => {
    if (startDate) {
      const days = calculateWorkingDays(startDate, endDate, leaveType, halfDayTime);
      setWorkingDays(days);
      
      if (leaveType === 'full-day' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        let sundayCount = 0;
        let holidayCount = 0;
        let currentDate = new Date(start);
        
        while (currentDate <= end) {
          if (isSunday(currentDate)) sundayCount++;
          if (isHoliday(currentDate)) holidayCount++;
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        setExcludedDates({ sundays: sundayCount, holidays: holidayCount });
      } else {
        setExcludedDates({ sundays: 0, holidays: 0 });
      }
    } else {
      setWorkingDays(0);
      setExcludedDates({ sundays: 0, holidays: 0 });
    }
  }, [startDate, endDate, leaveType, halfDayTime]);

  // Fetch leaves on component mount
  useEffect(() => {
    fetchLeaves();
  }, []);

  // Generate unique ID on component mount
  useEffect(() => {
    generateUniqueId();
  }, []);

  const generateUniqueId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newId = `LVE-${dateStr}-${randomStr}`;
    setLeaveId(newId);
    setValue("leaveId", newId);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(leaveId);
    setCopied(true);
    toast.success("Leave ID copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  const fetchLeaves = async () => {
    try {
      const { data } = await axios.get("/staff/leaves");
      setLeaves(data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      toast.error("Failed to fetch leave history");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const onSubmit = async (data) => {
    if (!selectedFile) {
      toast.error("Please upload an email screenshot");
      return;
    }

    if (workingDays === 0) {
      toast.error("Please select valid dates");
      return;
    }

    const formData = new FormData();
    formData.append("startDate", data.startDate);
    formData.append("leaveType", data.leaveType);
    formData.append("reason", data.reason);
    formData.append("leaveId", leaveId);
    formData.append("leaveDays", workingDays);
    formData.append("emailScreenshot", selectedFile);
    
    if (data.leaveType === 'full-day') {
      formData.append("endDate", data.endDate);
    } else {
      formData.append("halfDayTime", data.halfDayTime);
      formData.append("endDate", data.startDate);
    }

    try {
      setUploading(true);
      const response = await axios.post("/staff/leave", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        response.data.message || "Leave request submitted successfully",
      );
      reset({
        leaveType: 'full-day'
      });
      removeSelectedFile();
      generateUniqueId();
      setWorkingDays(0);
      fetchLeaves();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to submit leave request",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCancelLeave = (leaveId) => {
    setSelectedLeaveId(leaveId);
    setShowLeaveRequestDeleteConfirm(true);
  };

  const confirmCancelLeave = async () => {
    try {
      await axios.delete(`/staff/leave/${selectedLeaveId}`);
      toast.success("Leave request cancelled");
      setShowLeaveRequestDeleteConfirm(false);
      setSelectedLeaveId(null);
      fetchLeaves();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to cancel leave request",
      );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "text-green-600 bg-green-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  const getLeaveTypeDisplay = (leave) => {
    if (leave.leaveType === 'half-day') {
      return `${leave.halfDayTime === 'morning' ? '☀️ Morning' : '🌙 Afternoon'} Half Day`;
    }
    return '📅 Full Day';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="relative">
          {/* Main Content - Leave Request Form */}
          <div
            className={`transition-all duration-300 ease-in-out ${isHistoryOpen ? "mr-80" : "mr-0"}`}
          >
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Header with Toggle Button */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: "#020c4c" }}>
                  Request Leave
                </h2>

                {/* Toggle History Button */}
                <button
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                >
                  {isHistoryOpen ? (
                    <>
                      <ChevronRightIcon className="h-5 w-5" />
                      <span className="text-sm">Hide History</span>
                    </>
                  ) : (
                    <>
                      <MenuIcon className="h-5 w-5" />
                      <span className="text-sm">
                        History ({leaves.length})
                        {leaves.filter((l) => l.status === "pending").length >
                          0 && (
                          <span className="ml-1 text-yellow-600">
                            (
                            {
                              leaves.filter((l) => l.status === "pending")
                                .length
                            }{" "}
                            pending)
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </button>
              </div>

              <input type="hidden" {...register("leaveId")} />

              {/* Leave ID Display */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Your Leave Request ID
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-white border border-blue-300 rounded-md px-3 py-2 font-mono text-sm">
                    {leaveId}
                  </div>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center space-x-1"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <ClipboardCheckIcon className="h-5 w-5" />
                    ) : (
                      <ClipboardIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="mt-3 text-sm text-blue-700 bg-blue-100 p-3 rounded-md">
                  <p className="font-medium mb-1">📧 Email Instructions:</p>
                  <p>
                    Please send an email with your leave request and include
                    this ID in the subject line:
                  </p>
                  <p className="font-mono mt-2 p-2 bg-white rounded border border-blue-200">
                    Subject: Leave Request - {leaveId}
                  </p>
                  <p className="mt-2 text-xs">
                    Then upload a screenshot of the sent email below.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Leave Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Type *
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="full-day"
                        {...register("leaveType")}
                        className="mr-2"
                      />
                      <span>Full Day</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="half-day"
                        {...register("leaveType")}
                        className="mr-2"
                      />
                      <span>Half Day</span>
                    </label>
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <div className="relative">
                    <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      {...register("startDate", { 
                        required: "Date is required" 
                      })}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {errors.startDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>

                {/* End Date - Only for Full Day */}
                {leaveType === 'full-day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <div className="relative">
                      <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="date"
                        {...register("endDate", { 
                          required: "End date is required",
                          validate: (value) => {
                            if (startDate && value < startDate) {
                              return "End date must be after start date";
                            }
                            return true;
                          }
                        })}
                        min={startDate || new Date().toISOString().split("T")[0]}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {errors.endDate && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.endDate.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Half Day Time Selection */}
                {leaveType === 'half-day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Half Day Session *
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="morning"
                          {...register("halfDayTime", { required: "Please select morning or afternoon" })}
                          className="mr-2"
                        />
                        <span>Morning (9 AM - 1 PM)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="afternoon"
                          {...register("halfDayTime")}
                          className="mr-2"
                        />
                        <span>Afternoon (2 PM - 6 PM)</span>
                      </label>
                    </div>
                    {errors.halfDayTime && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.halfDayTime.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Leave Days Calculation Display */}
                {startDate && workingDays > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start space-x-2">
                      <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-800">
                          Leave Summary
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-blue-700">
                            <strong>Total Leave Days:</strong> {workingDays} {workingDays === 0.5 ? 'day (Half Day)' : workingDays === 1 ? 'day' : 'days'}
                          </p>
                          <p className="text-xs text-blue-600">
                            Date: {formatDateForDisplay(startDate)}
                            {leaveType === 'full-day' && endDate && ` - ${formatDateForDisplay(endDate)}`}
                          </p>
                          {leaveType === 'half-day' && halfDayTime && (
                            <p className="text-xs text-blue-600">
                              Session: {halfDayTime === 'morning' ? 'Morning (9 AM - 1 PM)' : 'Afternoon (2 PM - 6 PM)'}
                            </p>
                          )}
                          {excludedDates.sundays > 0 && (
                            <p className="text-xs text-blue-600">
                              Excluded: {excludedDates.sundays} Sunday{excludedDates.sundays !== 1 ? 's' : ''}
                            </p>
                          )}
                          {excludedDates.holidays > 0 && (
                            <p className="text-xs text-blue-600">
                              Excluded: {excludedDates.holidays} Holiday{excludedDates.holidays !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Leave
                  </label>
                  <textarea
                    {...register("reason", {
                      required: "Reason is required",
                      minLength: {
                        value: 10,
                        message:
                          "Please provide a detailed reason (minimum 10 characters)",
                      },
                    })}
                    rows="5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please provide reason for leave..."
                  />
                  {errors.reason && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.reason.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Screenshot
                  </label>

                  {!previewUrl ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="screenshot"
                      />
                      <label htmlFor="screenshot" className="cursor-pointer">
                        <PhotographIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <span className="text-sm text-gray-600">
                          Click to upload screenshot
                        </span>
                        <span className="text-xs text-gray-500 block mt-1">
                          Max size: 5MB (JPG, PNG, GIF)
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-48 object-contain bg-gray-100 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploading || workingDays === 0}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium transition ${
                    uploading || workingDays === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:opacity-90"
                  }`}
                  style={{ background: uploading || workingDays === 0 ? "#6b7280" : "#020c4c" }}
                >
                  {uploading ? "Submitting..." : workingDays === 0 ? "Select date" : "Submit Leave Request"}
                </button>
              </form>
            </div>
          </div>

          {/* Collapsible History Panel */}
          <div
            className={`fixed top-0 right-0 h-full bg-white shadow-2xl transition-all duration-300 ease-in-out z-20 overflow-y-auto ${
              isHistoryOpen ? "w-80" : "w-0"
            }`}
            style={{ top: "80px", height: "calc(100% - 80px)" }}
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-4 pb-2 border-b">
                <h3 className="text-lg font-bold" style={{ color: "#020c4c" }}>
                  Leave History
                </h3>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500">Approved</p>
                  <p className="text-lg font-bold text-green-600">
                    {leaves.filter((l) => l.status === "approved").length}
                  </p>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-lg font-bold text-yellow-600">
                    {leaves.filter((l) => l.status === "pending").length}
                  </p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <p className="text-xs text-gray-500">Rejected</p>
                  <p className="text-lg font-bold text-red-600">
                    {leaves.filter((l) => l.status === "rejected").length}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {leaves.length === 0 ? (
                  <div className="text-center py-8">
                    <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      No leave requests yet
                    </p>
                  </div>
                ) : (
                  leaves.map((leave) => (
                    <div
                      key={leave._id}
                      className="border rounded-lg p-3 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-mono text-gray-500">
                              {leave.leaveId}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full ${getStatusColor(leave.status)}`}
                            >
                              {leave.status}
                            </span>
                          </div>
                          <p className="text-xs font-medium">
                            {leave.startDate && leave.endDate 
                              ? `${new Date(leave.startDate).toLocaleDateString()}${leave.endDate > leave.startDate ? ` - ${new Date(leave.endDate).toLocaleDateString()}` : ''}`
                              : new Date(leave.date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-blue-600 mt-0.5 font-medium">
                            {getLeaveTypeDisplay(leave)}
                          </p>
                          {leave.leaveDays && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {leave.leaveDays} {leave.leaveDays === 0.5 ? 'day (Half Day)' : leave.leaveDays === 1 ? 'day' : 'days'}
                            </p>
                          )}
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {leave.reason}
                          </p>
                        </div>
                        {leave.status === "pending" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelLeave(leave._id);
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Cancel Request"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {leave.emailScreenshot && (
                        <div className="mt-2">
                          <a
                            href={
                              leave.emailScreenshot.startsWith("http")
                                ? leave.emailScreenshot
                                : `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${leave.emailScreenshot}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <PhotographIcon className="h-3 w-3" />
                            <span>View Screenshot</span>
                          </a>
                        </div>
                      )}

                      {leave.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-xs">
                          <strong>Rejected:</strong> {leave.rejectionReason}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {isHistoryOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
              onClick={() => setIsHistoryOpen(false)}
              style={{ top: "80px" }}
            />
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showLeaveRequestDeleteConfirm}
        onClose={() => {
          setShowLeaveRequestDeleteConfirm(false);
          setSelectedLeaveId(null);
        }}
        onConfirm={confirmCancelLeave}
        title="Confirm Leave Request Cancel"
        message="Are you sure you want to cancel this leave request?"
      />
    </div>
  );
};

export default LeaveRequest;