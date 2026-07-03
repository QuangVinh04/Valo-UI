import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import '@/styles/pages/home.css';

type PasswordCheck = {
  labelKey: string;
  isValid: boolean;
};

function getRegistrationPasswordChecks(password: string): PasswordCheck[] {
  return [
    {
      labelKey: 'auth.passwordRuleLength',
      isValid: password.length >= 8,
    },
    {
      labelKey: 'auth.passwordRuleUppercase',
      isValid: /[A-Z]/.test(password),
    },
    {
      labelKey: 'auth.passwordRuleLowercase',
      isValid: /[a-z]/.test(password),
    },
    {
      labelKey: 'auth.passwordRuleNumber',
      isValid: /\d/.test(password),
    },
    {
      labelKey: 'auth.passwordRuleSymbol',
      isValid: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

function RegisterPage() {
  const { t } = useTranslation();
  const { authLoading, isAuthenticated, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordChecks = useMemo(() => getRegistrationPasswordChecks(password), [password]);
  const isPasswordStrong = passwordChecks.every((check) => check.isValid);
  const doPasswordsMatch = !confirmPassword || password === confirmPassword;

  // Create the account, then continue into OTP verification.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isPasswordStrong) {
      toast.error(t('auth.passwordStrengthFailed'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('auth.passwordsDoNotMatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await register(fullName.trim(), normalizedEmail, password, confirmPassword);
      toast.success(t('auth.registerSuccess'));
      navigate('/verify-otp', { replace: true, state: { email: normalizedEmail } });
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

              <label htmlFor="registerPassword">{t('auth.password')}</label>
              <div className="password-field">
                <input
                  id="registerPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('auth.newPasswordPlaceholder')}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <span aria-hidden="true"><LockKeyhole size={18} /></span>
              </div>

              <div className="password-rules" aria-live="polite">
                <p>{t('auth.passwordRequirements')}</p>
                <ul>
                  {passwordChecks.map((check) => (
                    <li className={check.isValid ? 'is-valid' : undefined} key={check.labelKey}>
                      {t(check.labelKey)}
                    </li>
                  ))}
                </ul>
              </div>

              <label htmlFor="registerConfirmPassword">{t('auth.confirmPassword')}</label>
              <input
                id="registerConfirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder={t('auth.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                aria-invalid={!doPasswordsMatch}
              />
              {!doPasswordsMatch && (
                <p className="auth-field-error">{t('auth.passwordsDoNotMatch')}</p>
              )}

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
              </button>
            </form>

            <p className="auth-switch">
              {t('auth.alreadyHaveAccount')} <Link to="/login">{t('auth.signIn')}</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default RegisterPage;
