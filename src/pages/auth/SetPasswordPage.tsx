import { FormEvent, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import { setPassword } from '@/services/auth.service';

function getPasswordErrorKey(password: string): string | undefined {
  if (password.length < 8) return 'auth.passwordErrorLength';
  if (!/[A-Z]/.test(password)) return 'auth.passwordErrorUppercase';
  if (!/[a-z]/.test(password)) return 'auth.passwordErrorLowercase';
  if (!/\d/.test(password)) return 'auth.passwordErrorNumber';
  if (!/[^A-Za-z0-9]/.test(password)) return 'auth.passwordErrorSymbol';
  return undefined;
}

function SetPasswordPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const newPasswordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isResetFlow = location.pathname === '/reset-password';
  const copy = isResetFlow
    ? {
        title: 'auth.resetPasswordTitle',
        subtitle: 'auth.resetPasswordSubtitle',
        submit: 'auth.resetPassword',
        submitting: 'auth.resettingPassword',
        success: 'auth.passwordResetSuccess',
        failure: 'auth.resetPasswordFailed',
        invalidLink: 'auth.invalidResetPasswordLink',
      }
    : {
        title: 'auth.activateAccountTitle',
        subtitle: 'auth.activateAccountSubtitle',
        submit: 'auth.activateAccount',
        submitting: 'auth.activatingAccount',
        success: 'auth.accountActivatedSuccess',
        failure: 'auth.activateAccountFailed',
        invalidLink: 'auth.invalidInvitationLink',
      };
  const token = searchParams.get('token')?.trim() ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touchedFields, setTouchedFields] = useState({
    newPassword: false,
    confirmPassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordStrengthErrorKey = useMemo(
    () => (newPassword ? getPasswordErrorKey(newPassword) : undefined),
    [newPassword]
  );
  const passwordErrorKey = touchedFields.newPassword
    ? !newPassword
      ? 'auth.passwordRequired'
      : passwordStrengthErrorKey
    : undefined;
  const passwordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;
  const confirmPasswordError = touchedFields.confirmPassword
    ? !confirmPassword
      ? t('auth.confirmPasswordRequired')
      : newPassword !== confirmPassword
        ? t('auth.passwordsDoNotMatch')
        : ''
    : '';
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) return;
    setTouchedFields({ newPassword: true, confirmPassword: true });

    if (!newPassword || passwordStrengthErrorKey) {
      newPasswordInputRef.current?.focus();
      if (newPassword) toast.error(t('auth.passwordStrengthFailed'));
      return;
    }
    if (!confirmPassword || newPassword !== confirmPassword) {
      confirmPasswordInputRef.current?.focus();
      if (confirmPassword) toast.error(t('auth.passwordsDoNotMatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      await setPassword({ token, newPassword, confirmPassword });
      toast.success(t(copy.success));
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, t(copy.failure)));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="home-shell">
      <Header />
      <main className="home-main">
        <section className="auth-card-wrap">
          <div className="auth-card">
            <h1>{t(copy.title)}</h1>
            <p className="auth-subtitle">{t(copy.subtitle)}</p>

            {!token ? (
              <div role="alert">
                <p className="auth-field-error">{t(copy.invalidLink)}</p>
                <p className="auth-switch">
                  <Link to={isResetFlow ? '/forgot-password' : '/login'}>
                    {t(isResetFlow ? 'auth.requestNewResetLink' : 'auth.backToLogin')}
                  </Link>
                </p>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <label htmlFor="token-new-password">
                  {t('auth.newPassword')}<span className="auth-required" aria-hidden="true">*</span>
                </label>
                <input
                  ref={newPasswordInputRef}
                  className={passwordErrorKey ? 'field-invalid' : undefined}
                  id="token-new-password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  onBlur={() => setTouchedFields((current) => ({ ...current, newPassword: true }))}
                  aria-invalid={Boolean(passwordErrorKey)}
                  aria-describedby={passwordErrorKey ? 'token-password-error' : 'token-password-hint'}
                  required
                />
                {passwordErrorKey ? (
                  <p className="auth-field-error" id="token-password-error" aria-live="polite">
                    {t(passwordErrorKey)}
                  </p>
                ) : (
                  <div className="password-rules" id="token-password-hint">
                    <p>{t('auth.passwordRequirements')}</p>
                  </div>
                )}

                <label htmlFor="token-confirm-password">
                  {t('auth.confirmPassword')}<span className="auth-required" aria-hidden="true">*</span>
                </label>
                <input
                  ref={confirmPasswordInputRef}
                  className={confirmPasswordError ? 'field-invalid' : undefined}
                  id="token-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onBlur={() => setTouchedFields((current) => ({ ...current, confirmPassword: true }))}
                  aria-invalid={Boolean(confirmPasswordError)}
                  aria-describedby={confirmPasswordError ? 'token-confirm-password-error' : undefined}
                  required
                />
                {confirmPasswordError && (
                  <p className="auth-field-error" id="token-confirm-password-error" aria-live="polite">
                    {confirmPasswordError}
                  </p>
                )}

                <button className="auth-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? t(copy.submitting)
                    : t(copy.submit)}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default SetPasswordPage;
