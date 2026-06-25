import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '@/context/PreferencesContext';
import { useToast } from '@/context/ToastContext';
import type { UserProfileDto } from '@/services/user.service';
import type { ConfirmAction, SettingsFormModal } from '@/types/settings.types';
import { useSettingsProfile } from './useSettingsProfile';

const fallbackPhoneNumber = '+1 (555) 000-0000';
const fallbackAddress = '123 Digital Way, Silicon Valley, CA';

export function useSettings() {
  const preferences = usePreferences();
  const toast = useToast();
  const navigate = useNavigate();
  const [modal, setModal] = useState<SettingsFormModal | null>(null);
  const [showStorage, setShowStorage] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const { profile, error: profileError, updateProfileFromUser } = useSettingsProfile();
  const phoneNumber = profile.phoneNumber || fallbackPhoneNumber;
  const address = profile.address || fallbackAddress;

  useEffect(() => {
    if (profileError) {
      toast.error(profileError);
    }
  }, [profileError, toast]);

  function openModal(nextModal: SettingsFormModal) {
    // Mở modal chỉnh sửa đúng loại thông tin người dùng chọn.
    setModal(nextModal);
  }

  function closeModal() {
    // Đóng modal chỉnh sửa thông tin cá nhân hoặc mật khẩu.
    setModal(null);
  }

  function openStorage() {
    // Mở màn hình quản lý các tệp đã tải lên.
    setShowStorage(true);
  }

  function closeStorage() {
    // Đóng màn hình quản lý tệp.
    setShowStorage(false);
  }

  function openConfirmAction(action: ConfirmAction) {
    // Mở modal xác nhận cho các thao tác nhạy cảm như xóa lịch sử hoặc đăng xuất.
    setConfirmAction(action);
  }

  function closeConfirmAction() {
    // Hủy thao tác xác nhận hiện tại.
    setConfirmAction(null);
  }

  function handleProfileSaved(user: UserProfileDto) {
    // Cập nhật lại hồ sơ trên UI sau khi lưu thành công từ modal.
    updateProfileFromUser(user);
    closeModal();
  }

  function handleSignedOut() {
    // Đưa người dùng về màn hình đăng nhập sau khi phiên kết thúc.
    navigate('/');
  }

  return {
    theme: preferences.theme,
    language: preferences.language,
    setTheme: preferences.setTheme,
    setLanguage: preferences.setLanguage,
    modal,
    showStorage,
    confirmAction,
    phoneNumber,
    address,
    openModal,
    closeModal,
    openStorage,
    closeStorage,
    openConfirmAction,
    closeConfirmAction,
    handleProfileSaved,
    handleSignedOut,
  };
}
