import { env } from "cloudflare:workers";
import { verifySignWellEvent, downloadCompletedPdf } from "../../../../lib/signwell";
import { postSystemMessage } from "../../../../lib/onboarding";
import { shouldApplyStatus } from "../../../../lib/signwell-status";
import { notifyCompanyAndTnb } from "../../../../lib/email";
export const dynamic = "force-dynamic";

type HookBody={event?:{hash?:string;time?:number;type?:string};data?:{object?:{id?:string;status?:string}}};
const STATUS:Record<string,string>={document_created:"created",document_sent:"sent",document_viewed:"viewed",document_in_progress:"in_progress",document_signed:"partially_signed",document_completed:"completed",document_expired:"expired",document_canceled:"canceled",document_declined:"declined",document_bounced:"bounced",document_error:"error"};

export async function POST(request:Request) {
  if(!env.DB||!env.BUCKET)return Response.json({error:"Storage is not configured."},{status:503});
  const raw=await request.text(); if(raw.length>128_000)return Response.json({error:"Request too large."},{status:413});
  let body:HookBody; try{body=JSON.parse(raw) as HookBody;}catch{return Response.json({error:"Invalid JSON."},{status:400});}
  if(!await verifySignWellEvent(body))return Response.json({error:"Invalid or expired signature event."},{status:401});
  const event=body.event!,providerDocumentId=body.data?.object?.id;
  if(!providerDocumentId||!event.hash||!event.type||typeof event.time!=="number")return Response.json({error:"Incomplete event."},{status:400});
  const requestRow=await env.DB.prepare("SELECT id,company_id,template_name,signer_name,signer_email,status,signed_object_key FROM signature_requests WHERE provider_document_id=?").bind(providerDocumentId).first<{id:string;company_id:string;template_name:string;signer_name:string;signer_email:string;status:string;signed_object_key:string|null}>();
  if(!requestRow)return Response.json({received:true,ignored:true});
  const status=STATUS[event.type];
  if(!status)return Response.json({received:true,ignored:true});
  let objectKey=requestRow.signed_object_key;
  if(event.type==="document_completed"&&!objectKey){
    try {
      const pdf=await downloadCompletedPdf(providerDocumentId);
      objectKey=`agreements/${requestRow.company_id}/${requestRow.id}-signed.pdf`;
      await env.BUCKET.put(objectKey,pdf,{httpMetadata:{contentType:"application/pdf",cacheControl:"private, no-store"},customMetadata:{signatureRequestId:requestRow.id,provider:"signwell"}});
    } catch { return Response.json({error:"Completed PDF could not be saved; SignWell may retry this event."},{status:503}); }
  }
  const inserted=await env.DB.prepare("INSERT OR IGNORE INTO signature_events(event_hash,provider_document_id,event_type,event_time,received_at) VALUES(?,?,?,?,?)").bind(event.hash,providerDocumentId,event.type,event.time,new Date().toISOString()).run();
  if(!inserted.meta.changes)return Response.json({received:true,duplicate:true});
  const now=new Date().toISOString();
  if(!shouldApplyStatus(requestRow.status,status)){
    await env.DB.prepare("INSERT INTO audit_events(id,actor_id,action,target_id,created_at) VALUES(?,'signwell',?,?,?)").bind(crypto.randomUUID(),`signwell_ignored_${status}`,requestRow.id,now).run();
    return Response.json({received:true,ignored:true,reason:"out_of_order"});
  }
  await env.DB.prepare("UPDATE signature_requests SET status=?,signed_object_key=COALESCE(?,signed_object_key),last_event=?,completed_at=CASE WHEN ?='completed' THEN COALESCE(completed_at,?) ELSE completed_at END,updated_at=?,last_error=NULL WHERE id=?")
    .bind(status,objectKey,event.type,status,now,now,requestRow.id).run();
  if(event.type==="document_completed"&&requestRow.status!=="completed"){
    const message=`“${requestRow.template_name}” was signed by ${requestRow.signer_name}. The signed agreement and SignWell audit page are saved in the private portal.`;
    await postSystemMessage(env.DB,requestRow.company_id,message);
    await notifyCompanyAndTnb(env.DB,requestRow.company_id,"TNB agreement signed",`${message} Sign in to the portal to view the signed agreement.`);
  } else if(["document_declined","document_expired","document_bounced","document_error"].includes(event.type)){
    const message=`The SignWell agreement “${requestRow.template_name}” has status: ${status.replaceAll("_"," ")}. TNB should review the request and follow up.`;
    await postSystemMessage(env.DB,requestRow.company_id,message);
    await notifyCompanyAndTnb(env.DB,requestRow.company_id,"TNB agreement needs attention",message);
  }
  await env.DB.prepare("INSERT INTO audit_events(id,actor_id,action,target_id,created_at) VALUES(?,'signwell',?,?,?)").bind(crypto.randomUUID(),`signwell_${status}`,requestRow.id,now).run();
  return Response.json({received:true,status});
}
