declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    AUTH_ORIGIN?: string;
    AUTH_GITHUB_CLIENT_ID?: string;
    AUTH_GITHUB_CLIENT_SECRET?: string;
  }
}
