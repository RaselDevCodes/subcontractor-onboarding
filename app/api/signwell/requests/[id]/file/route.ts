import { identity, memberFor, companyScope, audit, jsonError } from "../../../../_lib";
export const dynamic = "force-dynamic";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await identity(); if("response" in auth)return auth.response;
  const member=await memberFor(auth.db,auth.user); if(!member)return jsonError("Access denied.",403);
  const {id}=await params;
  const row=await auth.db.prepare("SELECT id,company_id,signer_email,status,signed_object_key FROM signature_requests WHERE id=?").bind(id).first<{id:string;company_id:string;signer_email:string;status:string;signed_object_key:string|null}>();
  if(!row || row.status!=="completed" || !row.signed_object_key)return jsonError("Signed agreement not found.",404);
  const scope=await companyScope(auth.db,member);
  if(!scope.includes(row.company_id) || (member.role!=="admin"&&member.email.toLowerCase()!==row.signer_email.toLowerCase()))return jsonError("Access denied.",403);
  const object=await auth.bucket.get(row.signed_object_key); if(!object)return jsonError("Signed agreement file is unavailable.",404);
  await audit(auth.db,auth.user.userId,"signed_agreement_downloaded",row.id);
  return new Response(object.body,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="TNB-signed-agreement-${row.id}.pdf"`,"Content-Length":String(object.size),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"}});
}
