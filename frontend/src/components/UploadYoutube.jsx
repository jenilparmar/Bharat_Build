import { useState } from "react";
import axios from "axios";
import { Youtube } from "lucide-react";

const UploadYoutube = ({ onClose, onUploadSuccess }) => {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
//   const API_BASE_URL = "http://127.0.0.1:8000";

  const handleUpload = async () => {
    if (!youtubeUrl.trim()) {
      alert("Please enter a YouTube URL");
      return;
    }

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\//;
    if (!youtubeRegex.test(youtubeUrl)) {
      alert("Please enter a valid YouTube URL");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE_URL}/upload-youtube`,
        {
          youtube_url: youtubeUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (onUploadSuccess) {
        onUploadSuccess();
      }

      setYoutubeUrl("");
      onClose();

    } catch (err) {
      console.error(err);
      const apiError = err?.response?.data?.detail;
      if (apiError) {
        alert(apiError);
        return;
      }

      alert("Failed to process this YouTube URL. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">

      <div className="bg-[#1e293b] p-6 rounded-xl w-[90%] max-w-lg">

        <div className="flex items-center gap-3 mb-4">
          <Youtube className="text-red-500" size={24} />
          <h2 className="text-lg font-semibold">
            Add YouTube Video
          </h2>
        </div>

        <input
          type="text"
          placeholder="Paste YouTube URL (youtube.com/watch?v=... or youtu.be/...)"
          className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-sm outline-none focus:border-red-500 transition-colors"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
        />

        <p className="text-xs text-slate-400 mt-2 ml-1">
          Transcript is fetched via FetchTranscript API and then formatted into notes
        </p>

        <div className="flex justify-end gap-3 mt-6">

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Processing Video..." : "Add Video"}
          </button>

        </div>
      </div>
    </div>
  );
};

export default UploadYoutube;
