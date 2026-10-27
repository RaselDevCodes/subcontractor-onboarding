import { identity, memberFor, audit, jsonError } from "../../_lib";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const auth=await identity(); if("response" in auth) return auth.response;
  const member=await memberFor(auth.db,auth.user); if(member?.role!=="admin") return jsonError("Admin access required",403);
  const body=await request.json() as {email?:string;role?:string;companyId?:string}; const email=body.email?.trim().toLowerCase();
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["prime","vendor","healthcare_client"].includes(body.role??"") || !body.companyId) return jsonError("Enter a valid email, role, and company.");
  const company=await auth.db.prepare("SELECT id,type FROM companies WHERE id=? AND status='active'").bind(body.companyId).first<{id:string;type:string}>();
  if(!company || company.type!==body.role) return jsonError("Choose a company that matches the selected role.");
  const id=crypto.randomUUID();
  try { await auth.db.prepare("INSERT INTO memberships(id,email,role,company_id,status,created_at) VALUES(?,?,?,?,'pending',?)").bind(id,email,body.role,body.companyId,new Date().toISOString()).run(); }
  catch { return jsonError("That email already has a portal membership.",409); }
  await audit(auth.db,auth.user.userId,"member_invited",id); return Response.json({id,email,role:body.role,company_id:body.companyId,status:"pending"});
}
