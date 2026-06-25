import { useTranslation } from 'react-i18next';

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="auth-footer">
      <small>{t('auth.encrypted')}</small>
      <small>{t('auth.certified')}</small>
    </footer>
  );
}

export default Footer;
