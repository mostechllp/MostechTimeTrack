import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CheckIcon, XIcon, ExternalLinkIcon, ClipboardIcon, RefreshIcon, ClockIcon } from '@heroicons/react/outline';
import axiosInstance from '../../utils/axiosConfig';
import ConfirmModal from '../../components/resuable/ConfirmModal';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [expiringLeaves, setExpiringLeaves] = useState([]);
  const [showAutoApproveConfirm, setShowAutoApproveConfirm] = useState(false);

  useEffect(() => {
    fetchLeaves();
    fetchExpiringLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/admin/leaves');
      setLeaves(data);
    } catch (error) {
      toast.error('Failed to fetch leave requests', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiringLeaves = async () => {
    try {
      const { data } = await axiosInstance.get('/admin/leaves/pending-expiring');
      setExpiringLeaves(data);
      if (data.length > 0) {
        toast(
          `${data.length} leave request(s) will be auto-approved in 24 hours`,
          { icon: '⚠️', duration: 5000 }
        );
      }
    } catch (error) {
      console.error('Error fetching expiring leaves:', error);
    }
  };

  const handleAutoApprove = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post('/admin/leaves/auto-approve');
      toast.success(response.data.message);
      fetchLeaves();
      fetchExpiringLeaves();
    } catch (error) {
      toast.error('Failed to auto-approve leaves', error);
    } finally {
      setLoading(false);
      setShowAutoApproveConfirm(false);
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      await axiosInstance.put(`/admin/leaves/${leaveId}`, { status: 'approved' });
      toast.success('Leave request approved');
      fetchLeaves();
      fetchExpiringLeaves();
    } catch (error) {
      toast.error('Failed to approve leave', error);
    }
  };

  const handleReject = async () => {
    try {
      await axiosInstance.put(`/admin/leaves/${selectedLeave._id}`, {
        status: 'rejected',
        rejectionReason,
      });
      toast.success('Leave request rejected');
      setShowRejectModal(false);
      setSelectedLeave(null);
      setRejectionReason('');
      fetchLeaves();
      fetchExpiringLeaves();
    } catch (error) {
      toast.error('Failed to reject leave', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Leave ID copied to clipboard!');
  };

  const getStatusBadge = (status, leave) => {
    const createdAt = new Date(leave.createdAt);
    const now = new Date();
    const daysPending = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    
    if (status === 'pending') {
      if (daysPending >= 1) {
        return (
          <div className="space-y-1">
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
              Pending ({daysPending} day{daysPending > 1 ? 's' : ''})
            </span>
            {daysPending >= 1 && (
              <div className="text-xs text-orange-600">
                Auto-approves in {2 - daysPending} day(s)
              </div>
            )}
          </div>
        );
      }
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Pending
        </span>
      );
    }
    
    if (status === 'approved') {
      if (leave.autoApproved) {
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            Auto-Approved
          </span>
        );
      }
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          Approved
        </span>
      );
    }
    
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
        Rejected
      </span>
    );
  };

  const filteredLeaves = leaves.filter(leave => 
    leave.leaveId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leave.userId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leave.userId?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leave.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#020c4c' }}>
            Leave Management
          </h1>
          
          <div className="flex items-center space-x-3">
            {/* Expiring warning badge */}
            {expiringLeaves.length > 0 && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-orange-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-orange-600" />
                <span className="text-sm text-orange-700">
                  {expiringLeaves.length} will auto-approve in 24h
                </span>
              </div>
            )}
            
            {/* Manual auto-approve button */}
            <button
              onClick={() => setShowAutoApproveConfirm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <RefreshIcon className="h-5 w-5" />
              <span>Auto-Approve Pending</span>
            </button>
            
            {/* Search input */}
            <div className="w-64">
              <input
                type="text"
                placeholder="Search by ID, name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
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
                  Requested On
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
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {leave.leaveId || "N/A"}
                        </span>
                        {leave.leaveId && (
                          <button
                            onClick={() => copyToClipboard(leave.leaveId)}
                            className="text-gray-500 hover:text-gray-700"
                            title="Copy Leave ID"
                          >
                            <ClipboardIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {leave.userId?.firstName} {leave.userId?.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {leave.userId?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(leave.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 max-w-xs truncate">
                        {leave.reason}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(leave.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(leave.status, leave)}
                      {leave.rejectionReason && (
                        <div className="text-xs text-red-600 mt-1">
                          Reason: {leave.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {leave.status === "pending" && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(leave._id)}
                            className="p-1 rounded-full text-green-600 hover:bg-green-100"
                            title="Approve"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLeave(leave);
                              setShowRejectModal(true);
                            }}
                            className="p-1 rounded-full text-red-600 hover:bg-red-100"
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

        {/* Reject Modal */}
        {showRejectModal && selectedLeave && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-medium mb-4" style={{ color: '#020c4c' }}>
                Reject Leave Request
              </h3>
              
              {selectedLeave.leaveId && (
                <div className="mb-4 p-2 bg-gray-100 rounded-md">
                  <p className="text-xs text-gray-500">Leave ID:</p>
                  <p className="font-mono text-sm">{selectedLeave.leaveId}</p>
                </div>
              )}

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                rows="4"
                required
              />

              <div className="flex space-x-4">
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim()}
                  className={`flex-1 py-2 px-4 rounded-md text-white ${
                    !rejectionReason.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                  }`}
                  style={{ background: '#dc2626' }}
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedLeave(null);
                    setRejectionReason("");
                  }}
                  className="flex-1 py-2 px-4 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Approve Confirmation Modal */}
        <ConfirmModal
          isOpen={showAutoApproveConfirm}
          onClose={() => setShowAutoApproveConfirm(false)}
          onConfirm={handleAutoApprove}
          title="Auto-Approve Pending Leaves"
          message={`Are you sure you want to auto-approve all pending leave requests older than 2 days?\n\nThis will approve ${expiringLeaves.length} pending request(s) immediately.`}
          confirmText="Yes, Auto-Approve"
          cancelText="Cancel"
          confirmButtonColor="#2563eb"
        />
      </div>
    </div>
  );
};

export default LeaveManagement;