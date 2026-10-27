import { identity, memberFor, audit, jsonError } from "../../../_lib";
import { evaluateSubmissionMilestone, postSystemMessage } from "../../../../../lib/onboarding";

export const dynamic = "force-dynamic";

/**
 * TNB admin attaches an Additional Document to an open checklist item it satisfies.
 * The document keeps its review status and history; the checklist item takes that status.
 */
export async function PATCH(request: Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await identity(); if("response" in auth)return auth.response;
  const member=await memberFor(auth.db,auth.user); if(member?.role!=="admin")return jsonError("Admin access required",403);
  const {id}=await params;
  const body=await request.json().catch(()=>({})) as {requirementId?:string};
  const requirementId=String(body.requirementId??"");
  const doc=await auth.db.prepare("SELECT id,company_id,status,requirement_id,title,filename FROM documents WHERE id=?").bind(id).first<{id:string;company_id:string;status:string;requirement_id:string|null;title:string;filename:string}>();
  if(!doc)return jsonError("Document not found.",404);
  if(doc.requirement_id)return jsonError("This document is already attached to a checklist item.");
  if(doc.status!=="pending_review"&&doc.status!=="approved")return jsonError("Only documents that are pending review or approved can be attached.");
  const item=await auth.db.prepare("SELECT id,business_type,status,title FROM checklist_requirements WHERE id=? AND company_id=?").bind(requirementId,doc.company_id).first<{id:string;business_type:string;status:string;title:string}>();
  if(!item)return jsonError("Choose a checklist item for the same business.");
  if(item.status!=="not_received"&&item.status!=="needs_changes")return jsonError("That checklist item is already submitted, approved, or not applicable.");
  const now=new Date().toISOString();
  await auth.db.prepare("UPDATE documents SET requirement_id=? WHERE id=? AND requirement_id IS NULL").bind(item.id,doc.id).run();
  await auth.db.prepare("UPDATE checklist_requirements SET status=?,document_id=?,review_note='',updated_at=? WHERE id=?").bind(doc.status,doc.id,now,item.id).run();
  await postSystemMessage(auth.db,doc.company_id,`TNB applied the additional document “${doc.title||doc.filename}” to the checklist item “${item.title}”.`);
  await evaluateSubmissionMilestone(auth.db,doc.company_id,item.business_type);
  await audit(auth.db,auth.user.userId,"document_assigned_to_checklist",doc.id);
  return Response.json({id:doc.id,requirementId:item.id,status:doc.status});
}
