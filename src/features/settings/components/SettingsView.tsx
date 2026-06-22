import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HardDrive, Languages, LogOut, MapPin, Moon, Palette, Phone, ShieldCheck, Sun, Trash2, User, UserX } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { usePreferences } from '@/context/PreferencesContext';
import type { UserProfileDto } from '@/services/user.service';
import { useSettingsProfile } from '../hooks/useSettingsProfile';
import type { ConfirmAction, SettingsFormModal } from '../types';
import ConfirmActionModal from './ConfirmActionModal';
import SettingRow from './SettingRow';
import SettingsFormModalComponent from './SettingsFormModal';
import StorageModal from './StorageModal';

const fallbackPhoneNumber = '+1 (555) 000-0000';
const fallbackAddress = '123 Digital Way, Silicon Valley, CA';

function SettingsView() {
  const { theme, language, setTheme, setLanguage } = usePreferences();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [modal, setModal] = useState<SettingsFormModal | null>(null);
  const [showStorage, setShowStorage] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const { profile, error: profileError, updateProfileFromUser } = useSettingsProfile();
  const phoneNumber = profile.phoneNumber || fallbackPhoneNumber;
  const address = profile.address || fallbackAddress;

  const handleProfileSaved = (user: UserProfileDto) => {
    updateProfileFromUser(user);
    setModal(null);
  };

  useEffect(() => {
    if (profileError) {
      toast.error(profileError);
    }
  }, [profileError, toast]);

  return (
    <div className="settings-page">
      <section>
        <h1 className="section-title"><span><User size={24} aria-hidden="true" /></span> {t('settings.personalInfo')}</h1>
        <SettingRow
          icon={Phone}
          title={t('settings.phoneNumber')}
          description={phoneNumber}
          buttonLabel={t('settings.update')}
          buttonClassName="btn-blue"
          onClick={() => setModal('phone')}
        />
        <SettingRow
          icon={MapPin}
          title={t('settings.address')}
          description={address}
          buttonLabel={t('settings.update')}
          buttonClassName="btn-blue"
          onClick={() => setModal('address')}
        />
      </section>

      <section>
        <h2 className="section-title"><span><Palette size={24} aria-hidden="true" /></span> {t('settings.personalization')}</h2>
        <div className="settings-grid">
          <div className="panel-dark settings-card">
            <p className="label">{t('settings.visualStyle')}</p>
            <h3>{t('settings.interfaceTheme')}</h3>
            <p>{t('settings.themeDescription')}</p>
            <div className="theme-choice">
              <button
                type="button"
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon size={18} aria-hidden="true" />
                {t('settings.dark')}
              </button>
              <button
                type="button"
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun size={18} aria-hidden="true" />
                {t('settings.light')}
              </button>
            </div>
          </div>
          <div className="panel-dark settings-card">
            <p className="label"><Languages size={14} aria-hidden="true" /> {t('settings.global')}</p>
            <h3>{t('settings.language')}</h3>
            <p>{t('settings.languageDescription')}</p>
            <select
              className="select-mock"
              value={language}
              onChange={(event) => setLanguage(event.target.value as 'vi' | 'en')}
            >
              <option value="vi">{t('settings.vietnamese')}</option>
              <option value="en">{t('settings.english')}</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title"><span><HardDrive size={24} aria-hidden="true" /></span> {t('settings.storage')}</h2>
        <SettingRow
          icon={HardDrive}
          title={t('settings.uploadedFiles')}
          description={t('settings.storageDescription')}
          buttonLabel={t('settings.manage')}
          buttonClassName="btn-blue"
          onClick={() => setShowStorage(true)}
        />
      </section>

      <section>
        <h2 className="section-title"><span><ShieldCheck size={24} aria-hidden="true" /></span> {t('settings.accountSecurity')}</h2>
        <SettingRow
          icon={ShieldCheck}
          title={t('settings.passwordSecurity')}
          description={t('settings.passwordDescription')}
          buttonLabel={t('settings.update')}
          buttonClassName="btn-blue"
          onClick={() => setModal('password')}
        />
        <SettingRow
          icon={Trash2}
          title={t('settings.clearChatHistory')}
          description={t('settings.clearChatDescription')}
          buttonLabel={t('settings.clear')}
          buttonClassName="btn-outline-danger"
          danger
          onClick={() => setConfirmAction('clearChat')}
        />
        <SettingRow
          icon={UserX}
          title={t('settings.deleteAccount')}
          description={t('settings.deleteAccountDescription')}
          buttonLabel={t('settings.delete')}
          buttonClassName="btn-solid-danger"
          danger
          onClick={() => setConfirmAction('deleteAccount')}
        />
        <SettingRow
          icon={LogOut}
          title={t('settings.signOut')}
          description={t('settings.signOutDescription')}
          buttonLabel={t('settings.signOut')}
          buttonClassName="btn-muted"
          onClick={() => setConfirmAction('signOut')}
        />
      </section>

      {modal && (
        <SettingsFormModalComponent
          mode={modal}
          phoneNumber={phoneNumber}
          address={address}
          onClose={() => setModal(null)}
          onProfileSaved={handleProfileSaved}
        />
      )}
      {showStorage && (
        <StorageModal onClose={() => setShowStorage(false)} />
      )}
      {confirmAction && (
        <ConfirmActionModal
          action={confirmAction}
          onClose={() => setConfirmAction(null)}
          onSignedOut={() => navigate('/')}
        />
      )}
    </div>
  );
}

export default SettingsView;
