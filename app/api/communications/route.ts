import { identity, memberFor, companyScope, audit, jsonError } from "../_lib";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const auth=await identity(); if("response" in auth) return auth.response;
  const member=await memberFor(auth.db,auth.user); if(!member) return jsonError("Access denied",403);
  const body=await request.json() as {companyId?:string;body?:string}; const message=body.body?.trim(); const companyId=body.companyId;
  if(!companyId || !message || message.length>2000) return jsonError("Write a message up to 2,000 characters.");
  const scope=await companyScope(auth.db,member); if(!scope.includes(companyId)) return jsonError("Access denied",403);
  const id=crypto.randomUUID(); await auth.db.prepare("INSERT INTO communications(id,company_id,author_id,author_name,body,created_at) VALUES(?,?,?,?,?,?)").bind(id,companyId,auth.user.userId,auth.user.displayName,message,new Date().toISOString()).run();
  await audit(auth.db,auth.user.userId,"message_posted",id); return Response.json({id},{status:201});
}
