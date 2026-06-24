import RequirePermission from '@/components/common/RequirePermission';
import GroupsView from './components/GroupsView';

function GroupsPage() {
  return (
    <RequirePermission permission="GROUP_R">
      <GroupsView />
    </RequirePermission>
  );
}

export default GroupsPage;
