import {headers} from 'next/headers';
import {getSessionUser,signInPath,signOutPath} from '../lib/auth';
import Workspace from './workspace';
export const dynamic='force-dynamic';
export default async function Home(){let u=null;try{u=await getSessionUser(await headers());}catch{console.error('Session lookup unavailable');}return <Workspace user={u?{id:u.userId,name:u.displayName}:null} signIn={signInPath('/')} signOut={signOutPath()}/>;}
