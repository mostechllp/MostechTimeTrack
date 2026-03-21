import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  DocumentDownloadIcon,
  ClockIcon,
  FilterIcon,
  XIcon,
} from "@heroicons/react/outline";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axiosInstance from "../../utils/axiosConfig";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/resuable/ConfirmModal";

// Active Staff Today Section
const ActiveStaffToday = () => {
  const [activeStaff, setActiveStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchActiveStaff();
    const interval = setInterval(fetchActiveStaff, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchActiveStaff = async () => {
    try {
      const { data } = await axiosInstance.get("/admin/reports/live");
      const active = data.records.filter((r) => r.isActive);
      setActiveStaff(active);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching active staff:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex items-center space-x-2">
          <div
            className="animate-spin rounded-full h-4 w-4 border-b-2"
            style={{ borderColor: "#020c4c" }}
          ></div>
          <span className="text-sm text-gray-500">Loading active staff...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="font-semibold" style={{ color: "#020c4c" }}>
            Currently Working ({activeStaff.length})
          </h3>
        </div>
        <span className="text-xs text-gray-400">
          Updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {activeStaff.map((staff) => (
          <div
            key={staff._id}
            className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-full"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-800">
              {staff.userId?.firstName} {staff.userId?.lastName}
            </span>
          </div>
        ))}
        {activeStaff.length === 0 && (
          <div className="flex items-center space-x-2 text-gray-500">
            <ClockIcon className="h-4 w-4" />
            <p className="text-sm">No one is currently working</p>
          </div>
        )}
      </div>

      {activeStaff.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Click refresh if you don't see updates
          </p>
        </div>
      )}
    </div>
  );
};

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
      setDayComplete(hour >= 13);
      return;
    }

    setDayComplete(hour >= 18);
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
      // Store the form data and show confirmation modal
      setPendingFormData(data);
      setShowReportConfirm(true);
      return;
    }

    // If not today or day is complete, fetch report directly
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
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
    
    const addLogoAndGenerate = () => {
      // Create a canvas to handle logo
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = '/src/assets/logo.png'; 
      
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
          doc.addImage(img, 'PNG', 14, 8, newWidth, newHeight);
          generateReportContent(doc, monthName, true);
        } catch (err) {
          console.error('Logo error, generating without logo:', err);
          generateReportContent(doc, monthName, false);
        }
      };
      
      img.onerror = () => {
        console.error('Logo not found, generating without logo');
        generateReportContent(doc, monthName, false);
      };
      
      // Set a timeout in case image loading takes too long
      setTimeout(() => {
        if (img.complete === false) {
          generateReportContent(doc, monthName, false);
        }
      }, 1000);
    };
    
    addLogoAndGenerate();
    
  } catch (error) {
    console.error('PDF Generation Error:', error);
    toast.error('Failed to generate PDF');
  }
};

