import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

function Header() {
  const { t } = useTranslation();

  return (
    <header className="auth-header">
      <div className="auth-brand">{t('layout.brand')}</div>
      <Link to="/" className="auth-back-link" aria-label={t('auth.backToSite')}>
        ← {t('auth.backToSite')}
      </Link>
    </header>
  );
}

export default Header;
