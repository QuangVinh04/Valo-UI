import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import '@/styles/pages/home.css';

function ChangePasswordPage() {
  const { t } = useTranslation();
  const { authLoading, isAuthenticated, changePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
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
    return <Navigate to="/" replace />;
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
                  placeholder={t('auth.temporaryPasswordPlaceholder')}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
                <span aria-hidden="true"><LockKeyhole size={18} /></span>
              </div>

              <label htmlFor="newPassword">{t('auth.newPassword')}</label>
              <input
                id="newPassword"
                type="password"
                placeholder={t('auth.newPasswordPlaceholder')}
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />

              <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder={t('auth.confirmPasswordPlaceholder')}
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
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
