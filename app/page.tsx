import { headers } from 'next/headers';
import { getSessionUser, signInPath, signOutPath } from '../lib/auth';
import Workspace from './workspace';
// Read the current login session on every request.
export const dynamic = 'force-dynamic';
// Pass only the public user details to the browser.
export default async function Home() {
  let u = null;
  // If the session store is unavailable, the page still allows public browsing.
  try {
    u = await getSessionUser(await headers());
  } catch {
    console.error('Session lookup unavailable');
  }
  return (
    <Workspace
      user={u ? { id: u.userId, name: u.displayName } : null}
      signIn={signInPath('/')}
      signOut={signOutPath()}
    />
  );
}
