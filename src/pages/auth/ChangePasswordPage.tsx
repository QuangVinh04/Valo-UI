import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';

type PasswordCheck = {
  key: string;
  labelKey: string;
  errorKey: string;
  isValid: boolean;
};

function getPasswordChecks(password: string, currentPassword: string): PasswordCheck[] {
  return [
    {
      key: 'length',
      labelKey: 'auth.passwordRuleLength',
      errorKey: 'auth.passwordErrorLength',
      isValid: password.length >= 8,
    },
    {
      key: 'uppercase',
      labelKey: 'auth.passwordRuleUppercase',
      errorKey: 'auth.passwordErrorUppercase',
      isValid: /[A-Z]/.test(password),
    },
    {
      key: 'lowercase',
      labelKey: 'auth.passwordRuleLowercase',
      errorKey: 'auth.passwordErrorLowercase',
      isValid: /[a-z]/.test(password),
    },
    {
      key: 'number',
      labelKey: 'auth.passwordRuleNumber',
      errorKey: 'auth.passwordErrorNumber',
      isValid: /\d/.test(password),
    },
    {
      key: 'symbol',
      labelKey: 'auth.passwordRuleSymbol',
      errorKey: 'auth.passwordErrorSymbol',
      isValid: /[^A-Za-z0-9]/.test(password),
    },
    {
      key: 'different',
      labelKey: 'auth.passwordRuleDifferent',
      errorKey: 'auth.passwordErrorDifferent',
      isValid: Boolean(password) && (!currentPassword || password !== currentPassword),
    },
  ];
}

function ChangePasswordPage() {
  const { t } = useTranslation();
  const { authLoading, isAuthenticated, changePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordChecks = useMemo(
    () => getPasswordChecks(newPassword, currentPassword),
    [currentPassword, newPassword]
  );
  const isPasswordStrong = passwordChecks.every((check) => check.isValid);
  const passwordValidationError = newPassword
    ? passwordChecks.find((check) => !check.isValid)?.errorKey
    : undefined;
  const doPasswordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;
  const canSubmit = Boolean(currentPassword)
    && isPasswordStrong
    && doPasswordsMatch
    && !isSubmitting;

  // Kiểm tra xác nhận mật khẩu trước khi gọi API đổi mật khẩu.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isPasswordStrong) {
      toast.error(t('auth.passwordStrengthFailed'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwordsDoNotMatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      navigate('/chat', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, t('auth.passwordUpdateFailed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        {t('layout.checkingSession')}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="home-shell">
      <Header />
      <main className="home-main">
        <section className="auth-card-wrap">
          <div className="auth-card">
            <p className="auth-kicker">{t('auth.passwordReset')}</p>
            <h1>{t('auth.changePassword')}</h1>
            <p className="auth-subtitle">
              {t('auth.changePasswordSubtitle')}
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="currentPassword">{t('auth.currentPassword')}</label>
              <div className="password-field">
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  placeholder={t('auth.currentPasswordPlaceholder')}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
                <span aria-hidden="true"><LockKeyhole size={18} /></span>
              </div>

              <label htmlFor="newPassword">{t('auth.newPassword')}</label>
              <input
                className={passwordValidationError ? 'field-invalid' : undefined}
                id="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder={t('auth.newPasswordPlaceholder')}
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-invalid={Boolean(passwordValidationError)}
                aria-describedby={passwordValidationError ? 'new-password-error' : 'new-password-hint'}
                required
              />
              {passwordValidationError ? (
                <p className="auth-field-error" id="new-password-error" aria-live="polite">
                  {t(passwordValidationError)}
                </p>
              ) : (
                <div className="password-rules" id="new-password-hint">
                  <p>{t('auth.passwordChangeRequirements')}</p>
                </div>
              )}

              <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder={t('auth.confirmPasswordPlaceholder')}
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              {confirmPassword && !doPasswordsMatch && (
                <p className="auth-field-error">{t('auth.passwordsDoNotMatch')}</p>
              )}

              <button className="auth-submit" type="submit" disabled={!canSubmit}>
                {isSubmitting ? t('auth.updatingPassword') : t('auth.updatePassword')}
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default ChangePasswordPage;
