import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  UserAddIcon,
  MailIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  CalendarIcon
} from "@heroicons/react/outline";
import axiosInstance from "../../utils/axiosConfig";

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState(null);
   const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      joiningDate: new Date().toISOString().split('T')[0] // Today's date as default
    }
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data } = await axiosInstance.get("/admin/staff");
      setStaff(data);
    } catch (error) {
      toast.error("Failed to fetch staff", error);
    }
  };

  const onSubmit = async (data) => {
    if (isSubmitting) {
      console.log("Already submitting, ignoring duplicate");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post("/admin/create-staff", data);
      toast.success(response.data.message || "Staff created successfully");
      setShowAddForm(false);
      reset({
        joiningDate: new Date().toISOString().split('T')[0] // Reset to today's date
      });
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create staff");
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    }
  };

  const toggleStaffExpand = (staffId) => {
    if (expandedStaff === staffId) {
      setExpandedStaff(null);
    } else {
      setExpandedStaff(staffId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
          <h1
            className="text-xl sm:text-2xl lg:text-3xl font-bold"
            style={{ color: "#020c4c" }}
          >
            Staff Management
          </h1>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-white w-full sm:w-auto transition-all duration-200 hover:opacity-90"
            style={{ background: "#020c4c" }}
          >
            <UserAddIcon className="h-5 w-5" />
            <span>{showAddForm ? "Cancel" : "Add Staff"}</span>
          </button>
        </div>

        {/* Add Staff Form - Responsive */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 animate-slideDown">
            <h2
              className="text-lg sm:text-xl font-bold mb-4 sm:mb-6"
              style={{ color: "#020c4c" }}
            >
              Add New Staff Member
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    {...register("firstName", {
                      required: "First name is required",
                    })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    {...register("lastName", {
                      required: "Last name is required",
                    })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <MailIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    className="w-full pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="staff@company.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Joining Date
                </label>
                <div className="relative">
                  <CalendarIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    {...register('joiningDate')}
                    max={new Date().toISOString().split('T')[0]} // Can't select future date
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use today's date
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "#020c4c" }}
                >
                  {isSubmitting ? "Creating..." : "Create Staff"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Staff List - Responsive Table/Cards */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead style={{ background: "#020c4c" }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Joined Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staff.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center">
                        <UserIcon className="h-12 w-12 text-gray-300 mb-2" />
                        <p className="text-sm">No staff members found</p>
                        <button
                          onClick={() => setShowAddForm(true)}
                          className="mt-3 px-4 py-2 text-sm rounded-lg text-white"
                          style={{ background: "#020c4c" }}
                        >
                          Add your first staff member
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => (
                    <tr
                      key={member._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="flex items-center justify-center w-full h-full">
                              {member.profileImage ? (
                                <img
                                  src={member.profileImage}
                                  alt={`${member.firstName} ${member.lastName}`}
                                  className="w-full h-full object-cover rounded-full"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = "none";
                                    e.target.parentElement.innerHTML = `${member.firstName?.charAt(0)}${member.lastName?.charAt(0)}`;
                                  }}
                                />
                              ) : (
                                <span className="text-blue-600 font-medium">
                                  {member.firstName?.charAt(0)}
                                  {member.lastName?.charAt(0)}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(member.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View - Visible only on mobile */}
          <div className="md:hidden">
            {staff.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center">
                  <UserIcon className="h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    No staff members found
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-3 px-4 py-2 text-sm rounded-lg text-white"
                    style={{ background: "#020c4c" }}
                  >
                    Add your first staff member
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {staff.map((member) => (
                  <div
                    key={member._id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="flex items-center justify-center w-full h-full">
                            {member.profileImage ? (
                              <img
                                src={member.profileImage}
                                alt={`${member.firstName} ${member.lastName}`}
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = "none";
                                  e.target.parentElement.innerHTML = `${member.firstName?.charAt(0)}${member.lastName?.charAt(0)}`;
                                }}
                              />
                            ) : (
                              <span className="text-blue-600 font-medium">
                                {member.firstName?.charAt(0)}
                                {member.lastName?.charAt(0)}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="text-base font-semibold text-gray-900">
                            {member.firstName} {member.lastName}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {member.email}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleStaffExpand(member._id)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {expandedStaff === member._id ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    </div>

                    {/* Expanded Details */}
                    {expandedStaff === member._id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 animate-slideDown">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                              Joined Date:
                            </span>
                            <span className="text-sm font-medium text-gray-700">
                              {new Date(member.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                              Status:
                            </span>
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                              Email:
                            </span>
                            <span className="text-sm text-gray-700 break-all text-right ml-2">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Staff Count Summary */}
        {staff.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Total Staff Members:{" "}
            <span className="font-semibold" style={{ color: "#020c4c" }}>
              {staff.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffManagement;
