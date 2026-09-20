import { FiX, FiTrash2 } from "react-icons/fi";

const SavedChatsModal = ({ isOpen, onClose, savedChats, onSelectChat, onRemoveChat }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-lg max-w-md mx-4 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Saved Chats</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <FiX size={20} className="text-slate-400" />
          </button>
        </div>

        {savedChats.length === 0 ? (
          <p className="text-slate-400 text-center py-8">
            No saved chats yet. Click the save button on any chat to add it here.
          </p>
        ) : (
          <div className="space-y-2">
            {savedChats.map((chat) => (
              <div
                key={chat.id}
                className="flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 group transition-colors"
              >
                <button
                  onClick={() => {
                    onSelectChat(chat);
                    onClose();
                  }}
                  className="flex-1 text-left text-sm text-slate-200 hover:text-white transition-colors truncate"
                  title={chat.title}
                >
                  {chat.title}
                </button>
                <button
                  onClick={() => onRemoveChat(chat.id)}
                  className="ml-2 p-1 rounded hover:bg-red-600/20 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from saved"
                >
                  <FiTrash2 size={16} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedChatsModal;
