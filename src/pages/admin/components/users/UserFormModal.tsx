import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, UserRound, X } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import { useToast } from '@/context/ToastContext';
import { createUser, updateUser } from '@/services/user.service';
import type { GroupListItemDto } from '@/types/group.type';
import type { UserDto } from '@/types/user.type';

type UserFormModalProps = {
  mode: 'add' | 'update';
  user?: UserDto;
  groups?: GroupListItemDto[];
  onClose: () => void;
  onSaved: () => void;
};

type RequiredField = 'fullName' | 'email' | 'password' | 'confirmPassword';

type PasswordCheck = {
  labelKey: string;
  errorKey: string;
  isValid: boolean;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    {
      labelKey: 'auth.passwordRuleLength',
      errorKey: 'auth.passwordErrorLength',
      isValid: password.length >= 8,
    },
    {
      labelKey: 'auth.passwordRuleUppercase',
      errorKey: 'auth.passwordErrorUppercase',
      isValid: /[A-Z]/.test(password),
    },
    {
      labelKey: 'auth.passwordRuleLowercase',
      errorKey: 'auth.passwordErrorLowercase',
      isValid: /[a-z]/.test(password),
    },
    {
      labelKey: 'auth.passwordRuleNumber',
      errorKey: 'auth.passwordErrorNumber',
      isValid: /\d/.test(password),
    },
    {
      labelKey: 'auth.passwordRuleSymbol',
      errorKey: 'auth.passwordErrorSymbol',
      isValid: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

function UserFormModal({ mode, user, onClose, onSaved }: UserFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const isUpdate = mode === 'update';

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [touchedFields, setTouchedFields] = useState<Record<RequiredField, boolean>>({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  const isPasswordStrong = passwordChecks.every((check) => check.isValid);
  const passwordRuleErrorKey = passwordChecks.find((check) => !check.isValid)?.errorKey;

  const fullNameError = touchedFields.fullName && !fullName.trim()
    ? t('admin.users.fullNameRequired')
    : '';
  const emailError = !isUpdate
    ? touchedFields.email && !email.trim()
      ? t('admin.users.emailRequired')
      : email.trim() && !isValidEmail(email)
        ? t('auth.emailFormatInvalid')
        : ''
    : '';
  const passwordError = !isUpdate && (password || touchedFields.password) && passwordRuleErrorKey
    ? t(passwordRuleErrorKey)
    : '';
  const confirmPasswordError = !isUpdate && touchedFields.confirmPassword && password !== confirmPassword
    ? t('auth.passwordsDoNotMatch')
    : '';

  function markFieldTouched(field: RequiredField) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit() {
    const name = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhoneNumber = phoneNumber.trim();
    const normalizedAddress = address.trim();

    if (!name || (!isUpdate && !normalizedEmail)) {
      setTouchedFields({
        fullName: true,
        email: true,
        password: true,
        confirmPassword: true,
      });

      toast.error(t('admin.users.nameEmailRequired'));
      return;
    }

    if (!isUpdate && !isValidEmail(normalizedEmail)) {
      setTouchedFields((current) => ({ ...current, email: true }));
      toast.error(t('auth.emailFormatInvalid'));
      return;
    }

    if (!isUpdate && (!isPasswordStrong || password !== confirmPassword)) {
      setTouchedFields((current) => ({
        ...current,
        password: true,
        confirmPassword: true,
      }));
      toast.error(!isPasswordStrong ? t('auth.passwordStrengthFailed') : t('auth.passwordsDoNotMatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      if (isUpdate && user) {
        await updateUser(user.id, {
          fullName: name,
          phoneNumber: normalizedPhoneNumber,
          address: normalizedAddress,
        });

        toast.success(t('admin.users.updated', { name }));
      } else {
        await createUser({
          fullName: name,
          email: normalizedEmail,
          password,
          confirmPassword,
          phoneNumber: normalizedPhoneNumber,
          address: normalizedAddress,
        });

        toast.success(t('admin.users.created', { name }));
      }

      onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('admin.users.saveFailed');

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => { if (!isSubmitting) onClose(); }}>
      <section className="modal-card user-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2 className="modal-title">
            {isUpdate ? (
              <UserRound size={21} aria-hidden="true" />
            ) : (
              <UserPlus size={21} aria-hidden="true" />
            )}

            {isUpdate
              ? t('admin.users.updateUserTitle')
              : t('admin.users.addNewUser')}
          </h2>

          <IconButton
            icon={X}
            label={t('admin.users.closeUserForm')}
            onClick={onClose}
          />
        </header>

        <div className="modal-body">
          <label>
            <span className="form-label-text">
              {t('admin.users.fullName')}
              <span className="required-mark" aria-hidden="true">*</span>
            </span>
            <input
              className={fullNameError ? 'field-invalid' : undefined}
              value={fullName}
              placeholder={t('admin.users.enterFullName')}
              onChange={(event) => setFullName(event.target.value)}
              onBlur={() => markFieldTouched('fullName')}
              aria-invalid={Boolean(fullNameError)}
              aria-describedby="user-full-name-error"
            />
            <span className="field-error" id="user-full-name-error" aria-live="polite">
              {fullNameError}
            </span>
          </label>

          <label>
            <span className="form-label-text">
              {t('auth.emailAddress')}
              {!isUpdate && <span className="required-mark" aria-hidden="true">*</span>}
            </span>
            <input
              className={[
                isUpdate ? 'locked-input' : undefined,
                emailError ? 'field-invalid' : undefined,
              ].filter(Boolean).join(' ') || undefined}
              type="email"
              value={email}
              placeholder="name@company.com"
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => markFieldTouched('email')}
              readOnly={isUpdate}
              aria-readonly={isUpdate}
              aria-invalid={Boolean(emailError)}
              aria-describedby="user-email-error"
            />
            <span className="field-error" id="user-email-error" aria-live="polite">
              {emailError}
            </span>
          </label>

          {!isUpdate && (
            <>
              <label>
                <span className="form-label-text">
                  {t('auth.password')}
                  <span className="required-mark" aria-hidden="true">*</span>
                </span>
                <input
                  className={passwordError ? 'field-invalid' : undefined}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  placeholder={t('auth.newPasswordPlaceholder')}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => markFieldTouched('password')}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? 'user-password-error' : 'user-password-hint'}
                />
                <span className="field-error" id="user-password-error" aria-live="polite">
                  {passwordError}
                </span>
              </label>

              {!passwordError && (
                <div className="modal-password-rules" id="user-password-hint">
                  <p>{t('auth.passwordRequirements')}</p>
                </div>
              )}

              <label>
                <span className="form-label-text">
                  {t('auth.confirmPassword')}
                  <span className="required-mark" aria-hidden="true">*</span>
                </span>
                <input
                  className={confirmPasswordError ? 'field-invalid' : undefined}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onBlur={() => markFieldTouched('confirmPassword')}
                  aria-invalid={Boolean(confirmPasswordError)}
                  aria-describedby="user-confirm-password-error"
                />
                <span className="field-error" id="user-confirm-password-error" aria-live="polite">
                  {confirmPasswordError}
                </span>
              </label>
            </>
          )}

          <label>
            <span className="form-label-text">{t('admin.users.phoneNumber')}</span>
            <input
              value={phoneNumber}
              placeholder="+84 901 234 567"
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
            <span className="field-error" aria-hidden="true" />
          </label>

          <label>
            <span className="form-label-text">{t('admin.users.address')}</span>
            <input
              value={address}
              placeholder={t('admin.users.enterAddress')}
              onChange={(event) => setAddress(event.target.value)}
            />
            <span className="field-error" aria-hidden="true" />
          </label>
        </div>

        <footer className="modal-footer">
          <button className="btn-cancel" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>

          <button
            className="btn-primary"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t('admin.users.saving')
              : isUpdate
                ? t('common.update')
                : t('common.create')}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default UserFormModal;
