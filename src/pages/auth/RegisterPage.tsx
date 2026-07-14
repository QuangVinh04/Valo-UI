import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';

type PasswordCheck = {
  labelKey: string;
  errorKey: string;
  isValid: boolean;
};

type RegisterTouchedFields = {
  fullName: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getRegistrationPasswordChecks(password: string): PasswordCheck[] {
  return [
    {
      labelKey: 'auth.passwordRuleLength',
      errorKey: 'auth.passwordErrorLength',
      isValid: password.length >= 8,
    },
    {
      labelKey: 'auth.passwordRuleUppercase',
      errorKey: 'auth.passwordErrorUppercase',
      isValid: /[A-Z]/.test(password),
    },
    {
      labelKey: 'auth.passwordRuleLowercase',
      errorKey: 'auth.passwordErrorLowercase',
      isValid: /[a-z]/.test(password),
    },
    {
      labelKey: 'auth.passwordRuleNumber',
      errorKey: 'auth.passwordErrorNumber',
      isValid: /\d/.test(password),
    },
    {
      labelKey: 'auth.passwordRuleSymbol',
      errorKey: 'auth.passwordErrorSymbol',
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
  const [touchedFields, setTouchedFields] = useState<RegisterTouchedFields>({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const passwordChecks = useMemo(() => getRegistrationPasswordChecks(password), [password]);
  const isPasswordStrong = passwordChecks.every((check) => check.isValid);
  const fullNameValidationError = touchedFields.fullName && !fullName.trim()
    ? t('auth.fullNameRequired')
    : '';
  const passwordValidationError = touchedFields.password
    ? !password
      ? 'auth.passwordRequired'
      : passwordChecks.find((check) => !check.isValid)?.errorKey
    : undefined;
  const emailValidationError = touchedFields.email
    ? !email.trim()
      ? t('auth.emailRequired')
      : !isValidEmail(email)
        ? t('auth.emailFormatInvalid')
        : ''
    : '';
  const confirmPasswordValidationError = touchedFields.confirmPassword
    ? !confirmPassword
      ? t('auth.confirmPasswordRequired')
      : password !== confirmPassword
        ? t('auth.passwordsDoNotMatch')
        : ''
    : '';

  // Create the account, then continue into OTP verification.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setTouchedFields({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (
      !fullName.trim()
      || !email.trim()
      || !isValidEmail(email)
      || !password
      || !confirmPassword
    ) {
      return;
    }

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
      navigate('/verify-otp', {
        replace: true,
        state: { email: normalizedEmail, password },
      });
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
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="fullName">
                {t('auth.fullName')}<span className="auth-required" aria-hidden="true">*</span>
              </label>
              <input
                className={fullNameValidationError ? 'field-invalid' : undefined}
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder={t('auth.fullNamePlaceholder')}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                onBlur={() => setTouchedFields((current) => ({ ...current, fullName: true }))}
                aria-invalid={Boolean(fullNameValidationError)}
                aria-describedby={fullNameValidationError ? 'register-full-name-error' : undefined}
                required
              />
              {fullNameValidationError && (
                <p className="auth-field-error" id="register-full-name-error" aria-live="polite">
                  {fullNameValidationError}
                </p>
              )}

              <label htmlFor="registerEmail">
                {t('auth.emailAddress')}<span className="auth-required" aria-hidden="true">*</span>
              </label>
              <input
                className={emailValidationError ? 'field-invalid' : undefined}
                id="registerEmail"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouchedFields((current) => ({ ...current, email: true }))}
                aria-invalid={Boolean(emailValidationError)}
                aria-describedby={emailValidationError ? 'register-email-error' : undefined}
                required
              />
              {emailValidationError && (
                <p className="auth-field-error" id="register-email-error" aria-live="polite">
                  {emailValidationError}
                </p>
              )}
              <label htmlFor="registerPassword">
                {t('auth.password')}<span className="auth-required" aria-hidden="true">*</span>
              </label>
              <div className="password-field">
                <input
                  className={passwordValidationError ? 'field-invalid' : undefined}
                  id="registerPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('auth.newPasswordPlaceholder')}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setTouchedFields((current) => ({ ...current, password: true }))}
                  aria-invalid={Boolean(passwordValidationError)}
                  aria-describedby={passwordValidationError ? 'register-password-error' : 'register-password-hint'}
                  required
                />
                <span aria-hidden="true"><LockKeyhole size={18} /></span>
              </div>

              {passwordValidationError ? (
                <p className="auth-field-error" id="register-password-error" aria-live="polite">
                  {t(passwordValidationError)}
                </p>
              ) : (
                <div className="password-rules" id="register-password-hint">
                  <p>{t('auth.passwordRequirements')}</p>
                </div>
              )}

              <label htmlFor="registerConfirmPassword">
                {t('auth.confirmPassword')}<span className="auth-required" aria-hidden="true">*</span>
              </label>
              <input
                className={confirmPasswordValidationError ? 'field-invalid' : undefined}
                id="registerConfirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder={t('auth.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onBlur={() => setTouchedFields((current) => ({ ...current, confirmPassword: true }))}
                required
                aria-invalid={Boolean(confirmPasswordValidationError)}
                aria-describedby={confirmPasswordValidationError ? 'register-confirm-password-error' : undefined}
              />
              {confirmPasswordValidationError && (
                <p className="auth-field-error" id="register-confirm-password-error" aria-live="polite">
                  {confirmPasswordValidationError}
                </p>
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
