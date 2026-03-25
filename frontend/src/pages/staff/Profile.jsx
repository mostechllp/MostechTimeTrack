import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { CameraIcon } from "@heroicons/react/outline";
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

  const getImageUrl = () => {
    // If have a preview, use that
    if (previewUrl) return previewUrl;

    // If user has a profile image, use it
    if (user?.profileImage) {
      if (user.profileImage.startsWith("http")) {
        return user.profileImage;
      }
      return `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${user.profileImage}`;
    }

    // Default avatar
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
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data) => {
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

      // Update the user context with the new data
      if (response.data.user) {
        updateUser({
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName,
          profileImage: response.data.user.profileImage,
        });
      }

      toast.success("Profile updated successfully");

      // Clear the selected file after successful upload
      setSelectedFile(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2
              className="text-2xl font-bold mb-6"
              style={{ color: "#020c4c" }}
            >
              Profile Settings
            </h2>

            {/* Profile Image */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div
                  className="w-32 h-32 rounded-full overflow-hidden border-4"
                  style={{ borderColor: "#7ec8f0" }}
                >
                  <img
                    src={getImageUrl()}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // If image fails to load, use default avatar
                      e.target.onerror = null;
                      e.target.src = DEFAULT_AVATAR;
                    }}
                  />
                </div>
                <label
                  htmlFor="profile-image"
                  className="absolute bottom-0 right-0 p-2 rounded-full cursor-pointer hover:opacity-90 transition"
                  style={{ background: "#020c4c" }}
                >
                  <CameraIcon className="h-5 w-5 text-white" />
                  <input
                    type="file"
                    id="profile-image"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    {...register("firstName", {
                      required: "First name is required",
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    {...register("lastName", {
                      required: "Last name is required",
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
                    uploading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:opacity-90"
                  }`}
                  style={{ background: uploading ? "#6b7280" : "#020c4c" }}
                >
                  {uploading ? "Updating..." : "Update Profile"}
                </button>

                <button
                  type="button"
                  onClick={logoutConfirm}
                  className="flex-1 py-2 px-4 rounded-md text-white font-medium hover:opacity-90 transition"
                  style={{ background: "#dc2626" }}
                >
                  Logout
                </button>
              </div>
            </form>

            {/* Success indicator */}
            {!uploading && selectedFile && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                💡 Click "Update Profile" to save your changes.
              </div>
            )}
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
