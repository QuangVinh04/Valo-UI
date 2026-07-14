import { useTranslation } from 'react-i18next';

function Header() {
  const { t } = useTranslation();

  return (
    <header className="auth-header">
      <div className="auth-brand">{t('layout.brand')}</div>
    </header>
  );
}

export default Header;
