import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  DocumentDownloadIcon,
  ClockIcon,
  FilterIcon,
  XIcon,
} from "@heroicons/react/outline";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axiosInstance from "../../utils/axiosConfig";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/resuable/ConfirmModal";


const Reports = () => {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dayComplete, setDayComplete] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      staffId: "all",
    },
  });

  const selectedMonth = watch("month");
  const selectedYear = watch("year");

  useEffect(() => {
    fetchStaff();
    checkDayCompletion();

    const interval = setInterval(checkDayCompletion, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkDayCompletion = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    if (day === 0) {
      setDayComplete(true);
      return;
    }
    if (day === 6) {
      setDayComplete(hour >= 18); // Saturday ends at 6 PM
      return;
    }
    setDayComplete(hour >= 18); // Weekdays end at 6 PM
  };

  const fetchStaff = async () => {
    try {
      const { data } = await axiosInstance.get("/admin/staff");
      setStaff(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const fetchReport = async (formData) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/admin/reports/monthly", {
        params: {
          month: formData.month,
          year: formData.year,
          staffId: formData.staffId,
        },
      });
      setAttendance(response.data);
      setExpandedRecord(null);

      if (response.data.length === 0) {
        toast.info("No completed attendance records found for this period");
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
      setShowFilters(false);
    }
  };

  const onSubmit = async (data) => {
    const today = new Date();
    const isToday =
      parseInt(data.month) === today.getMonth() + 1 &&
      parseInt(data.year) === today.getFullYear();

    if (isToday && !dayComplete) {
      setPendingFormData(data);
      setShowReportConfirm(true);
      return;
    }

    await fetchReport(data);
  };

  const handleConfirmReport = async () => {
    if (pendingFormData) {
      await fetchReport(pendingFormData);
      setPendingFormData(null);
    }
    setShowReportConfirm(false);
  };

  const handleCancelReport = () => {
    setPendingFormData(null);
    setShowReportConfirm(false);
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const monthName = new Date(
        selectedYear,
        selectedMonth - 1,
      ).toLocaleString("default", { month: "long" });

      const addLogoAndGenerate = () => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = "/src/assets/logo.png";

        img.onload = () => {
          try {
            const maxHeight = 20;
            const maxWidth = 40;

            const originalWidth = img.width;
            const originalHeight = img.height;

            let newWidth = maxHeight;
            let newHeight = maxHeight;

            if (originalWidth > originalHeight) {
              newWidth = (originalWidth / originalHeight) * maxHeight;
              if (newWidth > maxWidth) {
                newWidth = maxWidth;
                newHeight = (originalHeight / originalWidth) * maxWidth;
              }
            } else {
              newHeight = (originalHeight / originalWidth) * newWidth;
            }
            doc.addImage(img, "PNG", 14, 8, newWidth, newHeight);
            generateReportContent(doc, monthName, true);
          } catch (err) {
            console.log("Logo error, generating without logo:", err);
            generateReportContent(doc, monthName, false);
          }
        };

        img.onerror = () => {
          console.log("Logo not found, generating without logo");
          generateReportContent(doc, monthName, false);
        };

        setTimeout(() => {
          if (img.complete === false) {
            generateReportContent(doc, monthName, false);
          }
        }, 1000);
      };

      addLogoAndGenerate();
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const generateReportContent = (doc, monthName, hasLogo) => {
    try {
      const startY = hasLogo ? 35 : 25;

      // Company Name
      if (hasLogo) {
        doc.setFontSize(16);
        doc.setTextColor(2, 12, 76);
        doc.text("Mostech Business Solutions", 45, 20);
      } else {
        doc.setFontSize(18);
        doc.setTextColor(2, 12, 76);
        doc.text("Mostech Business Solutions", 14, 20);
      }

      // Title
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Monthly Attendance Report", 14, startY);

      // Report info
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Month: ${monthName} ${selectedYear}`, 14, startY + 8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, startY + 14);
      doc.text(`Total Records: ${attendance.length}`, 14, startY + 20);

      if (attendance.length === 0) {
        doc.text("No completed attendance records found", 14, startY + 30);
        doc.save(`attendance_${monthName}_${selectedYear}.pdf`);
        toast.success("PDF downloaded successfully");
        return;
      }

      // Prepare table data - NEW SIMPLIFIED FORMAT
      const tableColumn = [
        "Staff Name",
        "Date",
        "Punch In",
        "Punch Out",
        "Worked Hours",
        "Overtime",
        "Status",
      ];
      const tableRows = [];
      const rowStatuses = [];

      attendance.forEach((item) => {
        const staffName =
          `${item.userId?.firstName || ""} ${item.userId?.lastName || ""}`.trim() ||
          "Unknown";
        const date = new Date(item.date).toLocaleDateString();
        const punchIn = item.punchIn
          ? new Date(item.punchIn).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--";
        const punchOut = item.punchOut
          ? new Date(item.punchOut).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--";
        const hours = item.totalWorkedHours?.toFixed(2) || "0";
        const overtime = item.overtimeHours?.toFixed(2) || "0";

        let statusText;
        let statusType;
        if (item.status === "present") {
          statusText = "Present";
          statusType = "present";
        } else if (item.status === "half-day") {
          statusText = "Half Day";
          statusType = "half-day";
        } else {
          statusText = "Absent";
          statusType = "absent";
        }

        tableRows.push([
          staffName,
          date,
          punchIn,
          punchOut,
          hours,
          overtime,
          statusText,
        ]);
        rowStatuses.push(statusType);
      });

      // Calculate summary
      let presentCount = 0;
      let halfDayCount = 0;
      let absentCount = 0;
      let totalHoursSum = 0;

      attendance.forEach((item) => {
        if (item.status === "present") presentCount++;
        else if (item.status === "half-day") halfDayCount++;
        else absentCount++;
        totalHoursSum += item.totalWorkedHours || 0;
      });

      // Generate table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY + 25,
        margin: { left: 10, right: 10 },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [2, 12, 76],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248],
        },
        didParseCell: function (data) {
          // Color absent rows in light red
          if (data.row.index >= 0 && rowStatuses[data.row.index] === "absent") {
            data.cell.styles.fillColor = [255, 200, 200];
            data.cell.styles.textColor = [139, 0, 0];
          }
          // Optional: Color overtime cells in orange if overtime > 0
          if (data.column.index === 5 && data.row.index >= 0) {
            const overtimeValue = parseFloat(tableRows[data.row.index][5]);
            if (overtimeValue > 0) {
              data.cell.styles.textColor = [255, 140, 0];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 22 },
          2: { cellWidth: 22 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 18 },
          6: { cellWidth: 22 },
        },
      });

      // Add summary
      const finalY = doc.lastAutoTable?.finalY || doc.autoTableEndPosY || 200;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);

      doc.text(
        `Summary: ${presentCount} Present, ${halfDayCount} Half Day, ${absentCount} Absent`,
        14,
        finalY + 8,
      );
      doc.text(
        `Total Hours Worked: ${totalHoursSum.toFixed(2)} hrs`,
        14,
        finalY + 14,
      );

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        "Generated by Mostech Business Solutions Attendance System",
        105,
        finalY + 25,
        { align: "center" },
      );

      doc.save(`attendance_${monthName}_${selectedYear}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating report content:", error);
      toast.error("Failed to generate PDF: " + error.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800";
      case "half-day":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-red-100 text-red-800";
    }
  };

  const toggleRecordExpand = (index) => {
    setExpandedRecord(expandedRecord === index ? null : index);
  };

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(2024, i).toLocaleString("default", { month: "long" }),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
          <div className="flex items-center space-x-3">
            <h1
              className="text-xl sm:text-2xl lg:text-3xl font-bold"
              style={{ color: "#020c4c" }}
            >
              Attendance Reports
            </h1>
            {attendance.length > 0 && (
              <button
                onClick={downloadPDF}
                className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-all"
                style={{ background: "#0a1a6e" }}
                title="Download PDF"
              >
                <DocumentDownloadIcon className="h-4 w-4" />
                <span className="text-sm">PDF</span>
              </button>
            )}
          </div>

          {/* Day completion status */}
          <div className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white rounded-lg shadow-sm w-full sm:w-auto">
            <p
              className={`text-xs sm:text-sm font-medium ${dayComplete ? "text-green-600" : "text-yellow-600"}`}
            >
              {dayComplete ? "✓ Day Complete" : "⚠️ Today in Progress"}
            </p>
          </div>
        </div>

        {/* Mobile Filter Toggle Button */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg shadow-md"
          >
            <div className="flex items-center space-x-2">
              <FilterIcon className="h-5 w-5" style={{ color: "#020c4c" }} />
              <span className="font-medium" style={{ color: "#020c4c" }}>
                Filter Reports
              </span>
            </div>
            {showFilters ? (
              <XIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <span className="text-sm text-gray-500">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </span>
            )}
          </button>
        </div>

        {/* Filter Form */}
        <div
          className={`${showFilters ? "block" : "hidden md:block"} mb-6 transition-all duration-300`}
        >
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Month
                  </label>
                  <select
                    {...register("month")}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {monthNames.map((month, i) => (
                      <option key={i + 1} value={i + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <select
                    {...register("year")}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {[2024, 2025, 2026].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff Member
                  </label>
                  <select
                    {...register("staffId")}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="all">All Staff</option>
                    {staff.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end space-x-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-all ${
                      loading
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:opacity-90"
                    }`}
                    style={{ background: "#020c4c" }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span>Generating...</span>
                      </div>
                    ) : (
                      "Generate Report"
                    )}
                  </button>

                  {attendance.length > 0 && (
                    <button
                      type="button"
                      onClick={downloadPDF}
                      className="md:hidden p-2 rounded-lg text-white hover:opacity-90 transition-all"
                      style={{ background: "#0a1a6e" }}
                      title="Download PDF"
                    >
                      <DocumentDownloadIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* Info message for incomplete days */}
            {!dayComplete && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs sm:text-sm text-yellow-800">
                  ⚠️ Today's attendance is still in progress. Reports will only
                  show completed days. Today's data will be available after
                  today ends.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Report Results - Simplified Table */}
        {attendance.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-3 sm:p-4 bg-gray-50 border-b">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <p className="text-xs sm:text-sm text-gray-600">
                  Showing {attendance.length} completed day record
                  {attendance.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    Total Hours:
                    <span
                      className="font-semibold ml-1"
                      style={{ color: "#020c4c" }}
                    >
                      {attendance
                        .reduce(
                          (sum, record) => sum + (record.totalWorkedHours || 0),
                          0,
                        )
                        .toFixed(2)}{" "}
                      hrs
                    </span>
                  </span>
                  <span className="text-xs text-gray-500">
                    Total Overtime:
                    <span className="font-semibold ml-1 text-orange-600">
                      {attendance
                        .reduce(
                          (sum, record) => sum + (record.overtimeHours || 0),
                          0,
                        )
                        .toFixed(2)}{" "}
                      hrs
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Table View - Simplified */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead style={{ background: "#020c4c" }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Staff Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Punch In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Punch Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Worked Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Overtime
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendance.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 text-xs font-medium">
                              {record.userId?.firstName?.charAt(0)}
                              {record.userId?.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {record.userId?.firstName} {record.userId?.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {record.punchIn
                          ? new Date(record.punchIn).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {record.punchOut
                          ? new Date(record.punchOut).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap font-mono text-sm font-medium"
                        style={{ color: "#020c4c" }}
                      >
                        {record.totalWorkedHours?.toFixed(2)} hrs
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                        {record.overtimeHours > 0 ? (
                          <span className="text-orange-600 font-medium">
                            +{record.overtimeHours?.toFixed(2)} hrs
                          </span>
                        ) : (
                          "0 hrs"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(record.status)}`}
                        >
                          {record.status === "present"
                            ? "Present"
                            : record.status === "half-day"
                              ? "Half Day"
                              : "Absent"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View - Simplified */}
            <div className="md:hidden divide-y divide-gray-200">
              {attendance.map((record, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {record.userId?.firstName?.charAt(0)}
                            {record.userId?.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {record.userId?.firstName} {record.userId?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(record.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Punch In</p>
                          <p className="font-mono text-sm">
                            {record.punchIn
                              ? new Date(record.punchIn).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "--:--"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Punch Out</p>
                          <p className="font-mono text-sm">
                            {record.punchOut
                              ? new Date(record.punchOut).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "--:--"}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleRecordExpand(index)}
                        className="mt-2 text-xs text-blue-600 font-medium"
                      >
                        {expandedRecord === index ? "Show Less" : "Show More"}
                      </button>

                      {expandedRecord === index && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-gray-500">Worked Hours</p>
                              <p
                                className="font-semibold"
                                style={{ color: "#020c4c" }}
                              >
                                {record.totalWorkedHours?.toFixed(2)} hrs
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Overtime</p>
                              <p className="font-semibold text-orange-600">
                                {record.overtimeHours?.toFixed(2) || "0"} hrs
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500">Status</p>
                              <span
                                className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(record.status)}`}
                              >
                                {record.status === "present"
                                  ? "Present"
                                  : record.status === "half-day"
                                    ? "Half Day"
                                    : "Absent"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Footer */}
            <div className="p-3 sm:p-4 bg-gray-50 border-t">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs sm:text-sm">
                <div>
                  <p className="text-gray-500">Total Records</p>
                  <p className="font-semibold" style={{ color: "#020c4c" }}>
                    {attendance.length}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Present Days</p>
                  <p className="font-semibold text-green-600">
                    {attendance.filter((r) => r.status === "present").length}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Half Days</p>
                  <p className="font-semibold text-yellow-600">
                    {attendance.filter((r) => r.status === "half-day").length}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Absent Days</p>
                  <p className="font-semibold text-red-600">
                    {attendance.filter((r) => r.status === "absent").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {attendance.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center">
            <DocumentDownloadIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm sm:text-base">
              No completed attendance records found for this period
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Try selecting a different month or year
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
              style={{ borderColor: "#020c4c" }}
            ></div>
            <p className="mt-4 text-gray-600">Generating report...</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showReportConfirm}
        onClose={handleCancelReport}
        onConfirm={handleConfirmReport}
        title="Generate Report"
        message={`Today's attendance is not yet complete. Reports will only show completed days.\n\nDo you want to continue?`}
      />
    </div>
  );
};

export default Reports;