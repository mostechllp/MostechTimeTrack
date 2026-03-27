import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  UsersIcon,
  CalendarIcon,
  DocumentReportIcon,
  InboxIcon,
  ClockIcon,
} from "@heroicons/react/outline";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosConfig";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStaff: 0,
    presentToday: 0,
    activeNow: 0,
    pendingLeaves: 0,
    leaveStats: {
      pending: 0,
      approved: 0,
      rejected: 0,
    },
    recentActivity: [],
  });

  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setWorkingStaffList] = useState([]);

  useEffect(() => {
    fetchAllData();

    // Refresh live data every 30 seconds
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchLiveData(),
        fetchAttendanceSummary(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const statsResponse = await axiosInstance.get("/admin/dashboard/stats");
      setStats((prev) => ({
        ...prev,
        totalStaff: statsResponse.data?.totalStaff || 0,
        presentToday: statsResponse.data?.presentToday || 0,
        pendingLeaves: statsResponse.data?.pendingLeaves || 0,
        leaveStats: {
          pending: statsResponse.data?.leaveStats?.pending || 0,
          approved: statsResponse.data?.leaveStats?.approved || 0,
          rejected: statsResponse.data?.leaveStats?.rejected || 0,
        },
        recentActivity: statsResponse.data?.recentActivity || [],
      }));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    }
  };

  const fetchLiveData = async () => {
    try {
      const response = await axiosInstance.get("/admin/reports/live");
      const activeStaff = response.data?.records?.filter(r => r.isActive) || [];
      setWorkingStaffList(activeStaff);
      setStats((prev) => ({
        ...prev,
        activeNow: activeStaff.length,
      }));
    } catch (error) {
      console.error("Error fetching live data:", error);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      const response = await axiosInstance.get(
        "/admin/dashboard/attendance-summary?days=7",
      );
      const rawData = response.data || [];

      // Format data for charts
      const formattedData = rawData.map((item) => ({
        date: new Date(item.date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        present: item.present || 0,
        absent: item.absent || 0,
        "half-day": item["half-day"] || 0,
        working: item.working || 0,
      }));

      setAttendanceData(formattedData);
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
    }
  };

  const statCards = [
    {
      title: "Total Staff",
      value: stats.totalStaff.toString(),
      icon: UsersIcon,
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      link: "/admin/staff",
    },
    {
      title: "Currently Working",
      value: stats.activeNow.toString(),
      icon: ClockIcon,
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      link: "/admin/reports",
    },
    {
      title: "Pending Leaves",
      value: stats.pendingLeaves.toString(),
      icon: InboxIcon,
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-600",
      link: "/admin/leaves",
    },
  ];

  const quickActions = [
    {
      title: "Manage Staff",
      path: "/admin/staff",
      description: "Add, edit, or remove staff members",
      icon: UsersIcon,
    },
    {
      title: "View Reports",
      path: "/admin/reports",
      description: "Generate monthly attendance reports",
      icon: DocumentReportIcon,
    },
    {
      title: "Leave Management",
      path: "/admin/leaves",
      description: "Approve or reject leave requests",
      icon: InboxIcon,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
            style={{ borderColor: "#020c4c" }}
          ></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate totals for display - USE LIVE WORKING COUNT for the summary
  const totalPresent = attendanceData.reduce((sum, day) => sum + day.present, 0);
  const totalHalfDay = attendanceData.reduce((sum, day) => sum + day["half-day"], 0);
  const totalAbsent = attendanceData.reduce((sum, day) => sum + day.absent, 0);
  // Use the live working count for today's summary
  const totalWorking = stats.activeNow;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "#020c4c" }}>
            Dashboard
          </h1>

          {stats.activeNow > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-green-600">
                {stats.activeNow} currently working
              </span>
            </div>
          )}
        </div>

        {/* Split Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Stats Cards + Chart */}
          <div className="flex-1">
            {/* 3 Big Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {statCards.map((stat, index) => (
                <Link
                  key={index}
                  to={stat.link}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-6 group hover:-translate-y-1"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`${stat.bgColor} p-3 rounded-xl group-hover:scale-110 transition-transform`}
                      >
                        <stat.icon className={`h-8 w-8 ${stat.textColor}`} />
                      </div>
                      <div className="text-right">
                        <p
                          className="text-4xl font-bold"
                          style={{ color: "#020c4c" }}
                        >
                          {stat.value}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm font-medium">
                      {stat.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to view →
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Attendance Analytics Chart - Area Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Attendance Trends
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Last 7 days attendance overview
                  </p>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-gray-600">Present</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">Working Now</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-600">Half Day</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-600">Absent</span>
                  </div>
                </div>
              </div>

              {attendanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart
                    data={attendanceData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorWorking" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorHalfDay" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      iconType="circle"
                    />
                    <Area
                      type="monotone"
                      dataKey="present"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#colorPresent)"
                      name="Present"
                    />
                    <Area
                      type="monotone"
                      dataKey="working"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#colorWorking)"
                      name="Working Now"
                    />
                    <Area
                      type="monotone"
                      dataKey="half-day"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#colorHalfDay)"
                      name="Half Day"
                    />
                    <Area
                      type="monotone"
                      dataKey="absent"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#colorAbsent)"
                      name="Absent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-gray-500">
                  No attendance data available for the last 7 days
                </div>
              )}

              {/* Attendance Rate Summary - USING LIVE DATA FOR WORKING NOW */}
              <div className="grid grid-cols-4 gap-3 mt-6 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {totalPresent}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Present</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {totalWorking}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Working Now</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {totalHalfDay}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Half Day</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {totalAbsent}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Absent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="lg:w-80">
            <div className="bg-white rounded-xl shadow-md p-5 sticky top-6">
              <h3 className="text-base font-semibold text-gray-800 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    to={action.path}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="p-2.5 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors">
                      <action.icon
                        className="h-5 w-5"
                        style={{ color: "#020c4c" }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">
                        {action.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {action.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;