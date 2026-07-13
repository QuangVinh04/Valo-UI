import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import '@/styles/pages/home.css';

type LoginLocationState = {
  email?: string;
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
  const emailValidationError = username && !isValidEmail(username)
    ? t('auth.emailFormatInvalid')
    : '';

  // Route inactive accounts through email verification before workspace access.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const user = await login(username, password);
      navigate(
        user.active ? '/chat' : '/verify-otp',
        {
          replace: true,
          state: user.active ? undefined : { email: user.email ?? username },
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
      <main className="home-main">
        <section className="auth-card-wrap">
          <div className="auth-card">
            <h1>{t('auth.loginTitle')}</h1>
            <p className="auth-subtitle">
              {t('auth.loginSubtitle')}
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="username">{t('auth.username')}</label>
              <input
                className={emailValidationError ? 'field-invalid' : undefined}
                id="username"
                type="email"
                autoComplete="username"
                placeholder="name@company.com"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={Boolean(emailValidationError)}
                aria-describedby={emailValidationError ? 'username-error' : undefined}
                required
              />
              {emailValidationError && (
                <p className="auth-field-error" id="username-error" aria-live="polite">
                  {emailValidationError}
                </p>
              )}

              <label htmlFor="password">{t('auth.password')}</label>
              <div className="password-field">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <span aria-hidden="true"><LockKeyhole size={18} /></span>
              </div>

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
