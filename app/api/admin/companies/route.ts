import { identity, memberFor, audit, jsonError } from "../../_lib";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const auth=await identity(); if("response" in auth) return auth.response;
  const member=await memberFor(auth.db,auth.user); if(member?.role!=="admin") return jsonError("Admin access required",403);
  const body=await request.json() as {name?:string;type?:string}; const name=body.name?.trim(); const type=body.type;
  if(!name || name.length>120 || !["prime","vendor","healthcare_client"].includes(type??"")) return jsonError("Enter a company name and choose a valid relationship.");
  const id=crypto.randomUUID(); await auth.db.prepare("INSERT INTO companies(id,name,type,status,created_at) VALUES(?,?,?,'active',?)").bind(id,name,type,new Date().toISOString()).run();
  await audit(auth.db,auth.user.userId,"company_created",id); return Response.json({id,name,type});
}
