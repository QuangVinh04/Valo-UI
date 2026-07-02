import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import '@/styles/pages/home.css';

function RegisterPage() {
  const { t } = useTranslation();
  const { authLoading, isAuthenticated, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gửi yêu cầu tạo tài khoản và xóa form sau khi backend chấp nhận.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await register(fullName, email);
      toast.success(t('auth.registerSuccess'));
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, t('auth.registrationFailed')));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="home-shell">
      <Header />
      <main className="home-main">
        <section className="auth-card-wrap">
          <div className="auth-card">
            <h1>{t('auth.createAccount')}</h1>
            <p className="auth-subtitle">
              {t('auth.registerSubtitle')}
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="fullName">{t('auth.fullName')}</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder={t('auth.fullNamePlaceholder')}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />

              <label htmlFor="registerEmail">{t('auth.emailAddress')}</label>
              <input
                id="registerEmail"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
              </button>
            </form>

            <p className="auth-switch">
              {t('auth.alreadyHaveTemporaryPassword')} <Link to="/login">{t('auth.signIn')}</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default RegisterPage;
