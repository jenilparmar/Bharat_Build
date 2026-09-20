import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiCheck, FiX, FiTrash2 } from "react-icons/fi";
import axios from "axios";

const formatDate = (dateValue) => {
  if (!dateValue) return "Not yet";
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "Invalid date";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  } catch (error) {
    return "Invalid date";
  }
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const fileInputRef = useRef(null);

  // const API_BASE_URL = "http://127.0.0.1:8000";
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
      return;
    }
    setProfileData(user);
    setEditedName(user.name);
  }, [user, navigate]);

  const handleProfilePictureClick = () => {
    if (!isEditing) return;
    fileInputRef.current?.click();
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image size must be less than 5MB" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      setMessage({ type: "", text: "" });

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/update-profile-picture`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state with new picture URL
      const updatedUser = { ...profileData, picture: response.data.picture_url };
      setProfileData(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setMessage({ type: "success", text: "Profile picture updated successfully!" });
    } catch (error) {
      console.error("Upload failed:", error);
      setMessage({
        type: "error",
        text: error?.response?.data?.detail || "Failed to update profile picture",
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      setMessage({ type: "error", text: "Name cannot be empty" });
      return;
    }

    if (editedName === profileData.name) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      setMessage({ type: "", text: "" });

      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/update-profile-name`,
        { name: editedName.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update local state
      const updatedUser = { ...profileData, name: editedName.trim() };
      setProfileData(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditing(false);
      setMessage({ type: "success", text: "Name updated successfully!" });
    } catch (error) {
      console.error("Save failed:", error);
      setMessage({
        type: "error",
        text: error?.response?.data?.detail || "Failed to update name",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!confirm("Are you sure you want to delete your profile picture?")) {
      return;
    }

    try {
      setIsUploading(true);
      setMessage({ type: "", text: "" });

      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/delete-profile-picture`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state
      const updatedUser = { ...profileData, picture: null };
      setProfileData(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setMessage({ type: "success", text: "Profile picture deleted successfully!" });
    } catch (error) {
      console.error("Delete failed:", error);
      setMessage({
        type: "error",
        text: error?.response?.data?.detail || "Failed to delete profile picture",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!profileData) {
    return (
      <div className="min-h-screen bg-[#0f172a] items-center justify-center flex">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <FiArrowLeft size={20} />
          <span>Back</span>
        </button>

        {/* Profile Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
          {/* Header Background */}
          <div className="h-60 bg-gradient-to-r from-blue-600 to-purple-600"></div>

          {/* Profile Content */}
          <div className="px-6 sm:px-8 pb-8">
            {/* Profile Picture Section */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-6 -mt-36 mb-8">
              <div
                onClick={handleProfilePictureClick}
                className={`relative flex-shrink-0 ${
                  isEditing ? "cursor-pointer" : ""
                }`}
              >
                {profileData.picture ? (
                  <img
                    src={profileData.picture}
                    alt={profileData.name}
                    className={`w-32 h-32 rounded-full border-4 border-slate-800 object-cover ${
                      isEditing ? "hover:opacity-80 transition-opacity" : ""
                    }`}
                  />
                ) : (
                  <div className={`w-32 h-32 rounded-full border-4 border-slate-800 bg-blue-600 flex items-center justify-center text-5xl font-bold text-white ${
                    isEditing ? "hover:opacity-80 transition-opacity" : ""
                  }`}>
                    {profileData.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {isEditing && (
                  <div className="absolute bottom-0 right-0 flex gap-1">
                    <div className="bg-blue-600 rounded-full p-2 hover:bg-blue-700 cursor-pointer">
                      <FiEdit2 size={14} />
                    </div>
                    {profileData.picture && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProfilePicture();
                        }}
                        className="bg-red-600 rounded-full p-2 hover:bg-red-700"
                        title="Delete profile picture"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold">{profileData.name}</h1>
                <p className="text-slate-400 mt-1">{profileData.email}</p>
              </div>
            </div>

            {/* Message Display */}
            {message.text && (
              <div
                className={`mb-6 p-3 sm:p-4 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-900/30 text-green-300 border border-green-700"
                    : "bg-red-900/30 text-red-300 border border-red-700"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureUpload}
              className="hidden"
              disabled={!isEditing}
            />

            {/* Profile Information */}
            <div className="space-y-6">
              {/* Username/Name Section */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Username
                </label>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editedName}
                        disabled
                        className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600"
                      />
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 font-medium rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <FiEdit2 size={16} />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg border border-blue-500 focus:outline-none"
                        placeholder="Enter new username"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={isSaving || isUploading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <FiCheck size={16} />
                        <span className="hidden sm:inline">Save</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedName(profileData.name);
                        }}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-500 font-medium rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <FiX size={16} />
                        <span className="hidden sm:inline">Cancel</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Email Section */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full bg-slate-700 text-slate-400 px-4 py-2 rounded-lg border border-slate-600"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              {/* Account Information */}
              <div className="pt-6 border-t border-slate-700">
                <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account Created</span>
                    <span className="text-slate-200">
                      {formatDate(profileData.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Updated</span>
                    <span className="text-slate-200">
                      {formatDate(profileData.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <div className="mt-8 pt-6 border-t border-slate-700">
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  navigate("/", { replace: true });
                }}
                className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-lg transition-colors border border-red-600/50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
