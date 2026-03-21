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
} from "@heroicons/react/outline";
import ConfirmModal from "../../components/resuable/ConfirmModal";

const LeaveRequest = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();
  const [leaves, setLeaves] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [leaveId, setLeaveId] = useState("");
  const [copied, setCopied] = useState(false);
  const [showLeaveRequestDeleteConfirm, setShowLeaveRequestDeleteConfirm] =
    useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null); // Track which leave to cancel

  // Fetch leaves on component mount
  useEffect(() => {
    fetchLeaves();
  }, []);

  // Generate unique ID on component mount
  useEffect(() => {
    generateUniqueId();
  }, []);

  const generateUniqueId = () => {
    // Format: LVE-YYYYMMDD-XXXXX
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    // Generate random alphanumeric string (5 characters)
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

    const formData = new FormData();
    formData.append("date", data.date);
    formData.append("reason", data.reason);
    formData.append("leaveId", leaveId);
    formData.append("emailScreenshot", selectedFile);

    try {
      setUploading(true);
      const response = await axios.post("/staff/leave", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        response.data.message || "Leave request submitted successfully",
      );
      reset();
      removeSelectedFile();
      generateUniqueId();
      fetchLeaves(); // Refresh the list after submission
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
      fetchLeaves(); // Refresh the list after cancellation
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Leave Request Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: "#020c4c" }}>
              Request Leave
            </h2>

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
                  Please send an email with your leave request and include this
                  ID in the subject line:
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <div className="relative">
                  <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    {...register("date", { required: "Date is required" })}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {errors.date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.date.message}
                  </p>
                )}
              </div>

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
                  rows="4"
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
                disabled={uploading}
                className={`w-full py-2 px-4 rounded-md text-white font-medium transition ${
                  uploading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-90"
                }`}
                style={{ background: uploading ? "#6b7280" : "#020c4c" }}
              >
                {uploading ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </div>

          {/* Leave History */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: "#020c4c" }}>
              Leave History
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {leaves.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No leave requests yet
                </p>
              ) : (
                leaves.map((leave) => (
                  <div
                    key={leave._id}
                    className="border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        {leave.leaveId && (
                          <p className="text-xs font-mono text-gray-500 mb-1">
                            ID: {leave.leaveId}
                          </p>
                        )}
                        <p className="font-medium">
                          {new Date(leave.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {leave.reason}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(leave.status)}`}
                        >
                          {leave.status.charAt(0).toUpperCase() +
                            leave.status.slice(1)}
                        </span>
                        {leave.status === "pending" && (
                          <button
                            onClick={() => handleCancelLeave(leave._id)}
                            className="text-red-500 hover:text-red-700"
                            title="Cancel Request"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {leave.emailScreenshot && (
                      <div className="mt-2 flex items-center justify-between">
                        <a
                          href={
                            leave.emailScreenshot.startsWith("http")
                              ? leave.emailScreenshot
                              : `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${leave.emailScreenshot}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <PhotographIcon className="h-4 w-4" />
                          <span>View Screenshot</span>
                        </a>

                        {leave.leaveId && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(leave.leaveId);
                              toast.success("Leave ID copied!");
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                            title="Copy Leave ID"
                          >
                            <ClipboardIcon className="h-3 w-3" />
                            <span>Copy ID</span>
                          </button>
                        )}
                      </div>
                    )}

                    {leave.rejectionReason && (
                      <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-sm">
                        <strong>Rejection reason:</strong>{" "}
                        {leave.rejectionReason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
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
