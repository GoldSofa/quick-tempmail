import { respData, respErr } from '@/shared/lib/resp';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';

export async function GET(req: Request) {
    try {
        // get sign user info
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const subscription = await getCurrentSubscription(user.id);

        return respData(subscription);
    } catch (e) {
        console.log('get subscription status failed:', e);
        return respErr('get subscription status failed');
    }
}
