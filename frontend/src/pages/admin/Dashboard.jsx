import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UsersIcon, CalendarIcon, DocumentReportIcon, InboxIcon, ClockIcon } from '@heroicons/react/outline';
import toast from 'react-hot-toast';
import axiosInstance from '../../utils/axiosConfig';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStaff: 0,
    presentToday: 0,
    pendingLeaves: 0,
    leaveStats: {
      pending: 0,
      approved: 0,
      rejected: 0
    },
    recentActivity: []
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsResponse = await axiosInstance.get('/admin/dashboard/stats');
      setStats(statsResponse.data);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Total Staff', 
      value: stats.totalStaff.toString(), 
      icon: UsersIcon, 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      link: '/admin/staff'
    },
    { 
      title: 'Present Today', 
      value: stats.presentToday.toString(), 
      icon: CalendarIcon, 
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      link: '/admin/reports'
    },
    { 
      title: 'Pending Leaves', 
      value: stats.pendingLeaves.toString(), 
      icon: InboxIcon, 
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      link: '/admin/leaves'
    },
    { 
      title: 'Approved Leaves', 
      value: stats.leaveStats?.approved?.toString() || '0', 
      icon: DocumentReportIcon, 
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      link: '/admin/leaves'
    }
  ];

  const quickActions = [
    { title: 'Manage Staff', path: '/admin/staff', description: 'Add, edit, or remove staff members', icon: UsersIcon },
    { title: 'View Reports', path: '/admin/reports', description: 'Generate monthly attendance reports', icon: DocumentReportIcon },
    { title: 'Leave Management', path: '/admin/leaves', description: 'Approve or reject leave requests', icon: InboxIcon }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#020c4c' }}></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: '#020c4c' }}>
            Admin Dashboard
          </h1>
          <div className="text-xs sm:text-sm text-gray-600 bg-white px-3 py-1.5 rounded-lg shadow-sm">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Stats Grid - 2x2 on mobile, 4 in row on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 lg:mb-10">
          {statCards.map((stat, index) => (
            <Link
              key={index}
              to={stat.link}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden group"
            >
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex flex-col items-center text-center">
                  {/* Icon - Large on mobile */}
                  <div className={`${stat.bgColor} p-2.5 sm:p-3 rounded-xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 ${stat.textColor}`} />
                  </div>
                  
                  {/* Value - Large and bold */}
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#020c4c' }}>
                    {stat.value}
                  </p>
                  
                  {/* Title - Smaller on mobile */}
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">
                    {stat.title}
                  </p>
                  
                  {/* Optional hover indicator */}
                  <div className="mt-1 sm:mt-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    View →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions - Responsive Layout */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4" style={{ color: '#020c4c' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.path}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-gray-100 group-hover:to-gray-200 transition-all duration-300">
                      <action.icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#020c4c' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-bold mb-1" style={{ color: '#020c4c' }}>
                        {action.title}
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                        {action.description}
                      </p>
                      <div className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium" style={{ color: '#7ec8f0' }}>
                        Click to manage →
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;