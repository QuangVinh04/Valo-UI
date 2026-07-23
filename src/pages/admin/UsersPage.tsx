import RequirePermission from '@/components/common/RequirePermission';
import { permissionPolicy } from '@/constants/permission-policies';
import UsersView from './components/UsersView';

function UsersPage() {
  return (
    <RequirePermission permission={permissionPolicy.pages.users}>
      <UsersView />
    </RequirePermission>
  );
}

export default UsersPage;
