import RequirePermission from '@/components/common/RequirePermission';
import { UsersView } from '@/features/admin';

function UsersPage() {
  return (
    <RequirePermission permission="USER_R">
      <UsersView />
    </RequirePermission>
  );
}

export default UsersPage;
