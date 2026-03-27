import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  UsersIcon,
  CalendarIcon,
  DocumentReportIcon,
  InboxIcon,
  ClockIcon,
  ChevronDownIcon,
} from "@heroicons/react/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
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
  const [chartPeriod, setChartPeriod] = useState("7days"); // 'today', '7days', 'month'
  const [showDropdown, setShowDropdown] = useState(false);
  const [chartType, setChartType] = useState("bar"); // 'bar' or 'line'

  useEffect(() => {
    fetchAllData();

    // Refresh live data every 30 seconds
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch attendance summary when period changes
    fetchAttendanceSummary();
  }, [chartPeriod]);

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
      setWorkingStaffList(response.data?.records);
      setStats((prev) => ({
        ...prev,
        activeNow: response.data?.records?.length,
      }));
    } catch (error) {
      console.error("Error fetching live data:", error);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      let daysParam = "";
      if (chartPeriod === "today") {
        daysParam = "?days=1";
      } else if (chartPeriod === "7days") {
        daysParam = "?days=7";
      } else if (chartPeriod === "month") {
        daysParam = "?days=30";
      }

      const response = await axiosInstance.get(
        `/admin/dashboard/attendance-summary${daysParam}`
      );
      const rawData = response.data || [];

      // Format data for charts
      const formattedData = rawData.map((item) => ({
        date: new Date(item.date).toLocaleDateString("en-US", {
          weekday: chartPeriod === "month" ? "short" : "short",
          month: chartPeriod === "month" ? "short" : undefined,
          day: "numeric",
        }).replace(/,/g, ''),
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

  const getChartTitle = () => {
    switch (chartPeriod) {
      case "today":
        return "Today's Attendance";
      case "7days":
        return "Last 7 Days Attendance";
      case "month":
        return "This Month Attendance";
      default:
        return "Attendance Analytics";
    }
  };

  const getChartSubtitle = () => {
    switch (chartPeriod) {
      case "today":
        return "Hourly attendance breakdown for today";
      case "7days":
        return "Daily attendance trend for the last 7 days";
      case "month":
        return "Daily attendance trend for this month";
      default:
        return "Daily presence trend";
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

  // Calculate totals for display
  const totalPresent = attendanceData.reduce((sum, day) => sum + day.present, 0);
  const totalHalfDay = attendanceData.reduce((sum, day) => sum + day["half-day"], 0);
  const totalAbsent = attendanceData.reduce((sum, day) => sum + day.absent, 0);
  const totalWorking = stats.activeNow;

  // Custom Tooltip for better visualization
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 sm:p-3 rounded-lg shadow-lg border border-gray-200 text-xs sm:text-sm">
          <p className="font-semibold text-gray-800 mb-1 sm:mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
              <div
                className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="text-gray-600 text-xs sm:text-sm">{entry.name}:</span>
              <span className="font-semibold text-xs sm:text-sm" style={{ color: entry.color }}>
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "#020c4c" }}>
            Dashboard
          </h1>

          {stats.activeNow > 0 && (
            <div className="flex items-center space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-50 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs sm:text-sm font-medium text-green-600">
                {stats.activeNow} currently working
              </span>
            </div>
          )}
        </div>

        {/* Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Stats Cards + Chart */}
          <div className="flex-1">
            {/* 3 Big Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6">
              {statCards.map((stat, index) => (
                <Link
                  key={index}
                  to={stat.link}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-4 sm:p-6 group hover:-translate-y-1"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div
                        className={`${stat.bgColor} p-2 sm:p-3 rounded-xl group-hover:scale-110 transition-transform`}
                      >
                        <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.textColor}`} />
                      </div>
                      <div className="text-right">
                        <p
                          className="text-2xl sm:text-3xl md:text-4xl font-bold"
                          style={{ color: "#020c4c" }}
                        >
                          {stat.value}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-xs sm:text-sm font-medium">
                      {stat.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to view →
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Attendance Analytics Chart */}
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                    {getChartTitle()}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {getChartSubtitle()}
                  </p>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  {/* Chart Type Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setChartType("bar")}
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition ${
                        chartType === "bar"
                          ? "bg-white shadow-sm text-blue-600"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      Bar
                    </button>
                    <button
                      onClick={() => setChartType("line")}
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition ${
                        chartType === "line"
                          ? "bg-white shadow-sm text-blue-600"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      Line
                    </button>
                  </div>
                  
                  {/* Dropdown for chart period */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
                    >
                      <span className="text-gray-700">
                        {chartPeriod === "today" && "Today"}
                        {chartPeriod === "7days" && "Last 7 Days"}
                        {chartPeriod === "month" && "This Month"}
                      </span>
                      <ChevronDownIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                    </button>
                    
                    {showDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowDropdown(false)}
                        ></div>
                        <div className="absolute right-0 mt-2 w-36 sm:w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                          <button
                            onClick={() => {
                              setChartPeriod("today");
                              setShowDropdown(false);
                            }}
                            className={`w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-50 first:rounded-t-lg ${
                              chartPeriod === "today" ? "bg-blue-50 text-blue-600" : "text-gray-700"
                            }`}
                          >
                            Today
                          </button>
                          <button
                            onClick={() => {
                              setChartPeriod("7days");
                              setShowDropdown(false);
                            }}
                            className={`w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-50 ${
                              chartPeriod === "7days" ? "bg-blue-50 text-blue-600" : "text-gray-700"
                            }`}
                          >
                            Last 7 Days
                          </button>
                          <button
                            onClick={() => {
                              setChartPeriod("month");
                              setShowDropdown(false);
                            }}
                            className={`w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-50 last:rounded-b-lg ${
                              chartPeriod === "month" ? "bg-blue-50 text-blue-600" : "text-gray-700"
                            }`}
                          >
                            This Month
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {attendanceData.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[280px] sm:min-w-full">
                    <ResponsiveContainer width="100%" height={300}>
                      {chartType === "bar" ? (
                        <BarChart
                          data={attendanceData}
                          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                          barGap={2}
                          barCategoryGap={4}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                            interval={chartPeriod === "month" ? 2 : 0}
                            angle={chartPeriod === "month" ? -45 : 0}
                            textAnchor={chartPeriod === "month" ? "end" : "middle"}
                            height={chartPeriod === "month" ? 50 : 30}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                            width={30}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend 
                            verticalAlign="top" 
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ paddingBottom: 10, fontSize: 10 }}
                          />
                          <Bar
                            dataKey="present"
                            name="Present"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                          <Bar
                            dataKey="working"
                            name="Working Now"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                          <Bar
                            dataKey="half-day"
                            name="Half Day"
                            fill="#f59e0b"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                          <Bar
                            dataKey="absent"
                            name="Absent"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                        </BarChart>
                      ) : (
                        <LineChart
                          data={attendanceData}
                          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                            interval={chartPeriod === "month" ? 2 : 0}
                            angle={chartPeriod === "month" ? -45 : 0}
                            textAnchor={chartPeriod === "month" ? "end" : "middle"}
                            height={chartPeriod === "month" ? 50 : 30}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                            width={30}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend 
                            verticalAlign="top" 
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ paddingBottom: 10, fontSize: 10 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="present"
                            name="Present"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="working"
                            name="Working Now"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="half-day"
                            name="Half Day"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="absent"
                            name="Absent"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                  No attendance data available for the selected period
                </div>
              )}

              {/* Attendance Rate Summary - Responsive */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 border-t border-gray-100">
                <div className="text-center p-2 bg-emerald-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                    {totalPresent}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Present</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {totalWorking}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Working Now</p>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                    {totalHalfDay}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Half Day</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-red-600">
                    {totalAbsent}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Absent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="lg:w-80">
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 sticky top-6">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    to={action.path}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors">
                      <action.icon
                        className="h-4 w-4 sm:h-5 sm:w-5"
                        style={{ color: "#020c4c" }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-xs sm:text-sm">
                        {action.title}
                      </p>
                      <p className="text-xs text-gray-500 hidden sm:block">
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