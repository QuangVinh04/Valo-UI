import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useChat } from '@/hooks/useChat';
import { clearAuthState } from '@/lib/auth';
import { getErrorMessage } from '@/lib/error';
import { clearChatHistory, deleteCurrentAccount } from '@/services/settings.service';
import type { ConfirmAction } from '@/types/settings.type';

type ConfirmActionModalProps = {
  action: ConfirmAction;
  onClose: () => void;
  onSignedOut: () => void;
};

function ConfirmActionModal({ action, onClose, onSignedOut }: ConfirmActionModalProps) {
  const { t } = useTranslation();
  const { logout, refreshAuth } = useAuth();
  const chat = useChat();
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const copy = {
    clearChat: {
      title: t('settings.confirmClearTitle'),
      description: t('settings.confirmClearDescription'),
      confirmLabel: t('settings.clear'),
      danger: true,
    },
    deleteAccount: {
      title: t('settings.confirmDeleteTitle'),
      description: t('settings.confirmDeleteDescription'),
      confirmLabel: t('settings.delete'),
      danger: true,
    },
    signOut: {
      title: t('settings.confirmSignOutTitle'),
      description: t('settings.confirmSignOutDescription'),
      confirmLabel: t('settings.signOut'),
      danger: false,
    },
  }[action];

  // Thực thi thao tác nhạy cảm sau khi người dùng xác nhận trong modal.
  const handleConfirm = async () => {
    setIsSaving(true);

    try {
      if (action === 'clearChat') {
        await clearChatHistory();
        chat.clearChatHistoryState();
        onClose();
        return;
      }

      if (action === 'deleteAccount') {
        await deleteCurrentAccount();
        clearAuthState();
        refreshAuth();
        onSignedOut();
        return;
      }

      await logout();
      onSignedOut();
    } catch (err) {
      toast.error(getErrorMessage(err, t('settings.actionFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-modal-backdrop">
      <section className="settings-modal panel-dark">
        <header>
          <h3>{copy.title}</h3>
          <button type="button" onClick={onClose}>x</button>
        </header>
        <p className="confirm-description">{copy.description}</p>
        <footer>
          <button type="button" className="btn-muted" onClick={onClose}>{t('settings.cancel')}</button>
          <button
            type="button"
            className={copy.danger ? 'btn-solid-danger' : 'btn-blue'}
            disabled={isSaving}
            onClick={handleConfirm}
          >
            {isSaving ? t('settings.saving') : copy.confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default ConfirmActionModal;
