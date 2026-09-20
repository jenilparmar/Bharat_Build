import { useEffect, useState } from "react";
import { ArrowLeft, BookOpenText, Layers3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const cleanMarkdown = (text) => (text || "").replace(/\*\*/g, "").trim();

const SubjectCard = ({ subject, count, onClick }) => (
    <button
        onClick={onClick}
        className="group relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5 text-left shadow-lg shadow-slate-950/40 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/60 hover:bg-slate-800"
    >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 opacity-70" />

        <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-slate-300">
            <BookOpenText size={14} className="text-cyan-300" />
            Subject
        </div>

        <h3 className="mb-3 line-clamp-2 text-lg font-semibold text-white">{subject}</h3>

        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-400/30">
            {count} {count === 1 ? "note" : "notes"}
        </div>
    </button>
);

const SubjectPage = () => {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
//   const API_BASE_URL = "http://127.0.0.1:8000";

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            setError("");
            const token = localStorage.getItem("token");
            if (!token) {
                setError("Please login again to view your subjects.");
                setSubjects([]);
                return;
            }

            const res = await axios.get(`${API_BASE_URL}/subject_count`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            // Backend returns an object map: {"Subject Name": count}
            const subjectCounts =
                res.data && typeof res.data === "object" && !Array.isArray(res.data)
                    ? Object.entries(res.data)
                            .map(([subject, note_count]) => ({
                                subject,
                                note_count: Number(note_count) || 0,
                            }))
                            .filter((item) => item.subject)
                            .sort((a, b) => b.note_count - a.note_count)
                    : [];

            setSubjects(subjectCounts);
        } catch (err) {
            console.error("Failed to fetch subjects:", err);
            setError("Could not load your subjects. Please try again.");
            setSubjects([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, [API_BASE_URL]);

    const totalNotesAcrossSubjects = subjects.reduce((sum, subj) => sum + subj.note_count, 0);

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-8">
                <button
                    onClick={() => navigate("/dashboard")}
                    className="mb-6 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-400/60 hover:text-white"
                >
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </button>

                <div className="mb-8 rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 p-5 sm:p-6">
                    <h1 className="text-2xl font-bold sm:text-3xl">Your Subjects</h1>
                    <p className="mt-2 text-sm text-slate-300">
                        Open any subject to view related notes quickly.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm">
                            <Layers3 size={15} className="text-cyan-300" />
                            <span className="text-slate-300">Subjects:</span>
                            <span className="font-semibold text-white">{subjects.length}</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm">
                            <BookOpenText size={15} className="text-emerald-300" />
                            <span className="text-slate-300">Total Notes:</span>
                            <span className="font-semibold text-white">{totalNotesAcrossSubjects}</span>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="h-40 animate-pulse rounded-2xl border border-slate-700 bg-slate-800/60" />
                        ))}
                    </div>
                )}

                {!loading && error && (
                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-red-200">
                        <p className="font-medium">{error}</p>
                        <button
                            onClick={fetchSubjects}
                            className="mt-3 rounded-lg border border-red-400/60 px-3 py-1.5 text-sm text-red-100 transition hover:bg-red-500/20"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {!loading && !error && subjects.length === 0 && (
                    <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-center">
                        <p className="text-base text-slate-200">No subjects found yet.</p>
                        <p className="mt-2 text-sm text-slate-400">
                            Upload notes from the dashboard and your subjects will appear here.
                        </p>
                    </div>
                )}

                {!loading && !error && subjects.length > 0 && (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {subjects.map((subj) => (
                            <SubjectCard
                                key={subj.subject}
                                subject={cleanMarkdown(subj.subject)}
                                count={subj.note_count}
                                onClick={() => navigate(`/notes?subject=${encodeURIComponent(subj.subject)}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubjectPage;