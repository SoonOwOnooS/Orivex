declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    AUTH_ORIGIN?: string;
    AUTH_GITHUB_CLIENT_ID?: string;
    AUTH_GITHUB_CLIENT_SECRET?: string;
  }
}
