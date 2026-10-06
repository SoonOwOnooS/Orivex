import { completeSignIn, authFailure } from '../../../lib/auth';
// Finish GitHub login and create an Orivex session.
export async function GET(request: Request) {
  try {
    return await completeSignIn(request);
  } catch (e) {
    return authFailure(e, request);
  }
}
