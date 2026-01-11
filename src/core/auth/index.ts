import { betterAuth, BetterAuthOptions } from 'better-auth';

import { getAllConfigs } from '@/shared/models/config';

import { getAuthOptions } from './config';

let authInstance: any = null;

// get auth instance in server side
export async function getAuth() {
  if (authInstance) {
    return authInstance;
  }

  // get configs from db and env
  const configs = await getAllConfigs();

  const authOptions = await getAuthOptions(configs);

  authInstance = betterAuth(authOptions as BetterAuthOptions);
  return authInstance;
}
