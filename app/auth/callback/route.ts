import { completeSignIn, authFailure } from '../../../lib/auth';
export async function GET(request: Request) {
  try { return await completeSignIn(request); } catch (e) { return authFailure(e, request); }
}
