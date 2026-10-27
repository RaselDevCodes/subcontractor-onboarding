import { identity, memberFor, audit, jsonError } from "../../../_lib";
import { evaluateSubmissionMilestone, postSystemMessage } from "../../../../../lib/onboarding";

export const dynamic = "force-dynamic";
export async function PATCH(request: Request, {params}:{params:Promise<{id:string}>}) {
  const auth=await identity(); if("response" in auth)return auth.response;
  const member=await memberFor(auth.db,auth.user); if(member?.role!=="admin")return jsonError("Admin access required",403);
  const {id}=await params;
  const body=await request.json() as {status?:string;note?:string};
  const note=(body.note??"").trim().slice(0,500);
  if(body.status!=="not_applicable"||!note)return jsonError("Add a reason for marking this checklist item not applicable.");
  const item=await auth.db.prepare("SELECT id,company_id,business_type,title FROM checklist_requirements WHERE id=?").bind(id).first<{id:string;company_id:string;business_type:string;title:string}>();
  if(!item)return jsonError("Checklist item not found.",404);
  await auth.db.prepare("UPDATE checklist_requirements SET status='not_applicable',review_note=?,updated_at=? WHERE id=?").bind(note,new Date().toISOString(),id).run();
  await auth.db.prepare("UPDATE onboarding_checklists SET completed_at=NULL,updated_at=? WHERE company_id=? AND business_type=?").bind(new Date().toISOString(),item.company_id,item.business_type).run();
  await postSystemMessage(auth.db,item.company_id,`TNB marked “${item.title}” as not applicable for this onboarding: ${note}`);
  await evaluateSubmissionMilestone(auth.db,item.company_id,item.business_type);
  await audit(auth.db,auth.user.userId,"checklist_item_not_applicable",id);
  return Response.json({id,status:"not_applicable"});
}
