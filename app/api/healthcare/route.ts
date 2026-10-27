import { identity, memberFor, audit, jsonError } from "../_lib";
export const dynamic = "force-dynamic";
const needsAllowed=new Set(["medicare","medicaid","medicaid_enrollment","ccsp","source","now_comp","commercial_payers","caqh","state_facility_license","clia","other","other_waiver"]);
const stages=new Set(["not_started","application_in_progress","submitted","awaiting_response","revalidation"]);
const workflowStatuses=new Set(["new","reviewing","awaiting_documents","in_progress","on_hold","complete"]);
const businessTypes=new Set(["home_health","home_care","adult_day","adult_day_center","personal_care_home","residential_support_provider","behavioral_health","dme_supplier","clinic_practice","healthcare_staffing","laboratory","other"]);
function field(body:Record<string,unknown>,key:string,max:number){return (typeof body[key]==="string"?body[key].trim():"").slice(0,max);}
export async function POST(request:Request){
  const auth=await identity(); if("response" in auth)return auth.response;
  const member=await memberFor(auth.db,auth.user); if(!member || !["admin","healthcare_client"].includes(member.role))return jsonError("Healthcare business onboarding is available to invited healthcare businesses.",403);
  const body=await request.json() as Record<string,unknown>,companyId=field(body,"companyId",80);
  if(member.role!=="admin"&&companyId!==member.company_id)return jsonError("You can submit an intake for your own business only.",403);
  const company=await auth.db.prepare("SELECT id,type FROM companies WHERE id=? AND status='active'").bind(companyId).first<{id:string;type:string}>();
  if(!company || company.type!=="healthcare_client")return jsonError("Select an invited healthcare business.",400);
  const businessType=field(body,"businessType",40); if(!businessTypes.has(businessType))return jsonError("Choose a healthcare business type.");
  const needs=Array.isArray(body.credentialingNeeds)?body.credentialingNeeds.filter((item):item is string=>typeof item==="string"&&needsAllowed.has(item)):[];
  const npiStatus=field(body,"npiStatus",24)||"not_sure";
  if(!["have","applied","not_sure"].includes(npiStatus))return jsonError("Choose an NPI status.");
  const npi=field(body,"organizationNpi",10); if(npi && !/^\d{10}$/.test(npi))return jsonError("An organization NPI must contain 10 digits.");
  const stage=field(body,"currentStage",32)||"not_started"; if(!stages.has(stage))return jsonError("Choose a credentialing stage.");
  const targetDate=field(body,"targetDate",10); if(targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate))return jsonError("Enter a valid target date.");
  let website=field(body,"website",200); if(website){try{const parsed=new URL(website.startsWith("http")?website:`https://${website}`);if(!["http:","https:"].includes(parsed.protocol))return jsonError("Enter a valid business website.");website=parsed.toString();}catch{return jsonError("Enter a valid business website.");}}
  const requestedStatus=field(body,"workflowStatus",32)||"new"; if(member.role==="admin"&&!workflowStatuses.has(requestedStatus))return jsonError("Choose a valid intake status.");
  const id=crypto.randomUUID(),now=new Date().toISOString();
  const status=member.role==="admin"?requestedStatus:"new";
  await auth.db.prepare(`INSERT INTO credentialing_intakes(id,company_id,business_type,service_area,website,credentialing_needs,npi_status,organization_npi,taxonomy,current_stage,target_date,workflow_status,notes,submitted_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(company_id) DO UPDATE SET business_type=excluded.business_type,service_area=excluded.service_area,website=excluded.website,credentialing_needs=excluded.credentialing_needs,npi_status=excluded.npi_status,organization_npi=excluded.organization_npi,taxonomy=excluded.taxonomy,current_stage=excluded.current_stage,target_date=excluded.target_date,workflow_status=CASE WHEN ?='admin' THEN excluded.workflow_status ELSE credentialing_intakes.workflow_status END,notes=excluded.notes,submitted_by=excluded.submitted_by,updated_at=excluded.updated_at`).bind(id,companyId,businessType,field(body,"serviceArea",300),website,needs.join(","),npiStatus,npi,field(body,"taxonomy",150),stage,targetDate,status,field(body,"notes",1500),auth.user.userId,now,member.role).run();
  await audit(auth.db,auth.user.userId,"healthcare_credentialing_intake_saved",companyId);
  return Response.json({companyId,workflowStatus:status,updatedAt:now});
}
