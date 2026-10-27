import { env } from "cloudflare:workers";
import { identity, memberFor, audit, jsonError } from "../../_lib";
import { createSignWellDocument, signWellTemplates, signWellTestMode } from "../../../../lib/signwell";
import { postSystemMessage } from "../../../../lib/onboarding";
import { notifyCompanyAndTnb } from "../../../../lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await identity(); if ("response" in auth) return auth.response;
  const member = await memberFor(auth.db, auth.user); if (!member) return jsonError("Access denied.", 403);
  const scope = member.role === "admin"
    ? await auth.db.prepare("SELECT id FROM companies WHERE type!='admin' AND status='active'").all<{id:string}>()
    : member.role === "prime"
      ? await auth.db.prepare("SELECT vendor_company_id AS id FROM prime_vendor_links WHERE prime_company_id=?").bind(member.company_id).all<{id:string}>()
      : { results: [] as Array<{id:string}> };
  const companyIds = member.role === "admin" ? scope.results.map((row)=>row.id) : member.role === "prime" ? [member.company_id,...scope.results.map((row)=>row.id)] : [member.company_id];
  if (!companyIds.length) return Response.json({ requests: [] });
  const rows = await auth.db.prepare(`SELECT r.id,r.company_id,r.template_key,r.template_name,r.signer_name,r.signer_email,r.status,r.test_mode,r.created_at,r.updated_at,r.completed_at,r.last_event,c.name AS company_name
    FROM signature_requests r JOIN companies c ON c.id=r.company_id WHERE r.company_id IN (${companyIds.map(()=>"?").join(",")}) ORDER BY r.created_at DESC LIMIT 100`).bind(...companyIds).all();
  return Response.json({ requests: rows.results });
}

export async function POST(request: Request) {
  const auth = await identity(); if ("response" in auth) return auth.response;
  const member = await memberFor(auth.db, auth.user); if (member?.role !== "admin") return jsonError("Admin access required.", 403);
  if (!env.SIGNWELL_API_KEY) return jsonError("SignWell API credentials are not configured yet.", 503);
  const body = await request.json().catch(()=>({})) as { companyId?: string; templateKey?: string; signerName?: string; signerEmail?: string; documentName?: string };
  const companyId = body.companyId?.trim() ?? "", templateKey = body.templateKey?.trim() ?? "";
  const signerName = body.signerName?.trim().slice(0,120) ?? "", signerEmail = body.signerEmail?.trim().toLowerCase() ?? "";
  const documentName = body.documentName?.trim().slice(0,160) || "TNB Business Onboarding Agreement";
  if (!companyId || !templateKey || signerName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail)) return jsonError("Choose a business and agreement, and enter the signer’s name and email.");
  const company = await auth.db.prepare("SELECT id,name,type FROM companies WHERE id=? AND status='active' AND type!='admin'").bind(companyId).first<{id:string;name:string;type:string}>();
  if (!company) return jsonError("Select an active vendor or healthcare business.");
  const authorizedSigner = await auth.db.prepare("SELECT id FROM memberships WHERE company_id=? AND lower(email)=? AND status IN ('active','pending') LIMIT 1").bind(companyId,signerEmail).first();
  if (!authorizedSigner) return jsonError("Invite the signer to this company before sending an agreement to that email.");
  const template = signWellTemplates().find((item)=>item.key===templateKey);
  if (!template) return jsonError("That SignWell template is not configured in the approved template list.");
  const requesterEmail = env.SIGNWELL_REQUESTER_EMAIL || env.TNB_EMAIL_FROM || "clients@tnbbusinesssolutionsllc.com";
  const id = crypto.randomUUID(), now = new Date().toISOString(), testMode = signWellTestMode();
  await auth.db.prepare("INSERT INTO signature_requests(id,company_id,template_key,template_name,signer_name,signer_email,status,test_mode,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,'creating',?,?,?,?)")
    .bind(id,companyId,template.key,template.title,signerName,signerEmail,testMode?1:0,auth.user.userId,now,now).run();
  try {
    const provider = await createSignWellDocument({ template, localRequestId:id, documentName:`${company.name} — ${documentName}`, signerName, signerEmail, requesterEmail });
    await auth.db.prepare("UPDATE signature_requests SET provider_document_id=?,status='sent',updated_at=? WHERE id=?")
      .bind(provider.providerDocumentId,new Date().toISOString(),id).run();
    await postSystemMessage(auth.db,companyId,`TNB sent “${template.title}” for signature to ${signerEmail}.`);
    await notifyCompanyAndTnb(auth.db,companyId,"TNB agreement sent for signature",`TNB sent “${template.title}” for signature to ${signerName} (${signerEmail}). Sign in to the TNB portal to complete the agreement. No documents are submitted to outside agencies.`);
    await audit(auth.db,auth.user.userId,"signwell_request_created",id);
    return Response.json({ id, status:"sent", testMode, embeddedSigningUrl:provider.embeddedSigningUrl },{status:201});
  } catch (error) {
    const safeError = error instanceof Error ? error.message.slice(0,180) : "SignWell request failed.";
    await auth.db.prepare("UPDATE signature_requests SET status='error',last_error=?,updated_at=? WHERE id=?").bind(safeError,new Date().toISOString(),id).run();
    return jsonError("SignWell could not create the request. Check the server logs and template setup, then retry.",502);
  }
}
