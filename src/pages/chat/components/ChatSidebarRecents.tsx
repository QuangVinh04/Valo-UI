import { CSSProperties, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, MessageSquare, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react';
import Modal from '@/components/common/Modal';
import { useChat } from '@/hooks/useChat';

function ChatSidebarRecents() {
  const { t } = useTranslation();
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
    // Đóng menu hành động khi người dùng bấm ra ngoài vùng sidebar/menu.
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!listRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    // Escape đóng menu và trạng thái đổi tên đang mở. Modal xóa tự xử lý Escape bằng Modal primitive.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
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

  // Điều hướng đến hội thoại được chọn, trừ khi đang sửa tên.
  const handleSelectConversation = (conversationId: string) => {
    if (editingId) return;
    navigate(`/chat/${conversationId}`);
  };

  // Mở menu hành động tại vị trí của nút ba chấm nhưng giữ trong viewport.
  const toggleMenu = (conversationId: string, trigger: HTMLButtonElement) => {
    if (openMenuId === conversationId) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }

    const rect = trigger.getBoundingClientRect();
    setOpenMenuId(conversationId);
    setMenuPosition({
      top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 260)),
      left: Math.max(8, Math.min(rect.right - 12, window.innerWidth - 196)),
    });
  };

  // Chuyển một dòng hội thoại sang chế độ nhập tên mới.
  const startRename = (conversationId: string, title: string) => {
    setEditingId(conversationId);
    setDraftTitle(title);
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  // Lưu tên hội thoại sau khi đã kiểm tra có nội dung hợp lệ.
  const saveRename = async () => {
    if (!editingId) return;
    if (!draftTitle.trim()) return;

    await chat.renameChat(editingId, draftTitle);
    setEditingId(null);
    setDraftTitle('');
  };

  // Hủy đổi tên và xóa draft hiện tại.
  const cancelRename = () => {
    setEditingId(null);
    setDraftTitle('');
  };

  // Mở modal xác nhận xóa cho đúng hội thoại người dùng chọn.
  const openDeleteConfirmation = (conversationId: string, title: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    setDeleteTarget({ id: conversationId, title });
  };

  // Xóa hội thoại qua shared chat state để sidebar và nội dung đang mở cùng cập nhật.
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
        <h3>{t('chat.recents')}</h3>
      </header>
      <div className="sidebar-chat-list" ref={listRef}>
        {chat.isLoading && <div className="sidebar-chat-state">{t('chat.loadingConversations')}</div>}
        {!chat.isLoading && !chat.conversations.length && (
          <div className="sidebar-chat-state">{t('chat.noConversations')}</div>
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
                  aria-label={t('chat.saveConversationTitle')}
                  onClick={() => void saveRename()}
                  disabled={!draftTitle.trim()}
                >
                  <span className="ui-checkmark">
                    <Check size={14} aria-hidden="true" />
                  </span>
                </button>
                <button type="button" aria-label={t('chat.cancelRename')} onClick={cancelRename}>
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
                    aria-label={t('chat.openActionsFor', { title: conversation.title })}
                    onClick={(event) => toggleMenu(conversation.id, event.currentTarget)}
                  >
                    <MoreHorizontal size={17} aria-hidden="true" />
                  </button>
                  {openMenuId === conversation.id && menuPosition && createPortal(
                    <div className="sidebar-chat-menu" style={menuPosition} ref={menuRef}>
                      <button type="button" onClick={() => startRename(conversation.id, conversation.title)}>
                        <Pencil size={15} aria-hidden="true" />
                        {t('chat.rename')}
                      </button>
                      <span className="sidebar-chat-menu-divider" aria-hidden="true" />
                      <button type="button" className="danger" onClick={() => openDeleteConfirmation(conversation.id, conversation.title)}>
                        <Trash2 size={15} aria-hidden="true" />
                        {t('common.delete')}
                      </button>
                    </div>,
                    document.body
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        {!chat.isLoading && chat.hasMoreConversations && (
          <button
            type="button"
            className="sidebar-chat-load-more"
            disabled={chat.isLoadingMoreConversations}
            onClick={() => void chat.loadMoreConversations()}
          >
            {chat.isLoadingMoreConversations
              ? t('chat.loadingMoreConversations')
              : t('chat.loadMoreConversations')}
          </button>
        )}
      </div>
      {deleteTarget && (
        <Modal
          backdropClassName="settings-modal-backdrop"
          className="settings-modal panel-dark"
          labelledBy="delete-conversation-modal-title"
          describedBy="delete-conversation-modal-description"
          isDismissDisabled={isDeleting}
          onClose={() => setDeleteTarget(null)}
        >
            <header>
              <h3 id="delete-conversation-modal-title">{t('chat.deleteConversation')}</h3>
              <button type="button" onClick={() => setDeleteTarget(null)}>x</button>
            </header>
            <p className="confirm-description" id="delete-conversation-modal-description">
              <Trans
                i18nKey="chat.deleteConversationDescription"
                values={{ title: deleteTarget.title }}
                components={{ strong: <strong /> }}
              />
            </p>
            <footer>
              <button type="button" className="btn-muted" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn-solid-danger" onClick={() => void handleDelete()} disabled={isDeleting}>
                {isDeleting ? t('common.deleting') : t('common.delete')}
              </button>
            </footer>
        </Modal>
      )}
    </section>
  );
}

export default ChatSidebarRecents;
