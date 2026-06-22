import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import { login } from '@/services/auth.service';

function Hero() {
  const { authLoading, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      navigate(user.mustChangePassword ? '/change-password' : '/chat', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Login failed'));
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
        <p className="auth-kicker">SECURE ACCESS</p>
        <h1>Log In</h1>
        <p className="auth-subtitle">
          Welcome back to Agent Hub. Enter your credentials to access your dashboard.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <span aria-hidden="true"><LockKeyhole size={18} /></span>
          </div>

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Continue to Dashboard'}
          </button>
        </form>
        <p className="auth-switch">
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </section>
  );
}

export default Hero;
