import { CSSProperties, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Archive, Check, Folder, MessageSquare, MoreHorizontal, Pencil, Pin, Share2, Trash2, UserPlus, X } from 'lucide-react';
import { useChat } from '@/hooks/useChat';

function ChatSidebarRecents() {
  const chat = useChat();
  const navigate = useNavigate();
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chat');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuPosition, setMenuPosition] = useState<CSSProperties | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!listRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
        setDeleteTarget(null);
        cancelRename();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectConversation = (conversationId: string) => {
    if (editingId) return;
    navigate(`/chat/${conversationId}`);
  };

  const toggleMenu = (conversationId: string, trigger: HTMLButtonElement) => {
    if (openMenuId === conversationId) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }

    const rect = trigger.getBoundingClientRect();
    setOpenMenuId(conversationId);
    setMenuPosition({
      top: Math.min(rect.bottom + 6, window.innerHeight - 260),
      left: Math.min(rect.right - 12, window.innerWidth - 196),
    });
  };

  const startRename = (conversationId: string, title: string) => {
    setEditingId(conversationId);
    setDraftTitle(title);
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const saveRename = async () => {
    if (!editingId) return;
    if (!draftTitle.trim()) return;

    await chat.renameChat(editingId, draftTitle);
    setEditingId(null);
    setDraftTitle('');
  };

  const cancelRename = () => {
    setEditingId(null);
    setDraftTitle('');
  };

  const openDeleteConfirmation = (conversationId: string, title: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    setDeleteTarget({ id: conversationId, title });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      await chat.deleteChat(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="sidebar-chat-recents">
      <header>
        <h3>Recents</h3>
      </header>
      <div className="sidebar-chat-list" ref={listRef}>
        {chat.isLoading && <div className="sidebar-chat-state">Loading conversations...</div>}
        {!chat.isLoading && !chat.conversations.length && (
          <div className="sidebar-chat-state">No conversations yet</div>
        )}
        {chat.conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`sidebar-chat-row ${isChatRoute && conversation.id === chat.activeConversationId ? 'active' : ''}`}
          >
            {editingId === conversation.id ? (
              <div className="sidebar-chat-edit">
                <input
                  value={draftTitle}
                  autoFocus
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void saveRename();
                    if (event.key === 'Escape') cancelRename();
                  }}
                />
                <button
                  type="button"
                  aria-label="Save conversation title"
                  onClick={() => void saveRename()}
                  disabled={!draftTitle.trim()}
                >
                  <Check size={15} aria-hidden="true" />
                </button>
                <button type="button" aria-label="Cancel rename" onClick={cancelRename}>
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="sidebar-chat-title"
                  title={conversation.title}
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <MessageSquare size={15} aria-hidden="true" />
                  <span>{conversation.title}</span>
                </button>
                <div className="sidebar-chat-menu-wrap">
                  <button
                    type="button"
                    className="sidebar-chat-menu-trigger"
                    aria-label={`Open actions for ${conversation.title}`}
                    onClick={(event) => toggleMenu(conversation.id, event.currentTarget)}
                  >
                    <MoreHorizontal size={17} aria-hidden="true" />
                  </button>
                  {openMenuId === conversation.id && menuPosition && createPortal(
                    <div className="sidebar-chat-menu" style={menuPosition} ref={menuRef}>
                      <button type="button" onClick={() => startRename(conversation.id, conversation.title)}>
                        <Pencil size={15} aria-hidden="true" />
                        Rename
                      </button>
                      <span className="sidebar-chat-menu-divider" aria-hidden="true" />
                      <button type="button" className="danger" onClick={() => openDeleteConfirmation(conversation.id, conversation.title)}>
                        <Trash2 size={15} aria-hidden="true" />
                        Delete
                      </button>
                    </div>,
                    document.body
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {deleteTarget && (
        <div className="settings-modal-backdrop">
          <section className="settings-modal panel-dark">
            <header>
              <h3>Delete conversation?</h3>
              <button type="button" onClick={() => setDeleteTarget(null)}>x</button>
            </header>
            <p className="confirm-description">
              This will permanently delete <strong>{deleteTarget.title}</strong> and all of its messages.
              This action cannot be undone.
            </p>
            <footer>
              <button type="button" className="btn-muted" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </button>
              <button type="button" className="btn-solid-danger" onClick={() => void handleDelete()} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

export default ChatSidebarRecents;
