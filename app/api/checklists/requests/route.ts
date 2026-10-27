import { identity, memberFor, audit, jsonError } from "../../_lib";
import { currentBusinessType, ensureChecklist, postSystemMessage } from "../../../../lib/onboarding";
import { notifyCompanyAndTnb } from "../../../../lib/email";
import { TITLE_MAX, DESCRIPTION_MAX } from "../../../../lib/documents";

export const dynamic = "force-dynamic";

/**
 * TNB admin adds a one-off document request to a single company's checklist.
 * Required requests reopen the "documents received" and "complete" milestones;
 * optional requests never block onboarding.
 */
export async function POST(request: Request) {
  const auth=await identity(); if("response" in auth)return auth.response;
  const member=await memberFor(auth.db,auth.user); if(member?.role!=="admin")return jsonError("Admin access required",403);
  const body=await request.json().catch(()=>({})) as {companyId?:string;title?:string;description?:string;required?:boolean};
  const companyId=String(body.companyId??"").slice(0,80);
  const title=String(body.title??"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,TITLE_MAX);
  const description=String(body.description??"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,DESCRIPTION_MAX);
  const required=body.required===true;
  if(!title)return jsonError("Enter the name of the document you are requesting.");
  const businessType=await currentBusinessType(auth.db,companyId);
  if(!businessType)return jsonError("Choose an active vendor, prime contractor, or healthcare business.");
  const checklistId=await ensureChecklist(auth.db,companyId,businessType);
  const id=crypto.randomUUID(),now=new Date().toISOString();
  await auth.db.prepare("INSERT INTO checklist_requirements(id,checklist_id,company_id,business_type,item_key,title,required,status,created_at,updated_at,source,description) VALUES(?,?,?,?,?,?,?,'not_received',?,?,'tnb_request',?)")
    .bind(id,checklistId,companyId,businessType,`tnb_request_${id}`,title,required?1:0,now,now,description).run();
  if(required){
    await auth.db.prepare("UPDATE onboarding_checklists SET documents_submitted_at=NULL,completed_at=NULL,updated_at=? WHERE id=?").bind(now,checklistId).run();
  }
  const message=`TNB requested ${required?"a required":"an optional"} document: “${title}”${description?` (${description})`:""}.`;
  await postSystemMessage(auth.db,companyId,message);
  await notifyCompanyAndTnb(auth.db,companyId,"TNB requested a document",`${message} Sign in to the portal to upload it.`);
  await audit(auth.db,auth.user.userId,"document_requested",id);
  return Response.json({id,title,required},{status:201});
}
