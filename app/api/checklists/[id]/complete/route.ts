import { identity, memberFor, audit, jsonError } from "../../../_lib";
import { checklistApproved, postSystemMessage } from "../../../../../lib/onboarding";
import { notifyCompanyAndTnb } from "../../../../../lib/email";

export const dynamic = "force-dynamic";
export async function POST(request: Request, {params}:{params:Promise<{id:string}>}) {
  const auth=await identity(); if("response" in auth)return auth.response;
  const member=await memberFor(auth.db,auth.user); if(member?.role!=="admin")return jsonError("Admin access required",403);
  const {id}=await params;
  const body=await request.json().catch(()=>({})) as {signaturesComplete?:boolean};
  if(body.signaturesComplete!==true)return jsonError("Confirm that required agreements are signed separately or are not required.");
  const checklist=await auth.db.prepare("SELECT id,company_id,business_type,completed_at FROM onboarding_checklists WHERE id=?").bind(id).first<{id:string;company_id:string;business_type:string;completed_at:string|null}>();
  if(!checklist)return jsonError("Checklist not found.",404);
  if(!await checklistApproved(auth.db,checklist.company_id,checklist.business_type))return jsonError("Approve every required checklist document before completing onboarding.");
  // Each live (non-test, non-canceled) agreement template needs at least one completed request.
  // Test-mode and canceled requests are ignored; a declined or expired request can be replaced by a new one.
  const signatures = await auth.db.prepare("SELECT COUNT(DISTINCT template_name) AS needed, COUNT(DISTINCT CASE WHEN status='completed' THEN template_name END) AS done FROM signature_requests WHERE company_id=? AND test_mode=0 AND status<>'canceled'").bind(checklist.company_id).first<{needed:number;done:number}>();
  if((signatures?.needed??0)>0 && (signatures?.done??0)<(signatures?.needed??0))return jsonError("Complete every live SignWell agreement before closing onboarding. Test-mode and canceled requests do not count.");
  if(checklist.completed_at)return Response.json({id,completedAt:checklist.completed_at,alreadyComplete:true});
  const now=new Date().toISOString();
  await auth.db.prepare("UPDATE onboarding_checklists SET completed_at=?,updated_at=? WHERE id=? AND completed_at IS NULL").bind(now,now,id).run();
  await postSystemMessage(auth.db,checklist.company_id,"TNB onboarding is complete. Required documents were approved, and TNB confirmed that any required agreements are signed or not required.");
  await notifyCompanyAndTnb(auth.db,checklist.company_id,"TNB onboarding is complete","TNB has completed the business onboarding review. Required documents were approved, and TNB confirmed that any required agreements are signed or not required. This portal does not submit applications to outside agencies.");
  await audit(auth.db,auth.user.userId,"onboarding_completed",id);
  return Response.json({id,completedAt:now});
}
