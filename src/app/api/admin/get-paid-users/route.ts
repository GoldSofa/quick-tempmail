import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import {
    getSubscriptions,
    SubscriptionStatus,
} from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

export async function GET(req: Request) {
    try {
        // get sign user info
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        // check if user is admin
        const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
        if (!isAdmin) {
            return respErr('permission denied');
        }

        // get active subscriptions
        const subscriptions = await getSubscriptions({
            status: SubscriptionStatus.ACTIVE,
            getUser: true,
        });

        // extract users and remove duplicates
        const usersMap = new Map();
        subscriptions.forEach((sub) => {
            if (sub.user) {
                usersMap.set(sub.user.id, sub.user);
            }
        });

        const users = Array.from(usersMap.values());

        return respData(users);
    } catch (e) {
        console.log('get paid users failed:', e);
        return respErr('get paid users failed');
    }
}
