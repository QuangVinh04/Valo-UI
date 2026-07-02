import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import '@/styles/pages/home.css';

type PasswordCheck = {
  key: string;
  labelKey: string;
  isValid: boolean;
};

function getPasswordChecks(password: string, currentPassword: string): PasswordCheck[] {
  return [
    {
      key: 'length',
      labelKey: 'auth.passwordRuleLength',
      isValid: password.length >= 8,
    },
    {
      key: 'uppercase',
      labelKey: 'auth.passwordRuleUppercase',
      isValid: /[A-Z]/.test(password),
    },
    {
      key: 'lowercase',
      labelKey: 'auth.passwordRuleLowercase',
      isValid: /[a-z]/.test(password),
    },
    {
      key: 'number',
      labelKey: 'auth.passwordRuleNumber',
      isValid: /\d/.test(password),
    },
    {
      key: 'symbol',
      labelKey: 'auth.passwordRuleSymbol',
      isValid: /[^A-Za-z0-9]/.test(password),
    },
    {
      key: 'different',
      labelKey: 'auth.passwordRuleDifferent',
      isValid: Boolean(password) && (!currentPassword || password !== currentPassword),
    },
  ];
}

function ChangePasswordPage() {
  const { t } = useTranslation();
  const { authLoading, isAuthenticated, changePassword } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const loginState = location.state as { currentPassword?: string } | null;
  const loginCurrentPassword = loginState?.currentPassword;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const effectiveCurrentPassword = loginCurrentPassword || currentPassword;
  const passwordChecks = useMemo(
    () => getPasswordChecks(newPassword, effectiveCurrentPassword),
    [effectiveCurrentPassword, newPassword]
  );
  const isPasswordStrong = passwordChecks.every((check) => check.isValid);
  const doPasswordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;
  const canSubmit = Boolean(effectiveCurrentPassword)
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
        currentPassword: effectiveCurrentPassword,
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
              {!loginCurrentPassword && (
                <>
                  <label htmlFor="currentPassword">{t('auth.currentPassword')}</label>
                  <div className="password-field">
                    <input
                      id="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      placeholder={t('auth.temporaryPasswordPlaceholder')}
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      required
                    />
                    <span aria-hidden="true"><LockKeyhole size={18} /></span>
                  </div>
                </>
              )}

              <label htmlFor="newPassword">{t('auth.newPassword')}</label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder={t('auth.newPasswordPlaceholder')}
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
              <div className="password-rules" aria-live="polite">
                <p>{t('auth.passwordRequirements')}</p>
                <ul>
                  {passwordChecks.map((check) => (
                    <li
                      key={check.key}
                      className={check.isValid ? 'is-valid' : undefined}
                    >
                      {t(check.labelKey)}
                    </li>
                  ))}
                </ul>
              </div>

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
