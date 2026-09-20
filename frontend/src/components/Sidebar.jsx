import { FiPlus, FiSettings, FiX } from "react-icons/fi";
import { FiMoreVertical, FiTrash2, FiEdit2, FiBookmark } from "react-icons/fi";
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Sidebar = ({
  chats,
  setChats,
  setMessages,
  user,
  onRequireLogin,
  onClose,
  isMobile = false,
  activeChat,
  setActiveChat,
  onSaveChat,
  onShowSavedChats,
  isViewingSavedChats = false,
  onBackToAllChats,
  savedChatIds = [],
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  // const API_BASE_URL = "http://127.0.0.1:8000";

  const ensureAuth = () => {
    if (!user) {
      if (onRequireLogin) onRequireLogin();
      return false;
    }
    return true;
  };

  const handleNewChat = () => {
    if (!ensureAuth()) return;

    // If viewing saved chats, go back to all chats
    if (isViewingSavedChats && onBackToAllChats) {
      onBackToAllChats();
      return;
    }

    const newChat = {
      id: Date.now(),
      title: "New Chat",
    };

    setChats([newChat, ...chats]);
    setMessages([
      { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
    ]);
    setActiveChat(newChat);

    if (isMobile && onClose) onClose();
  };

  const handleSelectChat = async (chat) => {
    if (!ensureAuth()) return;
    
    setActiveChat(chat);
    
    // If chat is new (doesn't have timestamp property from backend),
    // don't try to fetch history - just show the greeting
    if (!chat.timestamp) {
      setMessages([
        { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
      ]);
    } else {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/get-chat-history/${chat.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Format messages as user and bot
        const formattedMessages = response.data.map((msg) => ({
          role: msg.role === "user" ? "user" : "bot",
          content: msg.content,
        }));
        
        setMessages(formattedMessages);
      } catch (error) {
        console.error("Failed to load chat history:", error);
        setMessages([
          { role: "bot", content: "Failed to load chat history. Please try again." },
        ]);
      }
    }

    if (isMobile && onClose) onClose();
  };

  const [activeMenu, setActiveMenu] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);

  const handleDeleteChat = (id) => {
    if (!ensureAuth()) return;
    setChatToDelete(id);
    setDeleteConfirmModal(true);
    setActiveMenu(null);
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      
      // Call backend to delete the chat
      await axios.delete(
        `${API_BASE_URL}/delete-chat/${chatToDelete}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove from UI
      setChats(chats.filter((chat) => chat.id !== chatToDelete));
      
      // If deleted chat was active, clear messages and reset
      if (activeChat?.id === chatToDelete) {
        setActiveChat(null);
        setMessages([
          { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
        ]);
      }

      setDeleteConfirmModal(false);
      setChatToDelete(null);
    } catch (error) {
      console.error("Failed to delete chat:", error);
      alert("Failed to delete chat. Please try again.");
      setDeleteConfirmModal(false);
      setChatToDelete(null);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmModal(false);
    setChatToDelete(null);
  };

  const handleRename = (id) => {
    if (!ensureAuth()) return;
    const chat = chats.find((c) => c.id === id);
    if (chat) {
      setEditingChatId(id);
      setEditingName(chat.title);
      setActiveMenu(null);
    }
  };

  const handleRenameSave = async (id) => {
    const newName = editingName.trim();
    if (!newName) {
      setEditingChatId(null);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      
      // Call backend to save the renamed chat
      await axios.put(
        `${API_BASE_URL}/rename-chat/${id}`,
        { title: newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state with the new title
      setChats(
        chats.map((chat) =>
          chat.id === id ? { ...chat, title: newName } : chat,
        ),
      );
      
      setEditingChatId(null);
    } catch (error) {
      console.error("Failed to rename chat:", error);
      alert("Failed to rename chat. Please try again.");
      setEditingChatId(null);
    }
  };

  const handleRenameCancel = () => {
    setEditingChatId(null);
    setEditingName("");
  };

  const handleSave = (id) => {
    if (!ensureAuth()) return;
    const chat = chats.find((c) => c.id === id);
    if (chat && onSaveChat) {
      onSaveChat(chat);
    }
    setActiveMenu(null);
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-200 flex flex-col px-4 py-6 border-r border-slate-800/60">
      {/* Logo */}
      <div className="mb-8 px-2 flex items-start justify-between gap-3">
        <div>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          AI Study Assistant
        </p>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <FiX size={18} />
          </button>
        )}
      </div>

      {/* Save Chats / All Chats Button */}
      {isViewingSavedChats ? (
        <button
          onClick={onBackToAllChats}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition-all px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-blue-900/30 mb-3"
        >
          <FiPlus size={16} /> All Chats
        </button>
      ) : (
        <button
          onClick={() => onShowSavedChats && onShowSavedChats()}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 transition-all px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-purple-900/30 mb-3"
        >
          <FiBookmark size={16} /> Saved Chats
        </button>
      )}

      {/* New Chat Button */}
      {!isViewingSavedChats && (
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition-all px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-blue-900/30"
        >
          <FiPlus size={16} /> New Chat
        </button>
      )}

      {/* Chat History */}
      <div className="mt-8 flex-1 overflow-y-auto space-y-2 pr-1 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-sm text-slate-400">Loading chats...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-sm text-slate-400">No chats yet. Start a new one!</p>
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {if (editingChatId !== chat.id) handleSelectChat(chat);}}
              className={`group relative px-3 py-2 rounded-xl border transition-all cursor-pointer text-sm flex items-center justify-between ${
                activeChat?.id === chat.id
                  ? "bg-blue-600/20 border-blue-500/50"
                  : "bg-slate-900/40 border-slate-800/40 hover:bg-slate-800/60"
              } ${activeMenu === chat.id ? "z-50" : "z-10"}`}
            >
              {editingChatId === chat.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      handleRenameSave(chat.id);
                    } else if (e.key === "Escape") {
                      e.stopPropagation();
                      handleRenameCancel();
                    }
                  }}
                  onBlur={() => handleRenameSave(chat.id)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="flex-1 px-2 py-1 rounded bg-slate-700 text-slate-100 text-sm border border-blue-500 focus:outline-none"
                />
              ) : (
                <span className="truncate flex-1" title={chat.title}>{chat.title}</span>
              )}

              {/* 3 Dot Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!ensureAuth()) return;
                  setActiveMenu(activeMenu === chat.id ? null : chat.id);
                }}
                className="opacity-100 p-1 rounded-md hover:bg-slate-700/60 flex-shrink-0"
              >
                <FiMoreVertical size={16} />
              </button>

              {/* Dropdown Menu */}
              {activeMenu === chat.id && (
              <div className="absolute right-0 top-10 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
                  
                  <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename(chat.id);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                  <FiEdit2 size={14} /> Rename
                  </button>


                  <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave(chat.id);
                  }}
                  className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors ${
                    savedChatIds.includes(chat.id)
                      ? "bg-purple-600/30 text-purple-300 hover:bg-purple-600/40"
                      : "text-slate-200 hover:bg-slate-700"
                  }`}
                  >
                  <FiBookmark size={14} fill={savedChatIds.includes(chat.id) ? "currentColor" : "none"} /> {savedChatIds.includes(chat.id) ? "Saved" : "Save"}
                  </button>

                  <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                  >
                  <FiTrash2 size={14} /> Delete
                  </button>

              </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom Section */}
      <div className="mt-6">
        {/* Settings Section with Top & Bottom Border */}
        <div className="border-t border-b border-slate-800/60 py-4">
          <button
            onClick={() => {
              if (ensureAuth()) {
                navigate("/settings");
              }
            }}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <FiSettings size={16} /> Settings
          </button>
        </div>

        {/* Footer */}
        <div className="pt-1">
          <p className="text-[10px] text-slate-600 font-medium">
            © {new Date().getFullYear()} StudyMinutes • v1.0
          </p>
        </div>
      </div>

      {/* Settings Modal */}
      {/*Settings now navigates to a dedicated page*/}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-lg max-w-sm mx-4">
            <h3 className="text-xl font-semibold text-white mb-2">Delete Chat</h3>
            <p className="text-slate-300 mb-6">Are you sure you want to delete this chat? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteChat}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
