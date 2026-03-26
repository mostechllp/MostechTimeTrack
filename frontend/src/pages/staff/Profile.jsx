import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { 
  CameraIcon, 
  LockClosedIcon, 
  EyeIcon, 
  EyeOffIcon,
  UserIcon,
  MailIcon,
  LogoutIcon
} from "@heroicons/react/outline";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmModal from "../../components/resuable/ConfirmModal";

const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23020c4c' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.profileImage || null);
  const [uploading, setUploading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Password change states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    watch,
    reset: resetPasswordForm,
  } = useForm();

  const getImageUrl = () => {
    if (previewUrl) return previewUrl;
    if (user?.profileImage) {
      if (user.profileImage.startsWith("http")) {
        return user.profileImage;
      }
      return `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${user.profileImage}`;
    }
    return DEFAULT_AVATAR;
  };

  const logoutConfirm = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
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

  const onProfileSubmit = async (data) => {
    const formData = new FormData();
    formData.append("firstName", data.firstName);
    formData.append("lastName", data.lastName);
    if (selectedFile) {
      formData.append("profileImage", selectedFile);
    }

    try {
      setUploading(true);
      const response = await axiosInstance.put("/staff/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.user) {
        updateUser({
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName,
          profileImage: response.data.user.profileImage,
        });
      }

      toast.success("Profile updated successfully");
      setSelectedFile(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setUploading(false);
    }
  };

  const onChangePassword = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      await axiosInstance.post("/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password changed successfully");
      setShowChangePassword(false);
      resetPasswordForm();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: "#020c4c" }}>
              Profile Settings
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage your personal information and security settings</p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden sticky top-24">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 text-center">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg mx-auto">
                      <img
                        src={getImageUrl()}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_AVATAR;
                        }}
                      />
                    </div>
                    <label
                      htmlFor="profile-image"
                      className="absolute bottom-0 right-0 p-2 rounded-full cursor-pointer hover:opacity-90 transition shadow-lg"
                      style={{ background: "#020c4c" }}
                    >
                      <CameraIcon className="h-4 w-4 text-white" />
                      <input
                        type="file"
                        id="profile-image"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  
                  <h2 className="mt-4 text-xl font-semibold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mt-2 bg-blue-100 text-blue-800">
                    {user?.role} Account
                  </span>
                </div>

                <div className="p-6 border-t border-gray-200">
                  <button
                    onClick={logoutConfirm}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200"
                  >
                    <LogoutIcon className="h-5 w-5" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Forms */}
            <div className="lg:col-span-2">
              {/* Profile Information Card */}
              <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold flex items-center space-x-2" style={{ color: "#020c4c" }}>
                    <UserIcon className="h-5 w-5" />
                    <span>Personal Information</span>
                  </h2>
                </div>
                
                <div className="p-6">
                  <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            {...register("firstName", { required: "First name is required" })}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter first name"
                          />
                        </div>
                        {errors.firstName && (
                          <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            {...register("lastName", { required: "Last name is required" })}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter last name"
                          />
                        </div>
                        {errors.lastName && (
                          <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          value={user?.email}
                          disabled
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                    </div>

                    {!uploading && selectedFile && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700 flex items-center space-x-2">
                          <span className="text-lg">💡</span>
                          <span>New photo selected. Click "Update Profile" to save changes.</span>
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={uploading}
                        className={`px-6 py-2.5 rounded-lg text-white font-medium transition-all ${
                          uploading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 hover:scale-[1.02]"
                        }`}
                        style={{ background: uploading ? "#6b7280" : "#020c4c" }}
                      >
                        {uploading ? "Updating..." : "Update Profile"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Security Card */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold flex items-center space-x-2" style={{ color: "#020c4c" }}>
                    {/* <ShieldIcon className="h-5 w-5" /> */}
                    <span>Security Settings</span>
                  </h2>
                </div>
                
                <div className="p-6">
                  {!showChangePassword ? (
                    <div className="text-center py-8">
                      <LockClosedIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 mb-4">Keep your account secure with a strong password</p>
                      <button
                        onClick={() => setShowChangePassword(true)}
                        className="inline-flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                      >
                        <LockClosedIcon className="h-4 w-4" />
                        <span>Change Password</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-semibold" style={{ color: "#020c4c" }}>
                          Change Password
                        </h3>
                        <button
                          onClick={() => setShowChangePassword(false)}
                          className="text-sm text-gray-500 hover:text-gray-700 transition"
                        >
                          Cancel
                        </button>
                      </div>

                      <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? "text" : "password"}
                              {...registerPassword("currentPassword", {
                                required: "Current password is required",
                              })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showCurrentPassword ? (
                                <EyeOffIcon className="h-5 w-5 text-gray-400" />
                              ) : (
                                <EyeIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </div>
                          {passwordErrors.currentPassword && (
                            <p className="text-red-500 text-xs mt-1">
                              {passwordErrors.currentPassword.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              {...registerPassword("newPassword", {
                                required: "New password is required",
                                minLength: {
                                  value: 6,
                                  message: "Password must be at least 6 characters",
                                },
                              })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                              placeholder="Enter new password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showNewPassword ? (
                                <EyeOffIcon className="h-5 w-5 text-gray-400" />
                              ) : (
                                <EyeIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </div>
                          {passwordErrors.newPassword && (
                            <p className="text-red-500 text-xs mt-1">
                              {passwordErrors.newPassword.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              {...registerPassword("confirmPassword", {
                                required: "Please confirm your password",
                                validate: (value) =>
                                  value === watch("newPassword") || "Passwords do not match",
                              })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                              placeholder="Confirm new password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showConfirmPassword ? (
                                <EyeOffIcon className="h-5 w-5 text-gray-400" />
                              ) : (
                                <EyeIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </div>
                          {passwordErrors.confirmPassword && (
                            <p className="text-red-500 text-xs mt-1">
                              {passwordErrors.confirmPassword.message}
                            </p>
                          )}
                        </div>

                        <div className="flex space-x-3 pt-2">
                          <button
                            type="submit"
                            disabled={changingPassword}
                            className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all"
                            style={{ background: "#020c4c" }}
                          >
                            {changingPassword ? "Changing..." : "Change Password"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowChangePassword(false)}
                            className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Confirm Logging out"
        message="Are you sure you want to logout?"
      />
    </div>
  );
};

export default Profile;