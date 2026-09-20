import { useEffect, useRef, useState } from "react";
import { FiX, FiCopy, FiCheck } from "react-icons/fi";
import { Send, MessageCircle, Zap, AlertCircle, Smile } from "lucide-react";
import axios from "axios";
import UploadNotes from "./UploadNotes";
import TopNavbar from "./TopNavbar";

// Message component with better styling
const Message = ({ message, isBot, onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"} mb-4 group`}>
      <div
        className={`flex gap-2 max-w-[85%] sm:max-w-[70%] items-end ${
          isBot ? "flex-row" : "flex-row-reverse"
        }`}
      >
        {/* Avatar */}
        {isBot && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
            AI
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
            isBot
              ? "bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none"
              : "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none shadow-lg"
          }`}
        >
          {message}
        </div>

        {/* Copy button */}
        {isBot && (
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
            title="Copy message"
          >
            {copied ? (
              <FiCheck size={14} className="text-green-400" />
            ) : (
              <FiCopy size={14} />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// Typing indicator
const TypingIndicator = () => (
  <div className="flex justify-start mb-4">
    <div className="flex gap-2 items-end">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
        AI
      </div>
      <div className="rounded-2xl px-4 py-3 bg-slate-800 border border-slate-700 rounded-tl-none">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce"></div>
          <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    </div>
  </div>
);

const ChatArea = ({ messages, setMessages, user, onRequireLogin, onOpenSidebar, activeChat, onMessageSent, onEnsureNewChatIsSaved }) => {
  const [input, setInput] = useState("");
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [uploadToast, setUploadToast] = useState({ visible: false, id: 0, message: "", type: "success" });
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const [isBotLoading, setIsBotLoading] = useState(false);
  const messagesEndRef = useRef(null);
  // const API_BASE_URL = "http://127.0.0.1:8000";
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.1:8000";

  useEffect(() => {
    if (!uploadToast.visible) return;

    const timeoutId = setTimeout(() => {
      setUploadToast((prev) => ({ ...prev, visible: false }));
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [uploadToast.id, uploadToast.visible]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotLoading]);

  const promptLogin = () => {
    if (onRequireLogin) onRequireLogin();
  };

  const sanitizeBotText = (text) => {
    if (typeof text !== "string") return "";
    return text.replace(/\*\*/g, "");
  };

  const handleAuthRequiredClick = () => {
    if (!user) {
      promptLogin();
    }
  };

  const handleSend = async () => {
    if (!user) {
      promptLogin();
      return;
    }

    if (!activeChat) {
      alert("Please select or create a chat first before sending a message.");
      return;
    }

    if (!input.trim() || isBotLoading) return;

    const question = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setIsBotLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/chatbot`,
        { question, chat_id: activeChat.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: sanitizeBotText(response.data.answer) },
      ]);
      
      // Ensure new chat is saved to the list
      if (onEnsureNewChatIsSaved) {
        onEnsureNewChatIsSaved();
      }
      
      // Refresh chats list to update with new chat title
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: sanitizeBotText(detail || "Something went wrong. Please try again.") },
      ]);
    } finally {
      setIsBotLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setUploadToast({ visible: true, id: Date.now(), message, type });
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 to-slate-900 text-white overflow-hidden">
      {/* Top Navbar Component */}
      <TopNavbar
        user={user}
        onRequireLogin={onRequireLogin}
        onOpenSidebar={onOpenSidebar}
        onShowNotesModal={setShowNotesModal}
        onShowToast={showToast}
        isAudioUploading={isAudioUploading}
        setIsAudioUploading={setIsAudioUploading}
        isPdfUploading={isPdfUploading}
        setIsPdfUploading={setIsPdfUploading}
      />

      {/* Empty State */}
      {messages.length === 1 && !isBotLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 mt-[80px] md:mt-[70px]">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400">
              <MessageCircle size={32} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Welcome to StudyMinutes Chat!</h2>
            <p className="text-slate-400 max-w-md">
              Upload your notes and ask our AI anything. Get instant answers, clarifications, and deeper understanding of your study material.
            </p>
          </div>

          {/* Quick Start Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
            <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 text-center">
              <Zap size={24} className="text-amber-400 mx-auto mb-2" />
              <p className="text-sm font-medium">Upload Notes</p>
              <p className="text-xs text-slate-400 mt-1">Add audio, PDF, or text notes to get started</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 text-center">
              <MessageCircle size={24} className="text-blue-400 mx-auto mb-2" />
              <p className="text-sm font-medium">Ask Questions</p>
              <p className="text-xs text-slate-400 mt-1">Query your notes with AI-powered answers</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 text-center">
              <Smile size={24} className="text-green-400 mx-auto mb-2" />
              <p className="text-sm font-medium">Learn Better</p>
              <p className="text-xs text-slate-400 mt-1">Understand complex topics interactively</p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {messages.length > 1 && (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-2 max-w-3xl mx-auto w-full mt-[80px] md:mt-[70px] mb-[140px] md:mb-[120px]">
          {messages.map((msg, i) => (
            <Message
              key={i}
              message={msg.content}
              isBot={msg.role === "bot"}
              onCopy={() => {
                navigator.clipboard.writeText(msg.content);
              }}
            />
          ))}
          {isBotLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Area - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 md:left-72 bg-gradient-to-t from-slate-950 to-slate-900/80 backdrop-blur-md border-t border-slate-700 p-4 sm:p-6 z-20">
        <div className="max-w-3xl mx-auto w-full">
          {/* Character Counter and Helper Text */}
          <div className="mb-3 flex items-center justify-between text-xs">
            <p className="text-slate-400">
              {input.length > 0 && (
                <span>{input.length} character{input.length !== 1 ? "s" : ""}</span>
              )}
            </p>
            {!user && (
              <p className="text-amber-400 flex items-center gap-1">
                <AlertCircle size={14} />
                Please login to send messages
              </p>
            )}
          </div>

          {/* Input Field */}
          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              placeholder={
                !user
                  ? "Login to start chatting..."
                  : "Ask me anything about your notes..."
              }
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm sm:text-base disabled:opacity-50"
              value={input}
              disabled={!user || isBotLoading}
              onFocus={(e) => {
                if (!user) {
                  e.target.blur();
                  promptLogin();
                }
              }}
              onChange={(e) => {
                if (!user) {
                  promptLogin();
                  return;
                }
                setInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={isBotLoading || !user || !input.trim()}
              className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-xl text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 flex items-center gap-2"
              title={!user ? "Login to send messages" : "Send message (Enter)"}
            >
              <Send size={18} />
              <span className="hidden sm:inline text-sm">{isBotLoading ? "..." : "Send"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* NOTES MODAL */}
      {showNotesModal && (
        <UploadNotes
          onClose={() => setShowNotesModal(false)}
          onUploadSuccess={() =>
            showToast("Notes uploaded successfully ✅", "success")
          }
        />
      )}

      {/* Toast Notifications */}
      {uploadToast.visible && (
        <div
          className={`fixed bottom-4 right-4 z-[60] flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg border animate-in slide-in-from-bottom-4 duration-300 max-w-sm ${
            uploadToast.type === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-green-500/10 border-green-500/30 text-green-300"
          }`}
        >
          <span>{uploadToast.message}</span>
          <button
            onClick={() => setUploadToast((prev) => ({ ...prev, visible: false }))}
            className="text-current hover:opacity-70 flex-shrink-0"
            aria-label="Close notification"
          >
            <FiX size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatArea;