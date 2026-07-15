import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import { requestPasswordReset } from '@/services/auth.service';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [isTouched, setIsTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const emailError = isTouched
    ? !email.trim()
      ? t('auth.emailRequired')
      : !isValidEmail(email)
        ? t('auth.emailFormatInvalid')
        : ''
    : '';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsTouched(true);

    if (!email.trim() || !isValidEmail(email)) return;

    setIsSubmitting(true);
    try {
      await requestPasswordReset({ email: email.trim().toLowerCase() });
      setIsSent(true);
    } catch (error) {
      toast.error(getErrorMessage(error, t('auth.forgotPasswordFailed')));
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
            <h1>{t('auth.forgotPasswordTitle')}</h1>
            <p className="auth-subtitle">
              {isSent ? t('auth.resetLinkSent') : t('auth.forgotPasswordSubtitle')}
            </p>

            {!isSent && (
              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <label htmlFor="forgot-password-email">{t('auth.emailAddress')}</label>
                <input
                  className={emailError ? 'field-invalid' : undefined}
                  id="forgot-password-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setIsTouched(true)}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? 'forgot-password-email-error' : undefined}
                  required
                />
                {emailError && (
                  <p className="auth-field-error" id="forgot-password-email-error" aria-live="polite">
                    {emailError}
                  </p>
                )}
                <button className="auth-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
                </button>
              </form>
            )}

            <p className="auth-switch"><Link to="/login">{t('auth.backToLogin')}</Link></p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default ForgotPasswordPage;
