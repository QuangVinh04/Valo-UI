import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import { resendOtp, verifyOtp } from '@/services/auth.service';

const RESEND_COOLDOWN_SECONDS = 60;

type OtpLocationState = {
  email?: string;
};

function OtpVerificationPage() {
  const { t } = useTranslation();
  const { authLoading, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as OtpLocationState | null;
  const normalizedEmail = useMemo(
    () => locationState?.email?.trim().toLowerCase() ?? '',
    [locationState?.email]
  );
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const canResend = cooldown <= 0 && Boolean(normalizedEmail) && !isResending;

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsVerifying(true);

    try {
      await verifyOtp({ email: normalizedEmail, otp: otp.trim() });
      toast.success(t('auth.otpVerifySuccess'));
      navigate('/login', { replace: true, state: { email: normalizedEmail } });
    } catch (err) {
      toast.error(getErrorMessage(err, t('auth.otpVerifyFailed')));
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResendOtp() {
    if (!canResend) return;

    setIsResending(true);

    try {
      await resendOtp({ email: normalizedEmail });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(t('auth.otpResendSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err, t('auth.otpResendFailed')));
    } finally {
      setIsResending(false);
    }
  }

  if (authLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  if (!normalizedEmail) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="home-shell">
      <Header />
      <main className="home-main">
        <section className="auth-card-wrap">
          <div className="auth-card">
            <h1>{t('auth.otpTitle')}</h1>
            <p className="auth-subtitle">
              {t('auth.otpSubtitle')}
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="otpCode">{t('auth.otpCode')}</label>
              <input
                id="otpCode"
                className="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t('auth.otpPlaceholder')}
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                minLength={4}
                maxLength={8}
                required
              />

              <button className="auth-submit" type="submit" disabled={isVerifying}>
                {isVerifying ? t('auth.verifyingOtp') : t('auth.verifyAccount')}
              </button>
            </form>

            <div className="otp-resend">
              <button type="button" onClick={handleResendOtp} disabled={!canResend}>
                {isResending ? t('auth.resendingOtp') : t('auth.resendOtp')}
              </button>
              {cooldown > 0 && (
                <span>{t('auth.resendOtpCountdown', { seconds: cooldown })}</span>
              )}
            </div>

            <p className="auth-switch">
              <Link to="/login">{t('auth.backToLogin')}</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default OtpVerificationPage;
