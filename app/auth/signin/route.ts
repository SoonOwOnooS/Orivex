import { beginSignIn, authFailure } from '../../../lib/auth';
// Start GitHub login and send the browser to GitHub.
export async function GET(request: Request) {
  try {
    return await beginSignIn(request);
  } catch (e) {
    return authFailure(e, request);
  }
}
