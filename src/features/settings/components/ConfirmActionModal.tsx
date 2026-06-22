import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import { logout } from '@/services/auth.service';
import { clearChatHistory, deleteCurrentAccount } from '../api/settings.api';
import type { ConfirmAction } from '../types';

type ConfirmActionModalProps = {
  action: ConfirmAction;
  onClose: () => void;
  onSignedOut: () => void;
};

function ConfirmActionModal({ action, onClose, onSignedOut }: ConfirmActionModalProps) {
  const { t } = useTranslation();
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

  const handleConfirm = async () => {
    setIsSaving(true);

    try {
      if (action === 'clearChat') {
        await clearChatHistory();
        onClose();
        return;
      }

      if (action === 'deleteAccount') {
        await deleteCurrentAccount();
        localStorage.removeItem('accessToken');
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
