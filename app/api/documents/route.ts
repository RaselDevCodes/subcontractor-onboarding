import { identity, memberFor, companyScope, audit, jsonError } from "../_lib";
import { evaluateSubmissionMilestone, postSystemMessage } from "../../../lib/onboarding";
import { notifyTnb } from "../../../lib/email";
import { isDocumentCategory, categoryLabel, TITLE_MAX, DESCRIPTION_MAX } from "../../../lib/documents";
export const dynamic = "force-dynamic";
const MAX_BYTES=10*1024*1024;
const TYPES: Record<string,string>={"application/pdf":"pdf","image/png":"png","image/jpeg":"jpg"};
const clean=(value:FormDataEntryValue|null,max:number)=>String(value??"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,max);
function validMagic(bytes:Uint8Array,type:string) { if(type==="application/pdf") return new TextDecoder().decode(bytes.slice(0,5))==="%PDF-"; if(type==="image/png") return [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n); return bytes[0]===255&&bytes[1]===216&&bytes[2]===255; }

/**
 * Upload a business document.
 * - With requirementId: the file answers a checklist item (template item or a TNB one-off request).
 * - Without requirementId: the file is an Additional Document and needs a title and category.
 * Every file is stored in the company's private R2 folder; nothing is emailed.
 */
export async function POST(request: Request) {
  const auth=await identity(); if("response" in auth) return auth.response;
  const member=await memberFor(auth.db,auth.user); if(!member) return jsonError("Your account is not approved for this workspace.",403);
  const form=await request.formData(); const file=form.get("file"); const companyId=String(form.get("companyId")??""); const requirementId=String(form.get("requirementId")??"").trim();
  if(!(file instanceof File) || !companyId) return jsonError("Choose a company and file.");
  if(file.size<1 || file.size>MAX_BYTES || !TYPES[file.type]) return jsonError("Upload a PDF, PNG, or JPEG up to 10 MB.");
  const scope=await companyScope(auth.db,member); if(!scope.includes(companyId)) return jsonError("You cannot upload to this company.",403);

  let requirement: {id:string;business_type:string;status:string;title:string}|null=null;
  let title="", category="", description="";
  if(requirementId){
    requirement=await auth.db.prepare("SELECT id,business_type,status,title FROM checklist_requirements WHERE id=? AND company_id=?").bind(requirementId,companyId).first<{id:string;business_type:string;status:string;title:string}>();
    if(!requirement)return jsonError("Choose a document from this company's checklist.");
    if(requirement.status==="approved"||requirement.status==="pending_review")return jsonError("This checklist item is already being reviewed or approved.");
    if(requirement.status==="not_applicable")return jsonError("TNB marked this checklist item not applicable.");
    title=requirement.title.slice(0,TITLE_MAX);
  } else {
    title=clean(form.get("title"),TITLE_MAX);
    category=clean(form.get("category"),40);
    description=clean(form.get("description"),DESCRIPTION_MAX);
    if(!title)return jsonError("Give the additional document a title so TNB knows what it is.");
    if(!isDocumentCategory(category))return jsonError("Choose a category for the additional document.");
  }

  const bytes=new Uint8Array(await file.arrayBuffer()); if(!validMagic(bytes,file.type)) return jsonError("The file content does not match its file type.");
  const id=crypto.randomUUID(); const key=`documents/${companyId}/${id}.${TYPES[file.type]}`; const now=new Date().toISOString();
  await auth.bucket.put(key,bytes,{httpMetadata:{contentType:"application/octet-stream",cacheControl:"private, no-store"},customMetadata:{documentId:id}});
  await auth.db.prepare("INSERT INTO documents(id,company_id,uploaded_by,filename,content_type,size,object_key,status,created_at,requirement_id,title,category,description) VALUES(?,?,?,?,?,?,?,'pending_review',?,?,?,?,?)")
    .bind(id,companyId,auth.user.userId,file.name.replace(/[\\/\u0000-\u001f]/g,"_").slice(0,180),file.type,file.size,key,now,requirementId||null,title,category,description).run();

  if(requirement){
    await auth.db.prepare("UPDATE checklist_requirements SET status='pending_review',document_id=?,review_note='',updated_at=? WHERE id=?").bind(id,now,requirement.id).run();
    await evaluateSubmissionMilestone(auth.db,companyId,requirement.business_type);
  } else if(member.role!=="admin"){
    // Let TNB know an additional document is waiting. Status text only, never the file.
    const company=await auth.db.prepare("SELECT name FROM companies WHERE id=?").bind(companyId).first<{name:string}>();
    await postSystemMessage(auth.db,companyId,`Additional document uploaded for TNB review: “${title}” (${categoryLabel(category)}).`);
    await notifyTnb(auth.db,companyId,"New additional document ready for TNB review",`${company?.name??"A business"} uploaded an additional document: “${title}” (${categoryLabel(category)}). Sign in to the TNB portal to review it.`);
  }
  await audit(auth.db,auth.user.userId,requirement?"document_uploaded":"additional_document_uploaded",id);
  return Response.json({id,status:"pending_review"},{status:201});
}
