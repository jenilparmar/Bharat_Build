import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bookmark, Trash2, BookOpen, Clock, AlertCircle, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

// Loading Skeleton Component
const NoteSkeleton = () => (
  <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 animate-pulse">
    <div className="mb-4">
      <div className="h-6 bg-slate-700 rounded w-40 mb-3"></div>
      <div className="h-4 bg-slate-700 rounded w-32"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-slate-700 rounded w-full"></div>
      <div className="h-4 bg-slate-700 rounded w-5/6"></div>
      <div className="h-4 bg-slate-700 rounded w-4/6"></div>
    </div>
  </div>
);

// Relative time helper
const getRelativeTime = (dateString) => {
  if (!dateString) return "Unknown date";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const cleanMarkdown = (text) => (text || "").replace(/\*\*/g, "").trim();

const extractSection = (text, label) => {
  const safe = cleanMarkdown(text);
  const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n(?:Subject|Title|Explanation|Key Points):|$)`, "i");
  const match = safe.match(regex);
  return match ? match[1].trim() : "";
};

const parseStructuredNote = (structuredNote) => {
  const safe = cleanMarkdown(structuredNote);
  return {
    subject: extractSection(safe, "Subject") || "Untitled Subject",
    title: extractSection(safe, "Title") || "Untitled Note",
    explanation: extractSection(safe, "Explanation") || safe,
    keyPoints: extractSection(safe, "Key Points"),
  };
};

const RECENT_UPLOADS_DAYS = 2;

const NotesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const API_BASE_URL = "http://127.0.0.1:8000";
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteToast, setDeleteToast] = useState({ visible: false, message: "" });
  const [importantNoteIds, setImportantNoteIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("importantNoteIds") || "[]");
    } catch {
      return [];
    }
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const importantIdSet = useMemo(() => new Set(importantNoteIds), [importantNoteIds]);

  const toggleImportant = (noteId) => {
    setImportantNoteIds((prev) => {
      const alreadySaved = prev.includes(noteId);
      const next = alreadySaved ? prev.filter((id) => id !== noteId) : [...prev, noteId];
      localStorage.setItem("importantNoteIds", JSON.stringify(next));
      return next;
    });
  };

  const deleteNote = async (noteId) => {
    setNoteToDelete(noteId);
    setDeleteConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    
    try {
      setIsDeleting(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login again to delete notes.");
        setDeleteConfirmModal(false);
        setNoteToDelete(null);
        return;
      }

      await axios.delete(`${API_BASE_URL}/notes/${noteToDelete}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotes((prev) => prev.filter((note) => note._id !== noteToDelete));
      setImportantNoteIds((prev) => prev.filter((id) => id !== noteToDelete));
      setDeleteToast({ visible: true, message: "Note deleted successfully ✅" });
      setTimeout(() => setDeleteToast({ visible: false, message: "" }), 3000);
      setDeleteConfirmModal(false);
      setNoteToDelete(null);
    } catch (err) {
      console.error("Failed to delete note:", err);
      setError("Could not delete the note. Please try again.");
      setDeleteConfirmModal(false);
      setNoteToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmModal(false);
    setNoteToDelete(null);
  };

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please login again to view your notes.");
          setNotes([]);
          return;
        }

        const res = await axios.get(`${API_BASE_URL}/my-notes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setNotes(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch notes:", err);
        setError("Could not load your notes. Please try again.");
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [API_BASE_URL]);

  const parsedNotes = useMemo(() => {
    return notes.map((note) => ({
      ...note,
      parsed: parseStructuredNote(note.structured_note || note.raw_note || ""),
    }));
  }, [notes]);

  const selectedSubject = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("subject") || "").trim();
  }, [location.search]);

  const selectedView = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("view") || "").trim().toLowerCase();
  }, [location.search]);

  const filteredNotes = useMemo(() => {
    let filtered = parsedNotes;

    if (selectedView === "important") {
      filtered = parsedNotes.filter((note) => importantIdSet.has(note._id));
    } else if (selectedView === "recent") {
      const recentThreshold = Date.now() - RECENT_UPLOADS_DAYS * 24 * 60 * 60 * 1000;
      filtered = parsedNotes
        .filter((note) => {
          if (!note.created_at) return false;
          const createdAt = new Date(note.created_at).getTime();
          return Number.isFinite(createdAt) && createdAt >= recentThreshold;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (selectedSubject) {
      const target = cleanMarkdown(selectedSubject).toLowerCase();
      filtered = parsedNotes.filter(
        (note) => cleanMarkdown(note.parsed.subject).toLowerCase() === target
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((note) =>
        note.parsed.subject.toLowerCase().includes(query) ||
        note.parsed.title.toLowerCase().includes(query) ||
        note.parsed.explanation.toLowerCase().includes(query) ||
        note.parsed.keyPoints?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [importantIdSet, parsedNotes, selectedSubject, selectedView, searchQuery]);

  const pageTitle = useMemo(() => {
    if (selectedView === "important") return "Important Topics";
    if (selectedView === "recent") return "Recent Uploads";
    if (selectedSubject) return `Notes for ${selectedSubject}`;
    return "Your Notes";
  }, [selectedSubject, selectedView]);

  const emptyStateText = useMemo(() => {
    if (selectedView === "important") return "No important topics saved yet.";
    if (selectedView === "recent") return "No uploads found in the last 2 days.";
    if (selectedSubject) return `No notes found for ${selectedSubject}.`;
    return "No notes found yet.";
  }, [selectedSubject, selectedView]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-white">
      <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(selectedSubject ? "/subject" : "/dashboard")}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 px-3 py-2 text-sm font-medium transition-colors border border-slate-700 hover:border-blue-500/50"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{selectedSubject ? "Back to Subjects" : "Back"}</span>
          </button>

          <div className="flex-1 text-center">
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"} found
            </p>
          </div>

          <div className="w-9 h-9"></div>
        </div>

        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <BookOpen size={32} className="text-blue-400" />
            {pageTitle}
          </h1>
          <p className="text-slate-400">
            {selectedView === "important" && "Your saved important topics"}
            {selectedView === "recent" && "Notes uploaded in the last 2 days"}
            {selectedSubject && `All notes related to ${selectedSubject}`}
            {!selectedView && !selectedSubject && "Browse and manage all your study notes"}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-in slide-in-from-top flex items-center gap-3">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        {/* Search Bar */}
        {!loading && filteredNotes.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search notes by subject, title, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <NoteSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && error && filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle size={48} className="text-red-400 mb-4" />
            <p className="text-lg font-medium text-slate-300">{error}</p>
          </div>
        )}

        {!loading && !error && filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen size={48} className="text-slate-500 mb-4" />
            <p className="text-lg font-medium text-slate-300 mb-2">No notes found</p>
            <p className="text-sm text-slate-400">{emptyStateText}</p>
            {!selectedSubject && selectedView !== "important" && selectedView !== "recent" && (
              <button
                onClick={() => navigate("/dashboard")}
                className="mt-6 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Create Your First Note
              </button>
            )}
          </div>
        )}

        {/* Notes Grid */}
        {!loading && !error && filteredNotes.length > 0 && (
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <div
                key={note._id}
                className="group rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
              >
                {/* Subject Badge and Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 pb-4 border-b border-slate-700">
                  <div className="flex-1 min-w-0">
                    <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
                      {note.parsed.subject}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold mt-2 line-clamp-2 group-hover:text-blue-300 transition-colors">
                      {note.parsed.title}
                    </h2>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleImportant(note._id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                        importantIdSet.has(note._id)
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30"
                          : "border-slate-600 text-slate-300 hover:border-amber-400 hover:text-amber-400 bg-slate-800/50"
                      }`}
                      title={importantIdSet.has(note._id) ? "Remove from important" : "Save as important"}
                    >
                      <Bookmark
                        size={14}
                        fill={importantIdSet.has(note._id) ? "currentColor" : "none"}
                      />
                      <span className="hidden sm:inline">{importantIdSet.has(note._id) ? "Saved" : "Save"}</span>
                    </button>

                    <button
                      onClick={() => deleteNote(note._id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-all"
                      title="Delete this note"
                    >
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                  <Clock size={14} />
                  <span>{getRelativeTime(note.created_at)}</span>
                  {note.created_at && (
                    <span className="text-slate-500">
                      ({new Date(note.created_at).toLocaleDateString()})
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 mb-4">
                  <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                    {note.parsed.explanation}
                  </div>
                </div>

                {/* Key Points */}
                {note.parsed.keyPoints && (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                      Key Points
                    </p>
                    <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                      {note.parsed.keyPoints}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Delete Note?</h3>
            <p className="text-slate-300 mb-6 text-sm">
              Are you sure you want to delete this note? This action cannot be undone and will also remove it from your important topics if saved.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors disabled:opacity-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 font-medium text-sm flex items-center gap-2"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {deleteToast.visible && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg border animate-in slide-in-from-bottom-4 duration-300 bg-green-500/10 border-green-500/30 text-green-300">
          {deleteToast.message}
        </div>
      )}
    </div>
  );
};

export default NotesPage;
