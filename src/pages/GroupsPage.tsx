import RequirePermission from '@/components/common/RequirePermission';
import { GroupsView } from '@/features/admin';

function GroupsPage() {
  return (
    <RequirePermission permission="GROUP_R">
      <GroupsView />
    </RequirePermission>
  );
}

export default GroupsPage;
