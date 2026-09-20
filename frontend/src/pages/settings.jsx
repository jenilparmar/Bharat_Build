import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiDownload } from "react-icons/fi";
import axios from "axios";

const SettingsPage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [activeTab, setActiveTab] = useState("account");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isExporting, setIsExporting] = useState(false);

  // const API_BASE_URL = "http://127.0.0.1:8000";
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

  const handleExportNotes = async () => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_BASE_URL}/export-notes`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `studyminutes_notes_${new Date().getTime()}.txt`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage({ type: "success", text: "Notes exported successfully!" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("Export failed:", error);
      setMessage({
        type: "error",
        text: error?.response?.data?.detail || "Failed to export notes",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } finally {
      setIsExporting(false);
    }
  };



  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">
        <div className="text-center">Please log in to access settings</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pt-20 pb-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <FiArrowLeft size={20} />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-slate-400">Manage your account and preferences</p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-900/30 text-green-300 border border-green-700"
                : "bg-red-900/30 text-red-300 border border-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-slate-700 overflow-x-auto">
          {["account", "data", "support"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-4 font-medium capitalize transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Account Tab */}
        {activeTab === "account" && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Profile Information</h2>

              {/* Profile Picture */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 py-6 border-b border-slate-700">
                <div className="flex-shrink-0">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-2xl font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400 mb-2">Profile Picture</p>
                  <button
                    onClick={() => navigate("/profile")}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                  >
                    Change Profile
                  </button>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                  <div className="bg-slate-700 text-slate-300 px-4 py-2 rounded-lg">
                    {user?.name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <div className="bg-slate-700 text-slate-300 px-4 py-2 rounded-lg">
                    {user?.email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Account Created</label>
                  <div className="bg-slate-700 text-slate-300 px-4 py-2 rounded-lg">
                    {user?.created_at
                      ? new Intl.DateTimeFormat("en-IN", {
                          timeZone: "Asia/Kolkata",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }).format(new Date(user.created_at))
                      : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preferences Tab - REMOVED */}

        {/* Data Tab */}
        {activeTab === "data" && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-semibold">Data & Privacy</h2>

            <div className="space-y-4">
              <button
                onClick={handleExportNotes}
                disabled={isExporting}
                className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload size={24} className="text-blue-400" />
                <div className="flex-1">
                  <p className="font-medium">{isExporting ? "Exporting..." : "Export All Notes"}</p>
                  <p className="text-sm text-slate-400">Download all your notes as a text file</p>
                </div>
              </button>

              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 my-6">
                <p className="text-sm text-blue-300">
                  📝 <strong>Export Format:</strong> Your notes will be exported as a formatted text file that you can easily read and share
                </p>
              </div>


            </div>
          </div>
        )}

        {/* Support Tab */}
        {activeTab === "support" && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-semibold">Contact & Support</h2>

            <div className="space-y-6">
              {/* Contact Details */}
              <div className="bg-slate-700/50 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold mb-4">Get in Touch</h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Email</p>
                    <a
                      href="mailto:ranu260126@gmail.com"
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      ranu260126@gmail.com
                    </a>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400 mb-1">Phone</p>
                    <a
                      href="tel:+91-9876543210"
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      +91 9313174260
                    </a>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400 mb-1">Website</p>
                    <a
                      href="https://study-minutes.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      https://study-minutes.vercel.app
                    </a>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400 mb-1">Country</p>
                    <p className="text-white">
                      India
                    </p>
                  </div>
                </div>
              </div>

              {/* Support Hours */}
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6">
                <h3 className="font-semibold mb-3">Support Hours</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-blue-300">
                    <strong>Monday - Friday:</strong> 9:00 AM - 6:00 PM IST
                  </p>
                  <p className="text-blue-300">
                    <strong>Saturday:</strong> 10:00 AM - 4:00 PM IST
                  </p>
                  <p className="text-blue-300">
                    <strong>Sunday:</strong> Closed
                  </p>
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Response Time</h4>
                  <p className="text-sm text-slate-400">
                    We typically respond within 24 hours
                  </p>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Preferred Contact</h4>
                  <p className="text-sm text-slate-400">
                    Email for detailed queries
                  </p>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="mt-8 pt-8 border-t border-slate-700">
              <h3 className="font-semibold mb-4">About StudyMinutes</h3>
              <div className="bg-slate-700/30 rounded-lg p-4 space-y-2 text-sm text-slate-400">
                <p>
                  <strong>Version:</strong> 1.0.0
                </p>
                <p>
                  <strong>Build:</strong> 2026.3.13
                </p>
                <p>
                  <strong>© 2026 StudyMinutes</strong> • All rights reserved
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
