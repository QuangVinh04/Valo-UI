import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import { updateCurrentUserProfile } from '@/services/user.service';
import type { UserProfileDto } from '@/types/user.type';
import type { SettingsFormModal as SettingsFormModalType } from '@/types/settings.type';

type SettingsFormModalProps = {
  mode: SettingsFormModalType;
  userId?: string;
  phoneNumber: string;
  address: string;
  onClose: () => void;
  onProfileSaved: (user: UserProfileDto) => void;
};

function SettingsFormModal({
  mode,
  userId,
  phoneNumber,
  address,
  onClose,
  onProfileSaved,
}: SettingsFormModalProps) {
  const { t } = useTranslation();
  const { changePassword } = useAuth();
  const toast = useToast();
  const [value, setValue] = useState(mode === 'phone' ? phoneNumber : address);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const title = mode === 'phone'
    ? t('settings.updatePhone')
      : mode === 'address'
        ? t('settings.updateAddress')
        : t('settings.updatePassword');

  // Lưu thay đổi hồ sơ hoặc đổi mật khẩu tùy theo modal đang mở.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === 'password' && newPassword !== confirmPassword) {
      toast.error(t('settings.passwordsDoNotMatch'));
      return;
    }

    setIsSaving(true);

    try {
      if (mode === 'password') {
        await changePassword({ currentPassword, newPassword, confirmPassword });
        onClose();
        return;
      }

      if (!userId) {
        toast.error(t('settings.profileLoadFailed'));
        return;
      }

      const updatedUser = await updateCurrentUserProfile(
        userId,
        mode === 'phone' ? { phoneNumber: value } : { address: value },
      );
      onProfileSaved(updatedUser);
    } catch (err) {
      toast.error(getErrorMessage(err, t('settings.saveFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-modal-backdrop" onClick={() => { if (!isSaving) onClose(); }}>
      <form className="settings-modal panel-dark" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <header>
          <h3>{title}</h3>
          <button type="button" onClick={onClose}>x</button>
        </header>

        {mode === 'password' ? (
          <div className="settings-modal-body">
            <label>
              {t('settings.currentPassword')}
              <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            </label>
            <label>
              {t('settings.newPassword')}
              <input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
            </label>
            <label>
              {t('settings.confirmPassword')}
              <input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </label>
          </div>
        ) : (
          <div className="settings-modal-body">
            <label>
              {mode === 'phone' ? t('settings.phoneNumber') : t('settings.address')}
              <input value={value} onChange={(event) => setValue(event.target.value)} required />
            </label>
          </div>
        )}

        <footer>
          <button type="button" className="btn-muted" onClick={onClose}>{t('settings.cancel')}</button>
          <button type="submit" className="btn-blue" disabled={isSaving}>
            {isSaving ? t('settings.saving') : t('settings.save')}
          </button>
        </footer>
      </form>
    </div>
  );
}

export default SettingsFormModal;
