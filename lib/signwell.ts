import { env } from "cloudflare:workers";

export type SignWellTemplate = { key: string; title: string; templateId: string; recipientPlaceholder: string };
type CreateResponse = { id?: string; recipients?: Array<{ id?: string; email?: string; embedded_signing_url?: string }> };
type GetResponse = { id?: string; recipients?: Array<{ id?: string; email?: string; embedded_signing_url?: string }> };

const API = "https://www.signwell.com/api/v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function signWellTemplates(): SignWellTemplate[] {
  if (!env.SIGNWELL_TEMPLATE_CATALOG) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(env.SIGNWELL_TEMPLATE_CATALOG); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  return parsed.flatMap((item): SignWellTemplate[] => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.key !== "string" || !/^[a-z0-9_-]{2,60}$/.test(row.key) || seen.has(row.key)) return [];
    if (typeof row.title !== "string" || !row.title.trim() || row.title.length > 120) return [];
    if (typeof row.templateId !== "string" || !UUID.test(row.templateId)) return [];
    if (typeof row.recipientPlaceholder !== "string" || !row.recipientPlaceholder.trim() || row.recipientPlaceholder.length > 80) return [];
    seen.add(row.key);
    return [{ key: row.key, title: row.title.trim(), templateId: row.templateId, recipientPlaceholder: row.recipientPlaceholder.trim() }];
  });
}

export function signWellConfigured() { return Boolean(env.SIGNWELL_API_KEY); }
export function signWellTestMode() { return env.SIGNWELL_TEST_MODE !== "false"; }

async function signWellFetch(path: string, init: RequestInit = {}) {
  if (!env.SIGNWELL_API_KEY) throw new Error("SignWell is not configured.");
  return fetch(`${API}${path}`, {
    ...init,
    headers: { "X-Api-Key": env.SIGNWELL_API_KEY, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
}

function safeEmbeddedUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "www.signwell.com" || !url.pathname.startsWith("/docs/")) return null;
    return url.toString();
  } catch { return null; }
}

export async function createSignWellDocument(input: {
  template: SignWellTemplate; localRequestId: string; documentName: string;
  signerName: string; signerEmail: string; requesterEmail: string;
}) {
  const response = await signWellFetch("/document_templates/documents", {
    method: "POST",
    body: JSON.stringify({
      template_id: input.template.templateId,
      name: input.documentName,
      test_mode: signWellTestMode(),
      embedded_signing: true,
      embedded_signing_notifications: false,
      reminders: true,
      allow_decline: true,
      custom_requester_name: "TNB Business Solutions",
      custom_requester_email: input.requesterEmail,
      recipients: [{ id: "1", placeholder_name: input.template.recipientPlaceholder, name: input.signerName, email: input.signerEmail }],
      metadata: { tnb_signature_request_id: input.localRequestId },
    }),
  });
  if (!response.ok) throw new Error(`SignWell returned HTTP ${response.status} while creating the signature request.`);
  const data = await response.json() as CreateResponse;
  const url = safeEmbeddedUrl(data.recipients?.[0]?.embedded_signing_url);
  if (!data.id || !url) throw new Error("SignWell did not return a usable embedded signing link.");
  return { providerDocumentId: data.id, embeddedSigningUrl: url };
}

export async function signerEmbeddedUrl(providerDocumentId: string, signerEmail: string) {
  const response = await signWellFetch(`/documents/${encodeURIComponent(providerDocumentId)}`);
  if (!response.ok) throw new Error(`SignWell returned HTTP ${response.status} while retrieving signing status.`);
  const data = await response.json() as GetResponse;
  const recipient = data.recipients?.find((entry) => entry.email?.toLowerCase() === signerEmail.toLowerCase());
  return safeEmbeddedUrl(recipient?.embedded_signing_url);
}

export async function downloadCompletedPdf(providerDocumentId: string) {
  const response = await signWellFetch(`/documents/${encodeURIComponent(providerDocumentId)}/completed_pdf?audit_page=true&file_format=pdf`);
  if (!response.ok) throw new Error(`SignWell returned HTTP ${response.status} while retrieving the completed agreement.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 5 || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("SignWell returned a file that is not a PDF.");
  return bytes;
}

export async function verifySignWellEvent(envelope: {
  event?: { hash?: string; type?: string; time?: number };
}, webhookId = env.SIGNWELL_WEBHOOK_ID ?? "") {
  const event = envelope.event;
  if (!webhookId || !event?.hash || !event.type || !Number.isInteger(event.time)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(event.time));
  if (ageSeconds > 24 * 60 * 60) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(webhookId), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${event.type}@${event.time}`));
  const expected = Array.from(new Uint8Array(mac), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const supplied = event.hash.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(supplied) || supplied.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
  return mismatch === 0;
}
