import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, UserRound, X } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
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

function UserFormModal({ mode, user, onClose, onSaved }: UserFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const isUpdate = mode === 'update';

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const name = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhoneNumber = phoneNumber.trim();
    const normalizedAddress = address.trim();

    if (!name || (!isUpdate && !normalizedEmail)) {
      toast.error(t('admin.users.nameEmailRequired'));
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
    <div className="modal-backdrop">
      <section className="modal-card user-modal">
        <header className="modal-header">
          <h2 className="modal-title">
            {isUpdate ? (
              <UserRound size={21} aria-hidden="true" />
            ) : (
              <UserPlus size={21} aria-hidden="true" />
            )}

            {isUpdate
              ? t('admin.users.updateUserTitle')
              : t('admin.users.addNewUser')}
          </h2>

          <IconButton
            icon={X}
            label={t('admin.users.closeUserForm')}
            onClick={onClose}
          />
        </header>

        <div className="modal-body">
          <label>
            {t('admin.users.fullName')}
            <input
              value={fullName}
              placeholder={t('admin.users.enterFullName')}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>

          <label>
            {t('auth.emailAddress')}
            <input
              value={email}
              placeholder="name@company.com"
              onChange={(event) => setEmail(event.target.value)}
              readOnly={isUpdate}
            />
          </label>

          <label>
            {t('admin.users.phoneNumber')}
            <input
              value={phoneNumber}
              placeholder="+84 901 234 567"
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
          </label>

          <label>
            {t('admin.users.address')}
            <input
              value={address}
              placeholder={t('admin.users.enterAddress')}
              onChange={(event) => setAddress(event.target.value)}
            />
          </label>
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
              ? t('admin.users.saving')
              : isUpdate
                ? t('admin.users.updateUserTitle')
                : t('admin.users.createUser')}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default UserFormModal;
