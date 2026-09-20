import React, { useEffect, useRef, useState } from "react";
import { Plus, Mic, FileText, MessageSquare, TrendingUp, Zap, BookOpen, Target, Youtube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import UploadNotes from "../components/UploadNotes";
import UploadYoutube from "../components/UploadYoutube";
import studyMinutesLogo from "../assets/studyminutes_logo.png";

// Loading Skeleton Component
const StatSkeleton = () => (
  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-6 animate-pulse">
    <div className="h-4 bg-slate-700 rounded w-20 mb-3"></div>
    <div className="h-8 bg-slate-700 rounded w-16"></div>
  </div>
);

const ChartSkeleton = () => (
  <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 animate-pulse">
    <div className="h-6 bg-slate-700 rounded w-40 mb-6"></div>
    <div className="grid grid-cols-7 gap-2">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="h-20 w-full bg-slate-700 rounded"></div>
          <div className="h-3 bg-slate-700 rounded w-8"></div>
        </div>
      ))}
    </div>
  </div>
);

const cleanMarkdown = (text) => (text || "").replace(/\*\*/g, "").trim();

const extractSubject = (noteText) => {
  const safe = cleanMarkdown(noteText);
  const match = safe.match(/Subject:\s*([^\n]+)/i);
  return match ? match[1].trim() : "";
};

const RECENT_UPLOADS_DAYS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

