import React, { useState, useEffect } from "react";
import {
  DocumentTextIcon,
  CalendarIcon,
  SearchIcon,
  FilterIcon,
  XIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
} from "@heroicons/react/outline";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axiosInstance from "../../utils/axiosConfig";
import toast from "react-hot-toast";
import ReportModal from "../../components/resuable/ReportModal";

const StaffDailyReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedReport, setExpandedReport] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [filterType, setFilterType] = useState("all"); // 'all', 'monthly', 'custom'
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [filterType, dateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      let url = "/staff/reports/daily";
      const params = new URLSearchParams();

      if (filterType === "monthly") {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      } else if (
        filterType === "custom" &&
        dateRange.startDate &&
        dateRange.endDate
      ) {
        params.append("startDate", dateRange.startDate);
        params.append("endDate", dateRange.endDate);
      }

      const queryString = params.toString();
      const { data } = await axiosInstance.get(
        `${url}${queryString ? `?${queryString}` : ""}`,
      );
      setReports(data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load daily reports");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((report) => {
    if (!searchTerm) return true;
    const workDone = report.workDone?.toLowerCase() || "";
    const accomplishments = report.accomplishments?.toLowerCase() || "";
    const challenges = report.challenges?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return (
      workDone.includes(search) ||
      accomplishments.includes(search) ||
      challenges.includes(search)
    );
  });

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();

      // Get title based on filter
      let title = "My Daily Work Reports";
      if (filterType === "monthly") {
        const monthName = new Date().toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
        title = `My Daily Work Reports - ${monthName}`;
      } else if (
        filterType === "custom" &&
        dateRange.startDate &&
        dateRange.endDate
      ) {
        title = `My Daily Work Reports (${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()})`;
      }

      // Header
      doc.setFontSize(18);
      doc.setTextColor(2, 12, 76);
      doc.text("Mostech Business Solutions", 14, 20);

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(title, 14, 32);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 40);
      doc.text(`Total Reports: ${filteredReports.length}`, 14, 46);

      if (filteredReports.length === 0) {
        doc.text("No reports found", 14, 60);
        doc.save("my_daily_reports.pdf");
        toast.success("PDF downloaded");
        return;
      }

      const tableColumn = [
        "Date",
        "Work Done",
        "Accomplishments",
        "Challenges",
        "Tomorrow Plan",
      ];
      const tableRows = [];

      filteredReports.forEach((report) => {
        const date = new Date(report.date).toLocaleDateString();
        const workDone = report.workDone?.substring(0, 80) || "-";
        const accomplishments = report.accomplishments?.substring(0, 80) || "-";
        const challenges = report.challenges?.substring(0, 80) || "-";
        const tomorrowPlan = report.tomorrowPlan?.substring(0, 80) || "-";

        tableRows.push([
          date,
          workDone,
          accomplishments,
          challenges,
          tomorrowPlan,
        ]);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 54,
        margin: { left: 10, right: 10 },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: "linebreak",
          cellWidth: "wrap",
        },
        headStyles: {
          fillColor: [2, 12, 76],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 45 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
        },
        didDrawPage: function (data) {
          // Add footer on each page
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: "center" },
          );
        },
      });

      doc.save(`daily_reports_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const viewReport = (report) => {
  setSelectedReport(report);
  setShowReportModal(true);
};

  const handleAddRemark = async (remark) => {
  try {
    await axiosInstance.post(`/staff/reports/${selectedReport._id}/remark`, {
      remark: remark
    });
    toast.success("Remark added successfully");
    fetchReports(); // Refresh to show new remark
    return true;
  } catch (error) {
    console.error("Error adding remark:", error);
    toast.error(error.response?.data?.message || "Failed to add remark");
    throw error;
  }
};
  const getStatusIcon = (hasContent) => {
    if (hasContent && hasContent.trim()) {
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    }
    return <XCircleIcon className="h-4 w-4 text-gray-300" />;
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon
                className="h-7 w-7 sm:h-8 sm:w-8"
                style={{ color: "#020c4c" }}
              />
              <h1
                className="text-lg sm:text-xl lg:text-2xl font-bold"
                style={{ color: "#020c4c" }}
              >
                My Daily Reports
              </h1>
            </div>
            {filteredReports.length > 0 && (
              <button
                onClick={downloadPDF}
                className="sm:hidden flex items-center space-x-2 px-3 py-1.5 rounded-lg text-white hover:opacity-90"
                style={{ background: "#0a1a6e" }}
              >
                <DocumentTextIcon className="h-4 w-4" />
                <span className="text-xs">PDF</span>
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Stats Summary - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500">Total Reports</p>
            <p
              className="text-lg sm:text-xl font-bold"
              style={{ color: "#020c4c" }}
            >
              {reports.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500">This Month</p>
            <p className="text-lg sm:text-xl font-bold text-blue-600">
              {
                reports.filter(
                  (r) => new Date(r.date).getMonth() === new Date().getMonth(),
                ).length
              }
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500">Completed</p>
            <p className="text-lg sm:text-xl font-bold text-green-600">
              {reports.filter((r) => r.workDone && r.workDone.trim()).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 text-center">
            <p className="text-xs text-gray-500">With Plan</p>
            <p className="text-lg sm:text-xl font-bold text-orange-600">
              {
                reports.filter((r) => r.tomorrowPlan && r.tomorrowPlan.trim())
                  .length
              }
            </p>
          </div>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center space-x-2">
              <FilterIcon className="h-5 w-5" style={{ color: "#020c4c" }} />
              <span
                className="font-medium text-sm"
                style={{ color: "#020c4c" }}
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </span>
            </div>
            {!showFilters && filterType !== "all" && (
              <span className="text-xs text-gray-500">
                {filterType === "monthly" ? "This Month" : "Custom Range"}
              </span>
            )}
          </button>
        </div>

        {/* Filter Section - Responsive */}
        <div className={`${showFilters ? "block" : "hidden md:block"} mb-6`}>
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                  Filter:
                </span>
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filterType === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All Reports
                </button>
                <button
                  onClick={() => setFilterType("monthly")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filterType === "monthly"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setFilterType("custom")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filterType === "custom"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Custom Range
                </button>
              </div>

              {filterType === "custom" && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative">
                    <CalendarIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) =>
                        setDateRange({
                          ...dateRange,
                          startDate: e.target.value,
                        })
                      }
                      className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-full"
                    />
                  </div>
                  <span className="text-gray-500 text-center hidden sm:inline">
                    to
                  </span>
                  <div className="relative">
                    <CalendarIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, endDate: e.target.value })
                      }
                      className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-full"
                    />
                  </div>
                  <button
                    onClick={fetchReports}
                    className="px-4 py-2 text-sm text-white rounded-lg hover:opacity-90"
                    style={{ background: "#020c4c" }}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reports List - Responsive */}
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base">
              No daily reports found
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {searchTerm
                ? "Try a different search term"
                : "Submit your first report after punching out"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report, index) => (
              <div
                key={report._id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setExpandedReport(expandedReport === index ? null : index)
                  }
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center space-x-3">
                      <div className="flex-shrink-0">
                        <CalendarIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">
                          {new Date(report.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(report.workDone)}
                            <span className="text-xs text-gray-500">Work</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(report.accomplishments)}
                            <span className="text-xs text-gray-500">
                              Accomplishments
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(report.tomorrowPlan)}
                            <span className="text-xs text-gray-500">Plan</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {expandedReport === index && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-2 mb-2">
                          <DocumentTextIcon className="h-4 w-4" />
                          <span>What I did today</span>
                        </h4>
                        <p className="text-sm text-gray-600 bg-white p-3 rounded-lg">
                          {report.workDone || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-2 mb-2">
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          <span>Key Accomplishments</span>
                        </h4>
                        <p className="text-sm text-gray-600 bg-white p-3 rounded-lg">
                          {report.accomplishments || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-2 mb-2">
                          <XCircleIcon className="h-4 w-4 text-orange-500" />
                          <span>Challenges / Blockers</span>
                        </h4>
                        <p className="text-sm text-gray-600 bg-white p-3 rounded-lg">
                          {report.challenges || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-2 mb-2">
                          <ClockIcon className="h-4 w-4 text-blue-500" />
                          <span>Plan for Tomorrow</span>
                        </h4>
                        <p className="text-sm text-gray-600 bg-white p-3 rounded-lg">
                          {report.tomorrowPlan || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 text-right">
                      <button
                        onClick={() => viewReport(report)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Full Report →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ReportModal
  isOpen={showReportModal}
  onClose={() => {
    setShowReportModal(false);
    setSelectedReport(null);
  }}
  date={selectedReport?.date}
  existingReport={selectedReport}
  onAddRemark={handleAddRemark}
  onSubmit={() => {}} // No submit for view mode
/>
    </div>
  );
};

export default StaffDailyReports;
