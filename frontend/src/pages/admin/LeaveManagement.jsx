import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { CheckIcon, XIcon, ExternalLinkIcon, ClipboardIcon, SearchIcon, FilterIcon } from "@heroicons/react/outline";
import axiosInstance from "../../utils/axiosConfig";

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedLeave, setExpandedLeave] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const { data } = await axiosInstance.get("/admin/leaves");
      setLeaves(data);
    } catch (error) {
      toast.error("Failed to fetch leave requests", error);
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      await axiosInstance.put(`/admin/leaves/${leaveId}`, {
        status: "approved",
      });
      toast.success("Leave request approved");
      fetchLeaves();
    } catch (error) {
      toast.error("Failed to approve leave", error);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    try {
      await axiosInstance.put(`/admin/leaves/${selectedLeave._id}`, {
        status: "rejected",
        rejectionReason,
      });
      toast.success("Leave request rejected");
      setShowRejectModal(false);
      setSelectedLeave(null);
      setRejectionReason("");
      fetchLeaves();
    } catch (error) {
      toast.error("Failed to reject leave", error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Leave ID copied to clipboard!");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
    }
  };

  // Filter leaves based on search term and status
  const filteredLeaves = leaves.filter(leave => {
    const matchesSearch = 
      leave.leaveId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.userId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.userId?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || leave.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const toggleLeaveExpand = (leaveId) => {
    if (expandedLeave === leaveId) {
      setExpandedLeave(null);
    } else {
      setExpandedLeave(leaveId);
    }
  };

  const getStatusCount = (status) => {
    if (status === "all") return leaves.length;
    return leaves.filter(leave => leave.status === status).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: '#020c4c' }}>
            Leave Management
          </h1>
          
          {/* Status Summary - Mobile */}
          <div className="flex sm:hidden gap-2 w-full">
            <button
              onClick={() => setFilterStatus("all")}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === "all" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-gray-600 border border-gray-300"
              }`}
            >
              All ({getStatusCount("all")})
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === "pending" 
                  ? "bg-yellow-500 text-white" 
                  : "bg-white text-gray-600 border border-gray-300"
              }`}
            >
              Pending ({getStatusCount("pending")})
            </button>
            <button
              onClick={() => setFilterStatus("approved")}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === "approved" 
                  ? "bg-green-600 text-white" 
                  : "bg-white text-gray-600 border border-gray-300"
              }`}
            >
              Approved ({getStatusCount("approved")})
            </button>
            <button
              onClick={() => setFilterStatus("rejected")}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === "rejected" 
                  ? "bg-red-600 text-white" 
                  : "bg-white text-gray-600 border border-gray-300"
              }`}
            >
              Rejected ({getStatusCount("rejected")})
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6">
          {/* Desktop Filters */}
          <div className="hidden sm:flex justify-between items-center gap-4 mb-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <SearchIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by ID, name, email, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === "all" 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All ({getStatusCount("all")})
              </button>
              <button
                onClick={() => setFilterStatus("pending")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === "pending" 
                    ? "bg-yellow-500 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Pending ({getStatusCount("pending")})
              </button>
              <button
                onClick={() => setFilterStatus("approved")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === "approved" 
                    ? "bg-green-600 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Approved ({getStatusCount("approved")})
              </button>
              <button
                onClick={() => setFilterStatus("rejected")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === "rejected" 
                    ? "bg-red-600 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Rejected ({getStatusCount("rejected")})
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="sm:hidden">
            <div className="relative">
              <SearchIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search leaves..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead style={{ background: '#020c4c' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Leave ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Screenshot
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <SearchIcon className="h-12 w-12 text-gray-300 mb-2" />
                        <p className="text-sm">
                          {searchTerm || filterStatus !== "all" 
                            ? "No matching leave requests found" 
                            : "No leave requests found"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {leave.leaveId || "N/A"}
                          </span>
                          {leave.leaveId && (
                            <button
                              onClick={() => copyToClipboard(leave.leaveId)}
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                              title="Copy Leave ID"
                            >
                              <ClipboardIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 text-xs font-medium">
                              {leave.userId?.firstName?.charAt(0)}{leave.userId?.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {leave.userId?.firstName} {leave.userId?.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {leave.userId?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(leave.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900 max-w-xs truncate" title={leave.reason}>
                          {leave.reason}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {leave.emailScreenshot && (
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
                            <ExternalLinkIcon className="h-4 w-4" />
                            <span>View</span>
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(leave.status)}
                          {leave.rejectionReason && leave.status === "rejected" && (
                            <div className="text-xs text-red-600 max-w-xs truncate" title={leave.rejectionReason}>
                              {leave.rejectionReason}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {leave.status === "pending" && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApprove(leave._id)}
                              className="p-2 rounded-lg text-green-600 hover:bg-green-100 transition-colors"
                              title="Approve"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLeave(leave);
                                setShowRejectModal(true);
                              }}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                              title="Reject"
                            >
                              <XIcon className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tablet and Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {filteredLeaves.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <SearchIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                {searchTerm || filterStatus !== "all" 
                  ? "No matching leave requests found" 
                  : "No leave requests found"}
              </p>
            </div>
          ) : (
            filteredLeaves.map((leave) => (
              <div key={leave._id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {leave.userId?.firstName?.charAt(0)}{leave.userId?.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {leave.userId?.firstName} {leave.userId?.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {leave.userId?.email}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(leave.status)}
                  </div>

                  {/* Leave Details */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Leave ID:</span>
                      <div className="flex items-center space-x-1">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {leave.leaveId || "N/A"}
                        </span>
                        {leave.leaveId && (
                          <button
                            onClick={() => copyToClipboard(leave.leaveId)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <ClipboardIcon className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Date:</span>
                      <span className="text-gray-700">
                        {new Date(leave.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-start text-sm">
                      <span className="text-gray-500">Reason:</span>
                      <span className="text-gray-700 text-right flex-1 ml-2">
                        {leave.reason.length > 50 && expandedLeave !== leave._id 
                          ? `${leave.reason.substring(0, 50)}...` 
                          : leave.reason}
                        {leave.reason.length > 50 && (
                          <button
                            onClick={() => toggleLeaveExpand(leave._id)}
                            className="text-blue-600 text-xs ml-1"
                          >
                            {expandedLeave === leave._id ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </span>
                    </div>
                    
                    {/* Screenshot Link */}
                    {leave.emailScreenshot && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Screenshot:</span>
                        <a
                          href={
                            leave.emailScreenshot.startsWith("http")
                              ? leave.emailScreenshot
                              : `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${leave.emailScreenshot}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <ExternalLinkIcon className="h-3 w-3" />
                          <span>View</span>
                        </a>
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {leave.rejectionReason && leave.status === "rejected" && (
                      <div className="mt-2 p-2 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-700 font-medium">Rejection Reason:</p>
                        <p className="text-xs text-red-600 mt-1">{leave.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {leave.status === "pending" && (
                    <div className="flex space-x-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleApprove(leave._id)}
                        className="flex-1 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                        style={{ background: '#059669' }}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <CheckIcon className="h-4 w-4" />
                          <span>Approve</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLeave(leave);
                          setShowRejectModal(true);
                        }}
                        className="flex-1 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                        style={{ background: '#dc2626' }}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <XIcon className="h-4 w-4" />
                          <span>Reject</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Footer */}
        {filteredLeaves.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Showing {filteredLeaves.length} of {leaves.length} leave request{leaves.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Reject Modal - Responsive */}
        {showRejectModal && selectedLeave && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <h3
                className="text-lg font-medium mb-4"
                style={{ color: "#020c4c" }}
              >
                Reject Leave Request
              </h3>
              
              <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Staff Member:</p>
                <p className="text-sm font-medium">
                  {selectedLeave.userId?.firstName} {selectedLeave.userId?.lastName}
                </p>
                <p className="text-xs text-gray-500 mt-2 mb-1">Leave ID:</p>
                <p className="font-mono text-sm">{selectedLeave.leaveId || "N/A"}</p>
              </div>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows="4"
                autoFocus
              />

              <div className="flex space-x-3">
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim()}
                  className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-all ${
                    !rejectionReason.trim() 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:opacity-90'
                  }`}
                  style={{ background: "#dc2626" }}
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedLeave(null);
                    setRejectionReason("");
                  }}
                  className="flex-1 py-2 px-4 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagement;