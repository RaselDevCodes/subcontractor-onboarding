import { env } from "cloudflare:workers";

type D1 = import("@cloudflare/workers-types").D1Database;
type OutboxRow = { id: string; company_id: string; recipient: string; subject: string; body: string; status: string; attempts: number };
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sendGmail(to: string, subject: string, text: string) {
  const from = env.TNB_EMAIL_FROM || "clients@tnbbusinesssolutionsllc.com";
  if (![to, from].every((address) => EMAIL.test(address))) return { sent: false, error: "Invalid configured email address." };
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    return { sent: false, error: "Google Workspace email authorization is not configured." };
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.GOOGLE_OAUTH_CLIENT_ID, client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET, refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN, grant_type: "refresh_token" }),
  });
  if (!tokenResponse.ok) return { sent: false, error: `Google token service returned HTTP ${tokenResponse.status}.` };
  const tokenData = await tokenResponse.json() as { access_token?: string };
  if (!tokenData.access_token) return { sent: false, error: "Google did not return a mail access token." };

  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const raw = [`From: TNB Business Solutions <${from}>`, `To: ${to}`, `Subject: ${encodedSubject}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "", text].join("\r\n");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST", headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: base64Url(new TextEncoder().encode(raw)) }),
  });
  if (!response.ok) return { sent: false, error: `Gmail API returned HTTP ${response.status}.` };
  return { sent: true as const, error: "" };
}

export async function queueEmail(db: D1, companyId: string, recipient: string, subject: string, body: string) {
  if (!EMAIL.test(recipient)) return null;
  const id = crypto.randomUUID(), now = new Date().toISOString();
  await db.prepare("INSERT INTO notification_outbox(id,company_id,recipient,subject,body,status,attempts,last_error,created_at) VALUES(?,?,?,?,?,'queued',0,'',?)")
    .bind(id, companyId, recipient.toLowerCase(), subject.slice(0, 180), body.slice(0, 3000), now).run();
  const result = await sendGmail(recipient.toLowerCase(), subject.slice(0, 180), body.slice(0, 3000)).catch(() => ({ sent: false, error: "Email delivery failed; retry from the TNB notification queue." }));
  await db.prepare("UPDATE notification_outbox SET status=?,attempts=attempts+?,last_error=?,sent_at=? WHERE id=?")
    .bind(result.sent ? "sent" : (result.error.includes("not configured") ? "queued" : "failed"), result.error.includes("not configured") ? 0 : 1, result.error, result.sent ? new Date().toISOString() : null, id).run();
  return { id, status: result.sent ? "sent" : (result.error.includes("not configured") ? "queued" : "failed") };
}

export async function notifyCompanyAndTnb(db: D1, companyId: string, subject: string, body: string) {
  const contacts = await db.prepare("SELECT DISTINCT lower(email) AS email FROM memberships WHERE company_id=? AND status='active' AND role!='admin'").bind(companyId).all<{ email: string }>();
  const tnbEmail = env.TNB_EMAIL_TO || "clients@tnbbusinesssolutionsllc.com";
  const recipients = [...new Set([tnbEmail.toLowerCase(), ...contacts.results.map((row) => row.email)].filter((email) => EMAIL.test(email)))];
  const results = [];
  for (const recipient of recipients) results.push(await queueEmail(db, companyId, recipient, subject, body));
  return results;
}

/** Notify the TNB mailbox only (for example, a new additional document is ready for review). */
export async function notifyTnb(db: D1, companyId: string, subject: string, body: string) {
  const tnbEmail = (env.TNB_EMAIL_TO || "clients@tnbbusinesssolutionsllc.com").toLowerCase();
  if (!EMAIL.test(tnbEmail)) return null;
  return queueEmail(db, companyId, tnbEmail, subject, body);
}

export async function retryEmail(db: D1, id: string) {
  const row = await db.prepare("SELECT id,company_id,recipient,subject,body,status,attempts FROM notification_outbox WHERE id=? AND status IN ('queued','failed')").bind(id).first<OutboxRow>();
  if (!row) return { found: false, status: "not_found" };
  const result = await sendGmail(row.recipient, row.subject, row.body).catch(() => ({ sent: false, error: "Email delivery failed; check the Google Workspace connection." }));
  const status = result.sent ? "sent" : (result.error.includes("not configured") ? "queued" : "failed");
  await db.prepare("UPDATE notification_outbox SET status=?,attempts=attempts+?,last_error=?,sent_at=? WHERE id=?")
    .bind(status, result.error.includes("not configured") ? 0 : 1, result.error, result.sent ? new Date().toISOString() : null, id).run();
  return { found: true, status };
}
