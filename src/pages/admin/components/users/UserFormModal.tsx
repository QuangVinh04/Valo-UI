import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, UserRound, X } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import Modal from '@/components/common/Modal';
import { useToast } from '@/context/ToastContext';
import { createUser, updateUser } from '@/services/user.service';
import type { GroupListItemDto } from '@/types/group.type';
import type { UserDto } from '@/types/user.type';

type UserFormModalProps = {
  mode: 'add' | 'update';
  user?: UserDto;
  groups?: GroupListItemDto[];
  onClose: () => void;
  onSaved: () => void;
};

type RequiredField = 'fullName' | 'email';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function UserFormModal({ mode, user, onClose, onSaved }: UserFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const isUpdate = mode === 'update';

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [touchedFields, setTouchedFields] = useState<Record<RequiredField, boolean>>({
    fullName: false,
    email: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fullNameError = touchedFields.fullName && !fullName.trim()
    ? t('admin.users.fullNameRequired')
    : '';
  const emailError = !isUpdate
    ? touchedFields.email && !email.trim()
      ? t('admin.users.emailRequired')
      : email.trim() && !isValidEmail(email)
        ? t('auth.emailFormatInvalid')
        : ''
    : '';

  function markFieldTouched(field: RequiredField) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit() {
    const name = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhoneNumber = phoneNumber.trim();
    const normalizedAddress = address.trim();

    if (!name || (!isUpdate && !normalizedEmail)) {
      setTouchedFields({
        fullName: true,
        email: true,
      });

      toast.error(t('admin.users.nameEmailRequired'));
      return;
    }

    if (!isUpdate && !isValidEmail(normalizedEmail)) {
      setTouchedFields((current) => ({ ...current, email: true }));
      toast.error(t('auth.emailFormatInvalid'));
      return;
    }

    setIsSubmitting(true);

    try {
      if (isUpdate && user) {
        await updateUser(user.id, {
          fullName: name,
          phoneNumber: normalizedPhoneNumber,
          address: normalizedAddress,
        });

        toast.success(t('admin.users.updated', { name }));
      } else {
        await createUser({
          fullName: name,
          email: normalizedEmail,
          phoneNumber: normalizedPhoneNumber,
          address: normalizedAddress,
        });

        toast.success(t('admin.users.created', { name }));
      }

      onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('admin.users.saveFailed');

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      className="modal-card user-modal"
      labelledBy="user-form-modal-title"
      isDismissDisabled={isSubmitting}
      onClose={onClose}
    >
        <header className="modal-header">
          <h2 className="modal-title" id="user-form-modal-title">
            {isUpdate ? (
              <UserRound size={21} aria-hidden="true" />
            ) : (
              <UserPlus size={21} aria-hidden="true" />
            )}

            {isUpdate
              ? t('admin.users.updateUserTitle')
              : t('admin.users.inviteNewUserTitle')}
          </h2>

          <IconButton
            icon={X}
            label={t('admin.users.closeUserForm')}
            onClick={onClose}
          />
        </header>

        <div className="modal-body">
          <label>
            <span className="form-label-text">
              {t('admin.users.fullName')}
              <span className="required-mark" aria-hidden="true">*</span>
            </span>
            <input
              className={fullNameError ? 'field-invalid' : undefined}
              value={fullName}
              placeholder={t('admin.users.enterFullName')}
              onChange={(event) => setFullName(event.target.value)}
              onBlur={() => markFieldTouched('fullName')}
              aria-invalid={Boolean(fullNameError)}
              aria-describedby="user-full-name-error"
            />
            <span className="field-error" id="user-full-name-error" aria-live="polite">
              {fullNameError}
            </span>
          </label>

          <label>
            <span className="form-label-text">
              {t('auth.emailAddress')}
              {!isUpdate && <span className="required-mark" aria-hidden="true">*</span>}
            </span>
            <input
              className={[
                isUpdate ? 'locked-input' : undefined,
                emailError ? 'field-invalid' : undefined,
              ].filter(Boolean).join(' ') || undefined}
              type="email"
              value={email}
              placeholder="name@company.com"
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => markFieldTouched('email')}
              readOnly={isUpdate}
              aria-readonly={isUpdate}
              aria-invalid={Boolean(emailError)}
              aria-describedby="user-email-error"
            />
            <span className="field-error" id="user-email-error" aria-live="polite">
              {emailError}
            </span>
          </label>
          <label>
            <span className="form-label-text">{t('admin.users.phoneNumber')}</span>
            <input
              value={phoneNumber}
              placeholder="+84 901 234 567"
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
            <span className="field-error" aria-hidden="true" />
          </label>

          <label>
            <span className="form-label-text">{t('admin.users.address')}</span>
            <input
              value={address}
              placeholder={t('admin.users.enterAddress')}
              onChange={(event) => setAddress(event.target.value)}
            />
            <span className="field-error" aria-hidden="true" />
          </label>

          {!isUpdate && (
            <p className="user-invite-notice">{t('admin.users.invitationNotice')}</p>
          )}
        </div>

        <footer className="modal-footer">
          <button className="btn-cancel" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>

          <button
            className="btn-primary"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t(isUpdate ? 'admin.users.saving' : 'admin.users.sendingInvitation')
              : isUpdate
                ? t('common.update')
                : t('admin.users.createAndInvite')}
          </button>
        </footer>
    </Modal>
  );
}

export default UserFormModal;
