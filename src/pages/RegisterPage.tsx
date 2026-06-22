import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Header from '@/layouts/Header';
import Footer from '@/layouts/Footer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/error';
import { register } from '@/services/auth.service';
import '@/styles/pages/home.css';

function RegisterPage() {
  const { authLoading, isAuthenticated } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await register(fullName, email);
      toast.success('Account created. Check your email for the temporary password, then sign in.');
      setFullName('');
      setEmail('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Registration failed'));
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
            <p className="auth-kicker">REQUEST ACCESS</p>
            <h1>Create Account</h1>
            <p className="auth-subtitle">
              Register your workspace identity. A temporary password will be sent to your email.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />

              <label htmlFor="registerEmail">Email Address</label>
              <input
                id="registerEmail"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="auth-switch">
              Already have a temporary password? <Link to="/">Sign in</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default RegisterPage;
