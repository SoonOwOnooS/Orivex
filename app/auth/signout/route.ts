import { endSession, authFailure } from '../../../lib/auth';
export async function POST(request: Request) {
  try { return await endSession(request); } catch (e) { return authFailure(e, request); }
}
