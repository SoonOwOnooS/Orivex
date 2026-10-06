import { beginSignIn, authFailure } from '../../../lib/auth';
export async function GET(request: Request) {
  try { return await beginSignIn(request); } catch (e) { return authFailure(e, request); }
}
