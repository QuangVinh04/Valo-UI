import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="auth-header">
      <div className="auth-brand">Agent Hub</div>
      <Link to="/" className="auth-back-link" aria-label="Back to site">
        ← Back to site
      </Link>
    </header>
  );
}

export default Header;