const toIstDateKey = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const toIstWeekdayLabel = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(date);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [totalNotes, setTotalNotes] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [importantTopicsCount, setImportantTopicsCount] = useState(0);
  const [recentUploadsCount, setRecentUploadsCount] = useState(0);
  const [weeklyUploadData, setWeeklyUploadData] = useState([]);
  const [subjectBreakdown, setSubjectBreakdown] = useState([]);
  const [consistencyScore, setConsistencyScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [activeDaysLast14, setActiveDaysLast14] = useState(0);
  const [avgUploadsPerActiveDay, setAvgUploadsPerActiveDay] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [uploadToast, setUploadToast] = useState({ visible: false, id: 0, message: "", type: "success" });
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const [isYoutubeUploading, setIsYoutubeUploading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const audioInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const profileMenuRef = useRef(null);
  // const API_BASE_URL = "http://127.0.0.1:8000";
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const displayName = user?.name?.trim();

  const refreshDashboardStats = async (token) => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);

      if (!token) {
        setTotalNotes(0);
        setTotalSubjects(0);
        setImportantTopicsCount(0);
        setRecentUploadsCount(0);
        setWeeklyUploadData([]);
        setSubjectBreakdown([]);
        setConsistencyScore(0);
        setCurrentStreak(0);
        setActiveDaysLast14(0);
        setAvgUploadsPerActiveDay(0);
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/my-notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const notes = Array.isArray(res.data) ? res.data : [];
      setTotalNotes(notes.length);

      const savedImportantIds = JSON.parse(localStorage.getItem("importantNoteIds") || "[]");
      const savedIdSet = new Set(savedImportantIds);
      const importantCount = notes.filter((note) => savedIdSet.has(note._id)).length;
      setImportantTopicsCount(importantCount);

      const recentThreshold = Date.now() - RECENT_UPLOADS_DAYS * 24 * 60 * 60 * 1000;
      const recentCount = notes.filter((note) => {
        if (!note.created_at) return false;
        const createdAt = new Date(note.created_at).getTime();
        return Number.isFinite(createdAt) && createdAt >= recentThreshold;
      }).length;
      setRecentUploadsCount(recentCount);

      const uploadsByDateKey = new Map();
      notes.forEach((note) => {
        const key = toIstDateKey(note.created_at);
        if (!key) return;
        uploadsByDateKey.set(key, (uploadsByDateKey.get(key) || 0) + 1);
      });

      const weekData = [];
      for (let index = 6; index >= 0; index -= 1) {
        const dayDate = new Date(Date.now() - index * DAY_MS);
        const dayKey = toIstDateKey(dayDate);
        weekData.push({
          label: toIstWeekdayLabel(dayDate),
          count: uploadsByDateKey.get(dayKey) || 0,
        });
      }
      setWeeklyUploadData(weekData);

      const subjectCounts = new Map();
      notes.forEach((note) => {
        const subject = extractSubject(note.structured_note || note.raw_note || "") || "Untitled";
        subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1);
      });

      const topSubjects = Array.from(subjectCounts.entries())
        .map(([subject, count]) => ({ subject, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setSubjectBreakdown(topSubjects);

      const fourteenDayKeys = [];
      for (let index = 13; index >= 0; index -= 1) {
        fourteenDayKeys.push(toIstDateKey(new Date(Date.now() - index * DAY_MS)));
      }

      const activeDays = fourteenDayKeys.filter((key) => (uploadsByDateKey.get(key) || 0) > 0).length;
      setActiveDaysLast14(activeDays);

      const uploadsInLast14 = fourteenDayKeys.reduce(
        (sum, key) => sum + (uploadsByDateKey.get(key) || 0),
        0
      );
      const averagePerActiveDay = activeDays > 0 ? uploadsInLast14 / activeDays : 0;
      setAvgUploadsPerActiveDay(Number(averagePerActiveDay.toFixed(1)));

      const consistency = Math.round((activeDays / 14) * 100);
      setConsistencyScore(consistency);

      let streak = 0;
      for (let index = 0; index < 365; index += 1) {
        const dayKey = toIstDateKey(new Date(Date.now() - index * DAY_MS));
        if ((uploadsByDateKey.get(dayKey) || 0) > 0) {
          streak += 1;
        } else {
          break;
        }
      }
      setCurrentStreak(streak);

      const uniqueSubjects = new Set(
        notes
          .map((note) => extractSubject(note.structured_note || note.raw_note || ""))
          .filter(Boolean)
      );
      setTotalSubjects(uniqueSubjects.size);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      setStatsError("Failed to load dashboard stats. Please try again.");
      setTotalNotes(0);
      setTotalSubjects(0);
      setImportantTopicsCount(0);
      setRecentUploadsCount(0);
      setWeeklyUploadData([]);
      setSubjectBreakdown([]);
      setConsistencyScore(0);
      setCurrentStreak(0);
      setActiveDaysLast14(0);
      setAvgUploadsPerActiveDay(0);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!uploadToast.visible) return;

    const timeoutId = setTimeout(() => {
      setUploadToast((prev) => ({ ...prev, visible: false }));
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [uploadToast.id, uploadToast.visible]);

  useEffect(() => {
    refreshDashboardStats(localStorage.getItem("token"));
  }, []);

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

  const showToast = (message, type = "success") => {
    setUploadToast({ visible: true, id: Date.now(), message, type });
  };

  const triggerAudioPicker = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }

    audioInputRef.current?.click();
  };

  const triggerPdfPicker = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }

    pdfInputRef.current?.click();
  };

  const handleAudioUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }

    // Validate file size (max 500MB)
    if (selectedFile.size > 500 * 1024 * 1024) {
      showToast("Audio file is too large (max 500MB)", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setIsAudioUploading(true);
      showToast("Processing audio... this may take a moment ⏳");

      await axios.post(`${API_BASE_URL}/upload-audio`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await refreshDashboardStats(token);
      showToast("Audio uploaded and converted to notes ✅", "success");
    } catch (error) {
      console.error("Failed to upload audio:", error);
      const errorMsg = error?.response?.data?.detail || "Failed to upload audio. Please try again.";
      showToast(errorMsg, "error");
    } finally {
      setIsAudioUploading(false);
      event.target.value = "";
    }
  };

  const handlePdfUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }

    // Validate file type
    if (!selectedFile.type.includes("pdf") && !selectedFile.name.endsWith(".pdf")) {
      showToast("Please upload a valid PDF file", "error");
      return;
    }

    // Validate file size (max 25MB)
    if (selectedFile.size > 25 * 1024 * 1024) {
      showToast("PDF file is too large (max 25MB)", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setIsPdfUploading(true);
      showToast("Processing PDF... this may take a moment ⏳");

      await axios.post(`${API_BASE_URL}/upload-pdf`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await refreshDashboardStats(token);
      showToast("PDF uploaded and converted to notes ✅", "success");
    } catch (error) {
      console.error("Failed to upload PDF:", error);
      const errorMsg = error?.response?.data?.detail || "Failed to upload PDF. Please try another file.";
      showToast(errorMsg, "error");
    } finally {
      setIsPdfUploading(false);
      event.target.value = "";
    }
  };

  const handleYoutubeUploadSuccess = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      await refreshDashboardStats(token);
      showToast("YouTube video processed and notes created ✅", "success");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-white">
      {/* Main Content */}
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8 sm:mb-10 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <img
                src={studyMinutesLogo}
                alt="StudyMinutes logo"
                className="h-7 w-7 sm:h-10 sm:w-10 rounded-md object-contain"
              />
              <p className="text-lg sm:text-2xl font-bold tracking-wide bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                StudyMinutes
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              {displayName ? `Welcome back, ${displayName}!` : "Welcome back 👋"}
            </h1>
            <p className="text-slate-400 mt-2 text-sm sm:text-base">
              Keep crushing your study goals with smart notes and AI-powered learning.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => navigate("/chat")}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-500 bg-gradient-to-r from-blue-600 to-blue-700 px-2.5 py-2 text-xs font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-blue-500/20 sm:h-auto sm:px-4 sm:text-sm"
              aria-label="Open chatbot"
            >
              <MessageSquare size={16} />
              <span className="sm:hidden">Chat</span>
              <span className="hidden sm:inline">Chat with notes</span>
            </button>

            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfile((prev) => !prev)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:opacity-90 transition-opacity overflow-hidden border-2 border-blue-500 hover:border-cyan-400"
                aria-label="Open profile menu"
                aria-expanded={showProfile}
              >
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user?.name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 w-full h-full flex items-center justify-center text-sm font-semibold">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-44 bg-[#1e293b] rounded-xl shadow-xl border border-slate-700 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-slate-700 text-sm text-slate-300 font-medium truncate">
                    {user?.name || "User"}
                  </div>

                  <button
                    onClick={() => {
                      navigate("/profile");
                      setShowProfile(false);
                    }}
                    className="block w-full text-left px-4 py-2.5 hover:bg-slate-700/50 transition-colors text-sm"
                  >
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      localStorage.removeItem("user");
                      navigate("/", { replace: true });
                    }}
                    className="block w-full text-left px-4 py-2.5 text-red-400 hover:bg-slate-700/50 transition-colors text-sm border-t border-slate-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {statsError && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-in slide-in-from-top">
            <p className="font-medium">{statsError}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-12">

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

          {/* Add Note */}
          <button
            onClick={() => setShowNotesModal(true)}
            className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 sm:p-6 text-left transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-blue-500/10 transition-all duration-300"></div>
            <div className="relative">
              <Plus className="text-blue-500 group-hover:scale-110 group-hover:text-blue-400 transition-all mb-4" size={28} />
              <h2 className="text-lg font-semibold">Add Note</h2>
              <p className="text-slate-400 text-sm mt-1">
                Write or paste important study notes
              </p>
            </div>
          </button>

          {/* Upload Audio */}
          <button
            onClick={triggerAudioPicker}
            disabled={isAudioUploading}
            className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 sm:p-6 text-left transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-purple-500/10 transition-all duration-300"></div>
            <div className="relative">
              <Mic className="text-purple-500 group-hover:scale-110 group-hover:text-purple-400 transition-all mb-4" size={28} />
              <h2 className="text-lg font-semibold">
                {isAudioUploading ? "Processing Audio..." : "Upload Audio"}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Convert lectures to structured notes
              </p>
            </div>
          </button>

          {/* Upload PDF */}
          <button
            onClick={triggerPdfPicker}
            disabled={isPdfUploading}
            className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 sm:p-6 text-left transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-500/10 transition-all duration-300"></div>
            <div className="relative">
              <FileText className="text-emerald-500 group-hover:scale-110 group-hover:text-emerald-400 transition-all mb-4" size={28} />
              <h2 className="text-lg font-semibold">
                {isPdfUploading ? "Processing PDF..." : "Upload PDF"}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Extract key points from PDF documents
              </p>
            </div>
          </button>

          {/* Add YouTube Video */}
          <button
            onClick={() => setShowYoutubeModal(true)}
            disabled={isYoutubeUploading}
            className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 sm:p-6 text-left transition-all duration-300 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-500/0 group-hover:from-red-500/5 group-hover:to-red-500/10 transition-all duration-300"></div>
            <div className="relative">
              <Youtube className="text-red-500 group-hover:scale-110 group-hover:text-red-400 transition-all mb-4" size={28} />
              <h2 className="text-lg font-semibold">
                {isYoutubeUploading ? "Processing Video..." : "YouTube Video"}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Convert video lectures to notes
              </p>
            </div>
          </button>

        </div>

        {/* Stats Section */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-400" />
            Your Learning Stats
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

            {isLoadingStats ? (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/notes")}
                  className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-400 text-sm font-medium">Total Notes</p>
                    <BookOpen size={16} className="text-blue-400" />
                  </div>
                  <h2 className="text-3xl font-bold group-hover:text-blue-300 transition-colors">{totalNotes}</h2>
                </button>

                <button
                  onClick={() => navigate("/subject")}
                  className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-400 text-sm font-medium">Subjects</p>
                    <Target size={16} className="text-cyan-400" />
                  </div>
                  <h2 className="text-3xl font-bold group-hover:text-cyan-300 transition-colors">{totalSubjects}</h2>
                </button>

                <button
                  onClick={() => navigate("/notes?view=important")}
                  className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10 text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-400 text-sm font-medium">Important</p>
                    <Zap size={16} className="text-yellow-400" />
                  </div>
                  <h2 className="text-3xl font-bold group-hover:text-yellow-300 transition-colors">{importantTopicsCount}</h2>
                </button>

                <button
                  onClick={() => navigate("/notes?view=recent")}
                  className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-400 text-sm font-medium">Recent Uploads</p>
                    <TrendingUp size={16} className="text-green-400" />
                  </div>
                  <h2 className="text-3xl font-bold group-hover:text-green-300 transition-colors">{recentUploadsCount}</h2>
                </button>
              </>
            )}

          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Weekly Uploads Chart */}
          <div className="lg:col-span-2 h-full rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 flex flex-col">
            {isLoadingStats ? (
              <ChartSkeleton />
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Upload Trend</h3>
                  <p className="text-xs text-slate-400">Last 7 days (IST)</p>
                </div>

                {weeklyUploadData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    <p className="text-sm">No upload data yet. Start by uploading your first note!</p>
                  </div>
                ) : (
                  <div className="grid flex-1 min-h-[220px] grid-cols-7 gap-2 sm:gap-3">
                    {weeklyUploadData.map((day) => {
                      const maxCount = Math.max(...weeklyUploadData.map((item) => item.count), 1);
                      const heightPct = Math.max(8, Math.round((day.count / maxCount) * 100));
                      return (
                        <div key={day.label} className="flex h-full flex-col items-center gap-1 group">
                          <div className="text-xs leading-none font-semibold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                            {day.count}
                          </div>
                          <div className="flex w-full flex-1 items-end rounded-lg bg-slate-900/50 px-1.5 py-1">
                            <div
                              className="w-full rounded-md bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30"
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <div className="text-xs leading-none text-slate-400 font-medium">{day.label}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Consistency Card */}
          <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 h-fit">
            {isLoadingStats ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-slate-700 rounded w-24"></div>
                <div className="h-12 bg-slate-700 rounded w-20"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-700 rounded"></div>
                  <div className="h-3 bg-slate-700 rounded w-3/4"></div>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Zap size={18} className="text-amber-400" />
                  Consistency
                </h3>
                <p className="mt-1 text-sm text-slate-400">Last 14 days</p>

                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Score</p>
                    <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mt-1">
                      {consistencyScore}%
                    </p>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(consistencyScore, 100)}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 hover:border-red-500/30 transition-colors">
                      <p className="text-slate-400 text-xs">Streak</p>
                      <p className="mt-1 text-lg font-bold text-red-300">{currentStreak}</p>
                      <p className="text-xs text-slate-500">days</p>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 hover:border-green-500/30 transition-colors">
                      <p className="text-slate-400 text-xs">Active</p>
                      <p className="mt-1 text-lg font-bold text-green-300">{activeDaysLast14}</p>
                      <p className="text-xs text-slate-500">of 14</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 hover:border-purple-500/30 transition-colors">
                    <p className="text-slate-400 text-xs">Avg per active day</p>
                    <p className="mt-1 text-2xl font-bold text-purple-300">{avgUploadsPerActiveDay}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Top Subjects */}
          <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 lg:col-span-3">
            {isLoadingStats ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-slate-700 rounded w-32"></div>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-3 bg-slate-700 rounded"></div>
                ))}
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Top Subjects</h3>
                  <p className="text-xs text-slate-400">By upload frequency</p>
                </div>

                {subjectBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">Upload some notes to see your subject breakdown!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjectBreakdown.map((item, index) => {
                      const maxCount = Math.max(...subjectBreakdown.map((entry) => entry.count), 1);
                      const widthPct = Math.max(10, Math.round((item.count / maxCount) * 100));
                      const colors = [
                        "from-blue-500 to-cyan-400",
                        "from-purple-500 to-pink-400",
                        "from-green-500 to-emerald-400",
                        "from-orange-500 to-yellow-400",
                        "from-red-500 to-pink-400",
                      ];
                      return (
                        <div key={item.subject} className="group">
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-400">#{index + 1}</span>
                              <p className="truncate pr-3 text-slate-200 font-medium">{item.subject}</p>
                            </div>
                            <p className="text-slate-400 font-semibold">{item.count}</p>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${colors[index % colors.length]} transition-all duration-500 group-hover:shadow-lg`}
                              style={{
                                width: `${widthPct}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Notes Modal */}
        {showNotesModal && (
          <UploadNotes
            onClose={() => setShowNotesModal(false)}
            onUploadSuccess={async () => {
              const token = localStorage.getItem("token");
              await refreshDashboardStats(token);
              showToast("Notes uploaded successfully ✅", "success");
            }}
          />
        )}

        {/* YouTube Modal */}
        {showYoutubeModal && (
          <UploadYoutube
            onClose={() => setShowYoutubeModal(false)}
            onUploadSuccess={handleYoutubeUploadSuccess}
          />
        )}

        {/* Toast Notification */}
        {uploadToast.visible && (
          <div className={`fixed bottom-4 right-4 z-[60] rounded-lg px-4 py-3 text-sm font-medium shadow-lg border animate-in slide-in-from-bottom-4 duration-300 ${
            uploadToast.type === "error" 
              ? "bg-red-500/10 border-red-500/30 text-red-300" 
              : "bg-green-500/10 border-green-500/30 text-green-300"
          }`}>
            {uploadToast.message}
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;