import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import { changePassword } from '@/services/auth.service';
import '@/styles/pages/home.css';

function ChangePasswordPage() {
  const { authLoading, isAuthenticated } = useAuth();
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
      toast.error(getErrorMessage(err, 'Password update failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        Checking session...
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
            <p className="auth-kicker">PASSWORD RESET</p>
            <h1>Change Password</h1>
            <p className="auth-subtitle">
              Set a new password before entering your workspace.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="currentPassword">Current Password</label>
              <div className="password-field">
                <input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter your temporary password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
                <span aria-hidden="true"><LockKeyhole size={18} /></span>
              </div>

              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                placeholder="Create a new password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />

              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating password...' : 'Update Password'}
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
