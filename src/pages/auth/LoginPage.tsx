import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';

type LoginLocationState = {
  email?: string;
};

type LoginTouchedFields = {
  username: boolean;
  password: boolean;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function LoginPage() {
  const { t } = useTranslation();
  const { authLoading, isAuthenticated, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const [username, setUsername] = useState(locationState?.email ?? '');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<LoginTouchedFields>({
    username: false,
    password: false,
  });
  const emailValidationError = touchedFields.username
    ? !username.trim()
      ? t('auth.usernameRequired')
      : !isValidEmail(username)
        ? t('auth.emailFormatInvalid')
        : ''
    : '';
  const passwordValidationError = touchedFields.password && !password
    ? t('auth.passwordRequired')
    : '';

  // Route inactive accounts through email verification before workspace access.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setTouchedFields({ username: true, password: true });
    if (!username.trim() || !isValidEmail(username) || !password) {
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await login(username, password);
      navigate(
        user.active ? '/chat' : '/verify-otp',
        {
          replace: true,
          state: user.active ? undefined : {
            email: user.email ?? username,
            password,
          },
        }
      );
    } catch (err) {
      toast.error(getErrorMessage(err, t('auth.loginFailed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading && !isSubmitting) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        {t('layout.checkingSession')}
      </div>
    );
  }

  if (isAuthenticated && !isSubmitting) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="home-shell">
      <Header />
      <main className="home-main login-main" >
        <section className="auth-card-wrap">
          <div className="auth-card">
            <h1>{t('auth.loginTitle')}</h1>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="username">
                {t('auth.username')}<span className="auth-required" aria-hidden="true">*</span>
              </label>
              <input
                className={emailValidationError ? 'field-invalid' : undefined}
                id="username"
                type="email"
                autoComplete="username"
                placeholder="name@company.com"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                onBlur={() => setTouchedFields((current) => ({ ...current, username: true }))}
                aria-invalid={Boolean(emailValidationError)}
                aria-describedby={emailValidationError ? 'username-error' : undefined}
                required
              />
              {emailValidationError && (
                <p className="auth-field-error" id="username-error" aria-live="polite">
                  {emailValidationError}
                </p>
              )}

              <label htmlFor="password">
                {t('auth.password')}<span className="auth-required" aria-hidden="true">*</span>
              </label>
              <div className="password-field">
                <input
                  className={passwordValidationError ? 'field-invalid' : undefined}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setTouchedFields((current) => ({ ...current, password: true }))}
                  aria-invalid={Boolean(passwordValidationError)}
                  aria-describedby={passwordValidationError ? 'password-error' : undefined}
                  required
                />
                <span aria-hidden="true"><LockKeyhole size={18} /></span>
              </div>
              {passwordValidationError && (
                <p className="auth-field-error" id="password-error" aria-live="polite">
                  {passwordValidationError}
                </p>
              )}

              <Link className="auth-forgot-link" to="/forgot-password">
                {t('auth.forgotPassword')}
              </Link>

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('auth.signingIn') : t('auth.login')}
              </button>
            </form>
            <p className="auth-switch">
              {t('auth.needAccount')} <Link to="/register">{t('auth.createOne')}</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default LoginPage;
