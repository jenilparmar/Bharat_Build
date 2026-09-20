import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import SavedChatsModal from "../components/SavedChatsModal";
import axios from "axios";

const Home = () => {
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
  ]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [savedChats, setSavedChats] = useState([]);
  const [showSavedChatsModal, setShowSavedChatsModal] = useState(false);
  const [isViewingSavedChats, setIsViewingSavedChats] = useState(false);
  const refreshTimeoutRef = useRef(null);
  const hasFetchedChatsRef = useRef(false);

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
  // const API_BASE_URL = "http://127.0.0.1:8000";

  const sanitizeBotText = (text) => {
    if (typeof text !== "string") return "";
    return text.replace(/\*\*/g, "");
  };

  // Fetch chats on mount (only once)
  useEffect(() => {
    if (user && !hasFetchedChatsRef.current) {
      hasFetchedChatsRef.current = true;
      fetchChatsOnce();
      fetchSavedChats();
    }
  }, []);

  // When page loads, show a new empty chat (not from sidebar)
  // Sidebar still shows all previous chats that user can click to open
  useEffect(() => {
    if (!activeChat) {
      const newTempChat = {
        id: Date.now(),
        title: "New Chat",
      };
      setActiveChat(newTempChat);
      setMessages([
        { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
      ]);
    }
  }, []);

  const loadChatHistory = async (chat) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE_URL}/get-chat-history/${chat.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const formattedMessages = response.data.map((msg) => ({
        role: msg.role === "user" ? "user" : "bot",
        content: msg.role === "bot" ? sanitizeBotText(msg.content) : msg.content,
      }));
      
      // Only set if we got actual messages, otherwise show welcome
      if (formattedMessages.length > 0) {
        setMessages(formattedMessages);
      } else {
        setMessages([
          { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
        ]);
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
      setMessages([
        { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
      ]);
    }
  };

  const fetchChatsOnce = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/get-chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChats(response.data || []);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  };

  const fetchSavedChats = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/get-saved-chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedChats(response.data || []);
    } catch (error) {
      console.error("Failed to fetch saved chats:", error);
    }
  };

  const refreshChats = async () => {
    if (!user) return;
    
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Debounce: wait 1 second after last call before actually refreshing
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/get-chats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChats(response.data || []);
      } catch (error) {
        console.error("Failed to refresh chats:", error);
      }
    }, 1000);
  };

  const ensureNewChatIsSaved = () => {
    // If active chat exists and is not already in the chats list, add it
    if (activeChat && !chats.find((c) => c.id === activeChat.id)) {
      setChats((prevChats) => [activeChat, ...prevChats]);
    }
  };

  const handleSaveChat = (chat) => {
    // Check if chat is already saved
    const isSaved = savedChats.find((c) => c.id === chat.id);
    
    const token = localStorage.getItem("token");
    
    if (isSaved) {
      // Remove from saved
      axios.delete(
        `${API_BASE_URL}/save-chat/${chat.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(() => {
        setSavedChats(savedChats.filter((c) => c.id !== chat.id));
      }).catch((error) => {
        console.error("Failed to unsave chat:", error);
      });
    } else {
      // Add to saved
      axios.post(
        `${API_BASE_URL}/save-chat/${chat.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(() => {
        setSavedChats([...savedChats, chat]);
      }).catch((error) => {
        console.error("Failed to save chat:", error);
      });
    }
  };

  const handleRemoveSavedChat = (chatId) => {
    const token = localStorage.getItem("token");
    
    axios.delete(
      `${API_BASE_URL}/save-chat/${chatId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(() => {
      setSavedChats(savedChats.filter((c) => c.id !== chatId));
    }).catch((error) => {
      console.error("Failed to remove saved chat:", error);
    });
  };

  const handleSelectSavedChat = (chat) => {
    setActiveChat(chat);
    // Load chat history if it has messages
    if (chat.timestamp) {
      loadChatHistory(chat);
    }
    setIsSidebarOpen(false);
  };

  const handleShowSavedChats = () => {
    setIsViewingSavedChats(true);
    // Create a new empty chat
    const newChat = {
      id: Date.now(),
      title: "New Chat",
    };
    setActiveChat(newChat);
    setMessages([
      { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
    ]);
  };

  const handleBackToAllChats = () => {
    setIsViewingSavedChats(false);
    // Create a new empty chat
    const newChat = {
      id: Date.now(),
      title: "New Chat",
    };
    setActiveChat(newChat);
    setMessages([
      { role: "bot", content: "Hi 👋 Upload notes and ask me anything!" },
    ]);
  };

  return (
    <div className="relative flex min-h-screen bg-slate-900">
      <div className="hidden md:fixed md:left-0 md:top-0 md:h-screen md:w-72 md:z-30 md:block">
        <Sidebar
          chats={isViewingSavedChats ? savedChats : chats}
          setChats={isViewingSavedChats ? setSavedChats : setChats}
          setMessages={setMessages}
          user={user}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          onSaveChat={handleSaveChat}
          onShowSavedChats={handleShowSavedChats}
          isViewingSavedChats={isViewingSavedChats}
          onBackToAllChats={handleBackToAllChats}
          savedChatIds={savedChats.map((c) => c.id)}
        />
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div
        className={`fixed left-0 top-0 z-50 h-full w-72 transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          chats={isViewingSavedChats ? savedChats : chats}
          setChats={isViewingSavedChats ? setSavedChats : setChats}
          setMessages={setMessages}
          user={user}
          onClose={() => setIsSidebarOpen(false)}
          isMobile
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          onSaveChat={handleSaveChat}
          onShowSavedChats={handleShowSavedChats}
          isViewingSavedChats={isViewingSavedChats}
          onBackToAllChats={handleBackToAllChats}
          savedChatIds={savedChats.map((c) => c.id)}
        />
      </div>

      <div className="flex-1 min-w-0 md:ml-72">
        <ChatArea
          messages={messages}
          setMessages={setMessages}
          user={user}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          activeChat={activeChat}
          onMessageSent={refreshChats}
          onEnsureNewChatIsSaved={ensureNewChatIsSaved}
        />
      </div>

      {/* Saved Chats Modal */}
      <SavedChatsModal
        isOpen={showSavedChatsModal}
        onClose={() => setShowSavedChatsModal(false)}
        savedChats={savedChats}
        onSelectChat={handleSelectSavedChat}
        onRemoveChat={handleRemoveSavedChat}
      />
    </div>
  );
};

export default Home;