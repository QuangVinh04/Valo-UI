import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useChat } from '@/hooks/useChat';
import { clearAuthState } from '@/lib/auth';
import { getErrorMessage } from '@/lib/error';
import Modal from '@/components/common/Modal';
import { clearChatHistory, deleteCurrentAccount } from '@/services/settings.service';
import type { ConfirmAction } from '@/types/settings.type';

type ConfirmActionModalProps = {
  action: ConfirmAction;
  onClose: () => void;
  onSignedOut: () => void;
};

function ConfirmActionModal({ action, onClose, onSignedOut }: ConfirmActionModalProps) {
  const { t } = useTranslation();
  const { refreshAuth } = useAuth();
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

    } catch (err) {
      toast.error(getErrorMessage(err, t('settings.actionFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      backdropClassName="settings-modal-backdrop"
      className="settings-modal panel-dark"
      labelledBy="confirm-action-modal-title"
      describedBy="confirm-action-modal-description"
      isDismissDisabled={isSaving}
      onClose={onClose}
    >
        <header>
          <h3 id="confirm-action-modal-title">{copy.title}</h3>
          <button type="button" onClick={onClose}>x</button>
        </header>
        <p className="confirm-description" id="confirm-action-modal-description">{copy.description}</p>
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
    </Modal>
  );
}

export default ConfirmActionModal;
