import { identity, memberFor, jsonError } from "../../_lib";
import { signWellConfigured, signWellTemplates, signWellTestMode } from "../../../../lib/signwell";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await identity(); if ("response" in auth) return auth.response;
  const member = await memberFor(auth.db, auth.user);
  if (member?.role !== "admin") return jsonError("Admin access required.", 403);
  return Response.json({ configured: signWellConfigured(), testMode: signWellTestMode(), templates: signWellTemplates().map(({ key, title }) => ({ key, title })) });
}
