import { endSession, authFailure } from '../../../lib/auth';
// Log out with POST so a link preview cannot end the session.
export async function POST(request: Request) {
  try {
    return await endSession(request);
  } catch (e) {
    return authFailure(e, request);
  }
}
