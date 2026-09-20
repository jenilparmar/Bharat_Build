import { useState } from "react";
import axios from "axios";

const UploadNotes = ({ onClose, onUploadSuccess }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  // const API_BASE_URL = "http://127.0.0.1:8000";

  const handleUpload = async () => {
    if (!content.trim()) return;

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE_URL}/upload-note`,
        {
          content: content,
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

      setContent("");
      onClose();

    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">

      <div className="bg-[#1e293b] p-6 rounded-xl w-[90%] max-w-lg">

        <h2 className="text-lg font-semibold mb-4">
          Upload Notes
        </h2>

        <textarea
          placeholder="Write your messy notes here..."
          className="w-full h-40 bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-sm outline-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="flex justify-end gap-3 mt-4">

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>

        </div>
      </div>
    </div>
  );
};

export default UploadNotes;