const generateReportContent = (doc, monthName, hasLogo) => {
  try {
    const startY = hasLogo ? 35 : 25;
    
    // Company Name
    if (hasLogo) {
      doc.setFontSize(16);
      doc.setTextColor(2, 12, 76);
    } else {
      doc.setFontSize(18);
      doc.setTextColor(2, 12, 76);
      doc.text('Mostech Business Solutions', 14, 20);
    }
    
    // Title
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Monthly Attendance Report', 14, startY);
    
    // Report info
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Month: ${monthName} ${selectedYear}`, 14, startY + 8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, startY + 14);
    doc.text(`Total Records: ${attendance.length}`, 14, startY + 20);
    
    if (attendance.length === 0) {
      doc.text('No completed attendance records found', 14, startY + 30);
      doc.save(`attendance_${monthName}_${selectedYear}.pdf`);
      toast.success('PDF downloaded successfully');
      return;
    }
    
    // Prepare table data
    const tableColumn = [
      "Staff Name", 
      "Date", 
      "Morning Start", 
      "Morning End", 
      "Afternoon Start", 
      "Afternoon End", 
      "Total Hours", 
      "Status"
    ];
    const tableRows = [];

    attendance.forEach(item => {
      const staffName = `${item.userId?.firstName || ''} ${item.userId?.lastName || ''}`.trim() || 'Unknown';
      const date = new Date(item.date).toLocaleDateString();
      
      // Morning session details
      const morningStart = item.morningSession?.punchIn 
        ? new Date(item.morningSession.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--:--';
      const morningEnd = item.morningSession?.punchOut 
        ? new Date(item.morningSession.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--:--';
      
      // Afternoon session details
      const afternoonStart = item.afternoonSession?.punchIn 
        ? new Date(item.afternoonSession.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--:--';
      const afternoonEnd = item.afternoonSession?.punchOut 
        ? new Date(item.afternoonSession.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--:--';
      
      const hours = item.totalWorkedHours?.toFixed(2) || '0';
      const status = item.status === 'present' ? 'Present' : item.status === 'half-day' ? 'Half Day' : 'Absent';
      
      tableRows.push([staffName, date, morningStart, morningEnd, afternoonStart, afternoonEnd, hours, status]);
    });

    // Generate table using autoTable
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: startY + 25,
      margin: { left: 10, right: 10 },
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [2, 12, 76],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: { 
        fillColor: [248, 248, 248]
      },
      columnStyles: {
        0: { cellWidth: 32 }, // Staff Name
        1: { cellWidth: 22 }, // Date
        2: { cellWidth: 22 }, // Morning Start
        3: { cellWidth: 22 }, // Morning End
        4: { cellWidth: 25 }, // Afternoon Start
        5: { cellWidth: 25 }, // Afternoon End
        6: { cellWidth: 18 }, // Total Hours
        7: { cellWidth: 22 }  // Status
      }
    });
    
    // Add summary
    const finalY = doc.lastAutoTable?.finalY || doc.autoTableEndPosY || 200;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    
    const totalPresent = attendance.filter(r => r.status === 'present').length;
    const totalHalfDay = attendance.filter(r => r.status === 'half-day').length;
    const totalAbsent = attendance.filter(r => r.status === 'absent').length;
    const totalHours = attendance.reduce((sum, r) => sum + (r.totalWorkedHours || 0), 0);
    
    doc.text(`Summary: ${totalPresent} Present, ${totalHalfDay} Half Day, ${totalAbsent} Absent`, 14, finalY + 8);
    doc.text(`Total Hours Worked: ${totalHours.toFixed(2)} hrs`, 14, finalY + 14);
    
    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by Mostech Business Solutions Attendance System', 105, finalY + 25, { align: 'center' });
    
    // Save the PDF
    doc.save(`attendance_${monthName}_${selectedYear}.pdf`);
    toast.success('PDF downloaded successfully');
    
  } catch (error) {
    console.error('Error generating report content:', error);
    toast.error('Failed to generate PDF: ' + error.message);
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
    if (expandedRecord === index) {
      setExpandedRecord(null);
    } else {
      setExpandedRecord(index);
    }
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

        {/* === ADD THE ACTIVE STAFF COMPONENT HERE === */}
        <ActiveStaffToday />

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
                  show completed days. Today's data will be available after 6:00
                  PM (1:00 PM on Saturday).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Report Results */}
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
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
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
                      Morning
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Afternoon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Total Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendance.map((record, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
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
                              {record.userId?.firstName}{" "}
                              {record.userId?.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(record.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.morningSession?.isPresent
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {record.morningSession?.isPresent
                            ? "Present"
                            : "Absent"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.afternoonSession?.isPresent
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {record.afternoonSession?.isPresent
                            ? "Present"
                            : "Absent"}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap font-mono text-sm font-medium"
                        style={{ color: "#020c4c" }}
                      >
                        {record.totalWorkedHours?.toFixed(2)} hrs
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

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {attendance.map((record, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
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
                            {new Date(record.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-4">
                            <span className="text-xs text-gray-500">
                              Morning:
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                record.morningSession?.isPresent
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {record.morningSession?.isPresent
                                ? "✓ Present"
                                : "✗ Absent"}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-xs text-gray-500">
                              Afternoon:
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                record.afternoonSession?.isPresent
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {record.afternoonSession?.isPresent
                                ? "✓ Present"
                                : "✗ Absent"}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleRecordExpand(index)}
                          className="text-xs text-blue-600 font-medium"
                        >
                          {expandedRecord === index ? "Less" : "More"}
                        </button>
                      </div>

                      {expandedRecord === index && (
                        <div className="mt-3 pt-3 border-t border-gray-100 animate-slideDown">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">
                                Total Hours
                              </p>
                              <p
                                className="font-semibold"
                                style={{ color: "#020c4c" }}
                              >
                                {record.totalWorkedHours?.toFixed(2)} hrs
                              </p>
                            </div>
                            <div>
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
