import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';

function Hero() {
  const { t } = useTranslation();
  const { authLoading, isAuthenticated, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Xử lý đăng nhập và điều hướng theo trạng thái bắt buộc đổi mật khẩu.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const user = await login(username, password);
      navigate(user.mustChangePassword ? '/change-password' : '/chat', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, t('auth.loginFailed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading && !isSubmitting) {
    return null;
  }

  if (isAuthenticated && !isSubmitting) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <section className="auth-card-wrap">
      <div className="auth-card">
        <p className="auth-kicker">{t('auth.secureAccess')}</p>
        <h1>{t('auth.loginTitle')}</h1>
        <p className="auth-subtitle">
          {t('auth.loginSubtitle')}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="username">{t('auth.username')}</label>
          <input
            id="username"
            type="email"
            autoComplete="username"
            placeholder="name@company.com"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />

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
            {isSubmitting ? t('auth.signingIn') : t('auth.continueToDashboard')}
          </button>
        </form>
        <p className="auth-switch">
          {t('auth.needAccount')} <Link to="/register">{t('auth.createOne')}</Link>
        </p>
      </div>
    </section>
  );
}

export default Hero;
