import { useRef, useState, useEffect } from "react";
import { Menu, Home, Plus, Mic, FileText, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const TopNavbar = ({
  user,
  onRequireLogin,
  onOpenSidebar,
  onShowNotesModal,
  onShowToast,
  isAudioUploading,
  setIsAudioUploading,
  isPdfUploading,
  setIsPdfUploading,
}) => {
  const [showProfile, setShowProfile] = useState(false);
  const audioInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const profileMenuRef = useRef(null);
  // const API_BASE_URL = "http://127.0.0.1:8000";
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  const navigate = useNavigate();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };

    if (showProfile) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfile]);

  const promptLogin = () => {
    if (onRequireLogin) onRequireLogin();
  };

  const triggerAudioPicker = () => {
    if (!user) {
      promptLogin();
      return;
    }
    audioInputRef.current?.click();
  };

  const triggerPdfPicker = () => {
    if (!user) {
      promptLogin();
      return;
    }
    pdfInputRef.current?.click();
  };

  const handleAudioUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const token = localStorage.getItem("token");
    if (!token) {
      promptLogin();
      return;
    }

    // Validate file type
    if (!selectedFile.type.startsWith("audio/")) {
      onShowToast("Please upload a valid audio file", "error");
      return;
    }

    // Validate file size (max 500MB)
    if (selectedFile.size > 500 * 1024 * 1024) {
      onShowToast("Audio file is too large (max 500MB)", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setIsAudioUploading(true);
      onShowToast("Processing audio... this may take a moment ⏳", "info");

      await axios.post(`${API_BASE_URL}/upload-audio`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      onShowToast("Audio uploaded and converted to notes ✅", "success");
    } catch (error) {
      console.error("Audio upload failed:", error);
      const errorMsg = error?.response?.data?.detail || "Failed to upload audio. Please try again.";
      onShowToast(errorMsg, "error");
    } finally {
      setIsAudioUploading(false);
      event.target.value = "";
    }
  };

  const handlePdfUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.includes("pdf") && !selectedFile.name.endsWith(".pdf")) {
      onShowToast("Please upload a valid PDF file", "error");
      return;
    }

    // Validate file size (max 25MB)
    if (selectedFile.size > 25 * 1024 * 1024) {
      onShowToast("PDF file is too large (max 25MB)", "error");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      promptLogin();
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setIsPdfUploading(true);
      onShowToast("Processing PDF... this may take a moment ⏳", "info");

      await axios.post(`${API_BASE_URL}/upload-pdf`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      onShowToast("PDF uploaded and converted to notes ✅", "success");
    } catch (error) {
      const backendMessage = error?.response?.data?.detail;
      console.error("PDF upload failed:", error);
      onShowToast(backendMessage || "Failed to upload PDF. Please try another file.", "error");
    } finally {
      setIsPdfUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 md:left-72 flex items-center justify-between p-3 sm:p-4 border-b border-slate-700 gap-3 sm:gap-4 bg-gradient-to-r from-slate-900 to-slate-800/50 backdrop-blur-md z-10">
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioUpload}
        className="hidden"
        aria-label="Audio file input"
      />

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handlePdfUpload}
        className="hidden"
        aria-label="PDF file input"
      />

      {/* Left Section - Menu & Dashboard */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <button
          onClick={() => navigate("/dashboard")}
          className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm font-medium border border-slate-700"
          title="Go to dashboard"
        >
          <Home size={16} />
          <span>Dashboard</span>
        </button>
      </div>

      {/* Middle Section - Upload Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center min-w-0">
        <button
          onClick={() => {
            if (!user) {
              promptLogin();
            } else {
              onShowNotesModal(true);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-300 transition-all text-xs sm:text-sm font-medium border border-slate-700 hover:border-blue-500/50 whitespace-nowrap"
          title="Add new note"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Note</span>
        </button>

        <button
          onClick={triggerAudioPicker}
          disabled={isAudioUploading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-purple-300 transition-all text-xs sm:text-sm font-medium border border-slate-700 hover:border-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          title="Upload audio file"
        >
          <Mic size={16} />
          <span className="hidden sm:inline">{isAudioUploading ? "Processing..." : "Audio"}</span>
        </button>

        <button
          onClick={triggerPdfPicker}
          disabled={isPdfUploading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-green-300 transition-all text-xs sm:text-sm font-medium border border-slate-700 hover:border-green-500/50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          title="Upload PDF file"
        >
          <FileText size={16} />
          <span className="hidden sm:inline">{isPdfUploading ? "Processing..." : "PDF"}</span>
        </button>
      </div>

      {/* Right Section - Profile */}
      <div className="relative flex-shrink-0" ref={profileMenuRef}>
        {!user ? (
          <button
            onClick={promptLogin}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs sm:text-sm font-medium transition-all hover:shadow-lg hover:shadow-blue-500/30 whitespace-nowrap"
            title="Login to your account"
          >
            Login
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:opacity-80 transition-opacity overflow-hidden border-2 border-blue-500 hover:border-cyan-400"
              aria-label="Open profile menu"
              aria-expanded={showProfile}
              title="Profile menu"
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 w-full h-full flex items-center justify-center text-xs font-semibold text-white">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-xl border border-slate-700 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-700 text-sm text-slate-300 font-medium truncate">
                  {user.name || "User"}
                </div>

                <button
                  onClick={() => {
                    navigate("/profile");
                    setShowProfile(false);
                  }}
                  className="flex w-full items-center gap-2 text-left px-4 py-2.5 hover:bg-slate-700/50 transition-colors text-sm text-slate-300 hover:text-white"
                >
                  <Settings size={16} />
                  Profile
                </button>

                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/", { replace: true });
                  }}
                  className="flex w-full items-center gap-2 text-left px-4 py-2.5 border-t border-slate-700 text-red-400 hover:bg-slate-700/50 transition-colors text-sm"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TopNavbar;
