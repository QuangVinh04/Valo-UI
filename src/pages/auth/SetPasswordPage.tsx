import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordErrorKey = useMemo(
    () => (newPassword ? getPasswordErrorKey(newPassword) : undefined),
    [newPassword]
  );
  const passwordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;
  const canSubmit = Boolean(token)
    && Boolean(newPassword)
    && !passwordErrorKey
    && passwordsMatch
    && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) return;
    if (getPasswordErrorKey(newPassword)) {
      toast.error(t('auth.passwordStrengthFailed'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwordsDoNotMatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      await setPassword({ token, newPassword, confirmPassword });
      toast.success(t('auth.passwordSetSuccess'));
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, t('auth.setPasswordFailed')));
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
            <h1>{t('auth.setPasswordTitle')}</h1>
            <p className="auth-subtitle">{t('auth.setPasswordSubtitle')}</p>

            {!token ? (
              <div role="alert">
                <p className="auth-field-error">{t('auth.invalidPasswordLink')}</p>
                <p className="auth-switch">
                  <Link to="/login">{t('auth.backToLogin')}</Link>
                </p>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <label htmlFor="token-new-password">{t('auth.newPassword')}</label>
                <input
                  className={passwordErrorKey ? 'field-invalid' : undefined}
                  id="token-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
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

                <label htmlFor="token-confirm-password">{t('auth.confirmPassword')}</label>
                <input
                  className={confirmPassword && !passwordsMatch ? 'field-invalid' : undefined}
                  id="token-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={Boolean(confirmPassword && !passwordsMatch)}
                  required
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="auth-field-error" aria-live="polite">{t('auth.passwordsDoNotMatch')}</p>
                )}

                <button className="auth-submit" type="submit" disabled={!canSubmit}>
                  {isSubmitting
                    ? t('auth.updatingPassword')
                    : t('auth.setPassword')}
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
