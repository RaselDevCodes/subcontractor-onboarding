declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SIGNWELL_API_KEY?: string;
    SIGNWELL_WEBHOOK_ID?: string;
    SIGNWELL_TEMPLATE_CATALOG?: string;
    SIGNWELL_TEST_MODE?: string;
    SIGNWELL_REQUESTER_EMAIL?: string;
    TNB_SIGNER_EMAIL?: string;
    TNB_SIGNER_NAME?: string;
    GOOGLE_OAUTH_CLIENT_ID?: string;
    GOOGLE_OAUTH_CLIENT_SECRET?: string;
    GOOGLE_OAUTH_REFRESH_TOKEN?: string;
    TNB_EMAIL_FROM?: string;
    TNB_EMAIL_TO?: string;
    PORTAL_PUBLIC_URL?: string;
  }
}
