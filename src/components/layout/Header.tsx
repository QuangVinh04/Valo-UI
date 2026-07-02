import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

function Header() {
  const { t } = useTranslation();

  return (
    <header className="auth-header">
      <div className="auth-brand">{t('layout.brand')}</div>
    </header>
  );
}

export default Header;
