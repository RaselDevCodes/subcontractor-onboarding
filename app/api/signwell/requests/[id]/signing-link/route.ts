import { identity, memberFor, companyScope, audit, jsonError } from "../../../../_lib";
import { signerEmbeddedUrl } from "../../../../../../lib/signwell";

export const dynamic = "force-dynamic";

export async function POST(_request: Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await identity(); if("response" in auth)return auth.response;
  const member=await memberFor(auth.db,auth.user); if(!member)return jsonError("Access denied.",403);
  const {id}=await params;
  const signature=await auth.db.prepare("SELECT id,company_id,provider_document_id,signer_email,status FROM signature_requests WHERE id=?").bind(id).first<{id:string;company_id:string;provider_document_id:string|null;signer_email:string;status:string}>();
  if(!signature || !signature.provider_document_id)return jsonError("Signature request not found.",404);
  const scope=await companyScope(auth.db,member);
  if(!scope.includes(signature.company_id) || (member.role!=="admin"&&member.email.toLowerCase()!==signature.signer_email.toLowerCase()))return jsonError("Access denied.",403);
  if(["completed","declined","canceled","expired","error"].includes(signature.status))return jsonError("This agreement is no longer available to sign.",409);
  try {
    const embeddedSigningUrl=await signerEmbeddedUrl(signature.provider_document_id,signature.signer_email);
    if(!embeddedSigningUrl)return jsonError("SignWell has no active signing session for this signer.",409);
    await audit(auth.db,auth.user.userId,"signwell_signing_link_issued",id);
    return Response.json({embeddedSigningUrl});
  } catch { return jsonError("Could not open this signing session. Refresh and try again.",502); }
}
