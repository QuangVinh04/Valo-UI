import RequirePermission from '@/components/common/RequirePermission';
import { permissionPolicy } from '@/constants/permission-policies';
import GroupsView from './components/GroupsView';

function GroupsPage() {
  return (
    <RequirePermission permission={permissionPolicy.pages.groups}>
      <GroupsView />
    </RequirePermission>
  );
}

export default GroupsPage;
