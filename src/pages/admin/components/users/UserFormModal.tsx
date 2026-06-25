import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, UserRound, X } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import { useToast } from '@/context/ToastContext';
import type { GroupListItemDto } from '@/services/group.service';
import { assignUserGroups, createUser, updateUser, type UserDto } from '@/services/user.service';

type UserFormModalProps = {
  mode: 'add' | 'update';
  user?: UserDto;
  groups: GroupListItemDto[];
  onClose: () => void;
  onSaved: () => void;
};

function UserFormModal({ mode, user, groups, onClose, onSaved }: UserFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const isUpdate = mode === 'update';
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [groupIds, setGroupIds] = useState<string[]>(user?.groups.map((group) => group.id) ?? []);
  const [groupSearch, setGroupSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emptyGroupLabel = t('admin.users.noGroupsSelected');
  const selectedGroups = useMemo(
    () => groups.filter((group) => groupIds.includes(group.id)),
    [groupIds, groups]
  );
  const availableGroups = useMemo(() => {
    const keyword = groupSearch.trim().toLowerCase();
    const selectedGroupIds = new Set(groupIds);

    return groups
      .filter((group) => !selectedGroupIds.has(group.id))
      .filter((group) => {
        if (!keyword) return true;
        return `${group.name} ${group.description ?? ''}`.toLowerCase().includes(keyword);
      })
      .slice(0, 6);
  }, [groupIds, groupSearch, groups]);

  function addGroup(groupId: string) {
    // Thêm nhóm vào người dùng mới và xóa từ khóa tìm kiếm nhóm.
    setGroupIds((current) => current.includes(groupId) ? current : [...current, groupId]);
    setGroupSearch('');
  }

  function removeGroup(groupId: string) {
    // Bỏ nhóm đã chọn khỏi danh sách gán ban đầu.
    setGroupIds((current) => current.filter((id) => id !== groupId));
  }

  async function handleSubmit() {
    // Chuẩn hóa dữ liệu form trước khi tạo mới hoặc cập nhật người dùng.
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
        const createdUser = await createUser({
          fullName: name,
          email: normalizedEmail,
          phoneNumber: normalizedPhoneNumber,
          address: normalizedAddress,
        });

        if (groupIds.length > 0) {
          await assignUserGroups(createdUser.id, groupIds);
        }

        toast.success(t('admin.users.created', { name }));
      }

      onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.users.saveFailed');
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
            {isUpdate ? <UserRound size={21} aria-hidden="true" /> : <UserPlus size={21} aria-hidden="true" />}
            {isUpdate ? t('admin.users.updateUserTitle') : t('admin.users.addNewUser')}
          </h2>
          <IconButton icon={X} label={t('admin.users.closeUserForm')} onClick={onClose} />
        </header>
        <div className="modal-body">
          <label>
            {t('admin.users.fullName')}
            <input value={fullName} placeholder={t('admin.users.enterFullName')} onChange={(event) => setFullName(event.target.value)} />
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
          {!isUpdate && (
            <div>
              <span className="label-text">{t('common.groups')}</span>
              <label className="member-search-field group-search-field">
                <input
                  value={groupSearch}
                  placeholder={t('admin.users.searchGroupByName')}
                  onChange={(event) => setGroupSearch(event.target.value)}
                />
              </label>
              <div className="member-picker-list group-picker-list">
                {availableGroups.map((group) => (
                  <button type="button" key={group.id} onClick={() => addGroup(group.id)}>
                    <strong>{group.name}</strong>
                    <span>{group.description ?? t('common.noDescription')}</span>
                  </button>
                ))}
                {groups.length === 0 ? (
                  <span className="muted">{emptyGroupLabel}</span>
                ) : availableGroups.length === 0 ? (
                  <span className="muted">{t('admin.users.noAvailableGroups')}</span>
                ) : null}
              </div>
              <div className="tag-row">
                {selectedGroups.length > 0 ? selectedGroups.map((group) => (
                  <button className="tag tag-button" type="button" key={group.id} onClick={() => removeGroup(group.id)}>
                    {group.name} ×
                  </button>
                )) : (
                  <span className="muted">{emptyGroupLabel}</span>
                )}
              </div>
            </div>
          )}
        </div>
        <footer className="modal-footer">
          <button className="btn-cancel" type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t('admin.users.saving') : isUpdate ? t('admin.users.updateUserTitle') : t('admin.users.createUser')}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default UserFormModal;
