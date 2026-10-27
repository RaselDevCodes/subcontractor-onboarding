import { identity, memberFor, audit, jsonError } from "../../../_lib";
import { evaluateSubmissionMilestone, postSystemMessage } from "../../../../../lib/onboarding";
import { notifyCompanyAndTnb } from "../../../../../lib/email";
export const dynamic = "force-dynamic";
export async function PATCH(request: Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await identity(); if("response" in auth) return auth.response;
  const member=await memberFor(auth.db,auth.user); if(member?.role!=="admin") return jsonError("Admin access required",403);
  const {id}=await params; const body=await request.json() as {status?:string;reviewNote?:string}; if(!["approved","rejected"].includes(body.status??"")) return jsonError("Choose approved or rejected.");
  const reviewNote=(body.reviewNote??"").trim().slice(0,500);
  if(body.status==="rejected"&&!reviewNote)return jsonError("Add a short reason so the business knows what to correct.");
  const doc=await auth.db.prepare("SELECT id,company_id,requirement_id,title,filename FROM documents WHERE id=? AND status='pending_review'").bind(id).first<{id:string;company_id:string;requirement_id:string|null;title:string;filename:string}>();
  if(!doc)return jsonError("Pending document not found.",404);
  const result=await auth.db.prepare("UPDATE documents SET status=?,reviewed_by=?,reviewed_at=?,review_note=? WHERE id=? AND status='pending_review'").bind(body.status,auth.user.userId,new Date().toISOString(),reviewNote,id).run();
  if(!result.meta.changes) return jsonError("Pending document not found.",404);
  if(doc.requirement_id){
    await auth.db.prepare("UPDATE checklist_requirements SET status=?,review_note=?,updated_at=? WHERE id=? AND document_id=?")
      .bind(body.status==="approved"?"approved":"needs_changes",reviewNote,new Date().toISOString(),doc.requirement_id,id).run();
    const item=await auth.db.prepare("SELECT title,business_type FROM checklist_requirements WHERE id=?").bind(doc.requirement_id).first<{title:string;business_type:string}>();
    if(body.status==="rejected"&&item){
      const message=`TNB requested a correction for “${item.title}”: ${reviewNote}`;
      await postSystemMessage(auth.db,doc.company_id,message);
      await notifyCompanyAndTnb(auth.db,doc.company_id,"A TNB onboarding document needs correction",`${message} Sign in to the portal to upload a replacement.`);
    }
    await evaluateSubmissionMilestone(auth.db,doc.company_id,item?.business_type??"");
    if(body.status==="rejected")await auth.db.prepare("UPDATE onboarding_checklists SET completed_at=NULL,updated_at=? WHERE company_id=?").bind(new Date().toISOString(),doc.company_id).run();
  } else if(body.status==="rejected"){
    // Additional document (not on the checklist): tell the business what to fix. It never blocks onboarding.
    const message=`TNB requested a correction for the additional document “${doc.title||doc.filename}”: ${reviewNote}`;
    await postSystemMessage(auth.db,doc.company_id,message);
    await notifyCompanyAndTnb(auth.db,doc.company_id,"A TNB additional document needs correction",`${message} Sign in to the portal to upload a corrected file.`);
  }
  await audit(auth.db,auth.user.userId,`document_${body.status}`,id); return Response.json({id,status:body.status});
}
