declare namespace Cloudflare {
  // Server bindings. Missing login settings still allow public browsing.
  interface Env {
    DB?: D1Database;
    AUTH_ORIGIN?: string;
    AUTH_GITHUB_CLIENT_ID?: string;
    AUTH_GITHUB_CLIENT_SECRET?: string;
  }
}
