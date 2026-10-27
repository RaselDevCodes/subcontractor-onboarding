import { identity, memberFor, companyScope } from "../_lib";
import { ensureChecklist } from "../../../lib/onboarding";

export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await identity(); if ("response" in auth) return auth.response;
  const member = await memberFor(auth.db, auth.user); if (!member) return Response.json({ member: null, pending: true });
  const scope = await companyScope(auth.db,member);
  const companies = scope.length ? await auth.db.prepare(`SELECT id,name,type,status,created_at FROM companies WHERE id IN (${scope.map(()=>"?").join(",")}) ORDER BY name`).bind(...scope).all() : {results:[]};
  const members = member.role === "admin" ? await auth.db.prepare("SELECT m.id,m.email,m.role,m.company_id,m.status,c.name AS company_name FROM memberships m JOIN companies c ON c.id=m.company_id ORDER BY m.created_at DESC").all() : {results:[]};
  const docsSql = `SELECT d.id,d.company_id,d.filename,d.content_type,d.size,d.status,d.created_at,d.uploaded_by,d.requirement_id,d.review_note,d.title,d.category,d.description,c.name AS company_name FROM documents d JOIN companies c ON c.id=d.company_id WHERE d.company_id IN (${scope.map(()=>"?").join(",")}) ORDER BY d.created_at DESC`;
  const docs = scope.length ? await auth.db.prepare(docsSql).bind(...scope).all() : {results:[]};
  const credentialingIntakes = member.role === "admin" ? await auth.db.prepare("SELECT i.*,c.name AS company_name FROM credentialing_intakes i JOIN companies c ON c.id=i.company_id ORDER BY i.updated_at DESC").all() : member.role === "healthcare_client" ? await auth.db.prepare("SELECT i.*,c.name AS company_name FROM credentialing_intakes i JOIN companies c ON c.id=i.company_id WHERE i.company_id=?").bind(member.company_id).all() : {results:[]};
  const intakeByCompany = new Map((credentialingIntakes.results as Array<{company_id:string;business_type:string}>).map((i)=>[i.company_id,i.business_type]));
  for (const company of companies.results as Array<{id:string;type:string}>) {
    if(company.type==="admin")continue;
    const businessType = company.type === "healthcare_client" ? (intakeByCompany.get(company.id) ?? "other") : company.type;
    await ensureChecklist(auth.db, company.id, businessType);
  }
  const checklists = scope.length ? await auth.db.prepare(`SELECT r.id,r.company_id,r.business_type,r.item_key,r.title,r.required,r.status,r.document_id,r.review_note,r.source,r.description,c.name AS company_name,ck.title AS checklist_title
    FROM checklist_requirements r JOIN companies c ON c.id=r.company_id JOIN onboarding_checklists ck ON ck.id=r.checklist_id
    WHERE r.company_id IN (${scope.map(()=>"?").join(",")})
    AND r.business_type=(CASE WHEN c.type='healthcare_client' THEN COALESCE((SELECT i.business_type FROM credentialing_intakes i WHERE i.company_id=c.id),'other') ELSE c.type END)
    ORDER BY c.name,r.required DESC,r.title`).bind(...scope).all() : {results:[]};
  const checklistSummaries = scope.length ? await auth.db.prepare(`SELECT * FROM onboarding_checklists WHERE company_id IN (${scope.map(()=>"?").join(",")}) ORDER BY updated_at DESC`).bind(...scope).all() : {results:[]};
  const communications = scope.length ? await auth.db.prepare(`SELECT id,company_id,author_name,body,created_at FROM communications WHERE company_id IN (${scope.map(()=>"?").join(",")}) ORDER BY created_at DESC LIMIT 60`).bind(...scope).all() : {results:[]};
  return Response.json({user:{displayName:auth.user.displayName,email:auth.user.email},member,scope,companies:companies.results,members:members.results,documents:docs.results,credentialingIntakes:credentialingIntakes.results,checklists:checklists.results,checklistSummaries:checklistSummaries.results,communications:communications.results});
}
