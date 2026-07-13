import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import Modal from '@/components/common/Modal';
import { updateCurrentUserProfile } from '@/services/user.service';
import type { UserProfileDto } from '@/types/user.type';
import type { SettingsFormModal as SettingsFormModalType } from '@/types/settings.type';

type SettingsFormModalProps = {
  mode: SettingsFormModalType;
  userId?: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  onClose: () => void;
  onProfileSaved: (user: UserProfileDto) => void;
};

type PasswordCheck = {
  errorKey: string;
  isValid: boolean;
};

function getPasswordChecks(password: string, currentPassword: string): PasswordCheck[] {
  return [
    { errorKey: 'auth.passwordErrorLength', isValid: password.length >= 8 },
    { errorKey: 'auth.passwordErrorUppercase', isValid: /[A-Z]/.test(password) },
    { errorKey: 'auth.passwordErrorLowercase', isValid: /[a-z]/.test(password) },
    { errorKey: 'auth.passwordErrorNumber', isValid: /\d/.test(password) },
    { errorKey: 'auth.passwordErrorSymbol', isValid: /[^A-Za-z0-9]/.test(password) },
    {
      errorKey: 'auth.passwordErrorDifferent',
      isValid: Boolean(password) && (!currentPassword || password !== currentPassword),
    },
  ];
}

function SettingsFormModal({
  mode,
  userId,
  fullName,
  phoneNumber,
  address,
  onClose,
  onProfileSaved,
}: SettingsFormModalProps) {
  const { t } = useTranslation();
  const { changePassword } = useAuth();
  const toast = useToast();
  const [value, setValue] = useState(
    mode === 'name' ? fullName : mode === 'phone' ? phoneNumber : address,
  );
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const passwordChecks = useMemo(
    () => getPasswordChecks(newPassword, currentPassword),
    [currentPassword, newPassword],
  );
  const isPasswordStrong = passwordChecks.every((check) => check.isValid);
  const passwordValidationError = newPassword
    ? passwordChecks.find((check) => !check.isValid)?.errorKey
    : undefined;
  const doPasswordsMatch = !confirmPassword || newPassword === confirmPassword;
  const canSubmitPassword = Boolean(currentPassword)
    && isPasswordStrong
    && Boolean(confirmPassword)
    && doPasswordsMatch;

  const title = mode === 'name'
    ? t('settings.updateFullName')
    : mode === 'phone'
      ? t('settings.updatePhone')
      : mode === 'address'
        ? t('settings.updateAddress')
        : t('settings.updatePassword');

  // Lưu thay đổi hồ sơ hoặc đổi mật khẩu tùy theo modal đang mở.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === 'password') {
      if (!isPasswordStrong) {
        toast.error(t('auth.passwordStrengthFailed'));
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error(t('settings.passwordsDoNotMatch'));
        return;
      }
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
        mode === 'name'
          ? { fullName: value.trim() }
          : mode === 'phone'
            ? { phoneNumber: value }
            : { address: value },
      );
      onProfileSaved(updatedUser);
    } catch (err) {
      toast.error(getErrorMessage(err, t('settings.saveFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      as="form"
      backdropClassName="settings-modal-backdrop"
      className="settings-modal panel-dark"
      labelledBy="settings-form-modal-title"
      isDismissDisabled={isSaving}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
        <header>
          <h3 id="settings-form-modal-title">{title}</h3>
          <IconButton icon={X} label={t('common.close')} onClick={onClose} />
        </header>

        {mode === 'password' ? (
          <div className="settings-modal-body">
            <label>
              {t('settings.currentPassword')}
              <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            </label>
            <label>
              {t('settings.newPassword')}
              <input
                className={passwordValidationError ? 'field-invalid' : undefined}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-invalid={Boolean(passwordValidationError)}
                aria-describedby={passwordValidationError ? 'settings-password-error' : 'settings-password-hint'}
                required
              />
              {passwordValidationError ? (
                <span className="settings-field-error" id="settings-password-error" aria-live="polite">
                  {t(passwordValidationError)}
                </span>
              ) : (
                <span className="settings-password-rules" id="settings-password-hint">
                  {t('auth.passwordChangeRequirements')}
                </span>
              )}
            </label>
            <label>
              {t('settings.confirmPassword')}
              <input
                className={!doPasswordsMatch ? 'field-invalid' : undefined}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={!doPasswordsMatch}
                aria-describedby={!doPasswordsMatch ? 'settings-confirm-password-error' : undefined}
                required
              />
              {!doPasswordsMatch && (
                <span className="settings-field-error" id="settings-confirm-password-error" aria-live="polite">
                  {t('settings.passwordsDoNotMatch')}
                </span>
              )}
            </label>
          </div>
        ) : (
          <div className="settings-modal-body">
            <label>
              {mode === 'name'
                ? t('settings.fullName')
                : mode === 'phone'
                  ? t('settings.phoneNumber')
                  : t('settings.address')}
              <input value={value} onChange={(event) => setValue(event.target.value)} required />
            </label>
          </div>
        )}

        <footer>
          <button type="button" className="btn-cancel" onClick={onClose}>{t('settings.cancel')}</button>
          <button
            type="submit"
            className="btn-blue"
            disabled={isSaving || (mode === 'password' && !canSubmitPassword)}
          >
            {isSaving ? t('settings.saving') : t('settings.save')}
          </button>
        </footer>
    </Modal>
  );
}

export default SettingsFormModal;
