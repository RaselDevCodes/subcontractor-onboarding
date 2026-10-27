import { identity, memberFor, companyScope, audit, jsonError } from "../../../_lib";
export const dynamic = "force-dynamic";
export async function GET(_request: Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await identity(); if("response" in auth) return auth.response;
  const member=await memberFor(auth.db,auth.user); if(!member) return jsonError("Access denied",403);
  const {id}=await params; const doc=await auth.db.prepare("SELECT id,company_id,filename,content_type,status,object_key FROM documents WHERE id=?").bind(id).first<{id:string;company_id:string;filename:string;content_type:string;status:string;object_key:string}>();
  if(!doc) return jsonError("Document not found",404);
  const scope=await companyScope(auth.db,member); if(!scope.includes(doc.company_id) || (doc.status!=="approved" && member.role!=="admin")) return jsonError("Access denied",403);
  const object=await auth.bucket.get(doc.object_key); if(!object) return jsonError("Document file is unavailable",404);
  await audit(auth.db,auth.user.userId,"document_downloaded",doc.id);
  const safeName=doc.filename.replace(/["\\\r\n]/g,"_");
  return new Response(object.body,{headers:{"Content-Type":"application/octet-stream","Content-Disposition":`attachment; filename="${safeName}"`,"Content-Length":String(object.size),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"}});
}
