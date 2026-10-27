import { checklistTemplate } from "./checklists";
import { notifyCompanyAndTnb } from "./email";

type D1 = import("@cloudflare/workers-types").D1Database;

export async function ensureChecklist(db: D1, companyId: string, businessType: string) {
  const template = checklistTemplate(businessType);
  const now = new Date().toISOString();
  const checklist = await db.prepare("SELECT id FROM onboarding_checklists WHERE company_id=? AND business_type=?")
    .bind(companyId, businessType).first<{ id: string }>();
  let checklistId = checklist?.id;
  if (!checklistId) {
    checklistId = crypto.randomUUID();
    await db.prepare("INSERT OR IGNORE INTO onboarding_checklists(id,company_id,business_type,title,created_at,updated_at) VALUES(?,?,?,?,?,?)")
      .bind(checklistId, companyId, businessType, template.title, now, now).run();
    const existing = await db.prepare("SELECT id FROM onboarding_checklists WHERE company_id=? AND business_type=?")
      .bind(companyId, businessType).first<{ id: string }>();
    checklistId = existing?.id ?? checklistId;
  }
  for (const item of template.items) {
    await db.prepare("INSERT OR IGNORE INTO checklist_requirements(id,checklist_id,company_id,business_type,item_key,title,required,status,created_at,updated_at) VALUES(?,?,?,?,?,?,1,'not_received',?,?)")
      .bind(crypto.randomUUID(), checklistId, companyId, businessType, item.key, item.title, now, now).run();
  }
  return checklistId;
}

export async function evaluateSubmissionMilestone(db: D1, companyId: string, businessType: string) {
  const row = await db.prepare(`SELECT COUNT(*) AS total,
    SUM(CASE WHEN status IN ('pending_review','approved','not_applicable') THEN 1 ELSE 0 END) AS submitted
    FROM checklist_requirements WHERE company_id=? AND business_type=? AND required=1`)
    .bind(companyId, businessType).first<{ total: number; submitted: number }>();
  if (!row?.total || row.submitted !== row.total) return false;
  const changed = await db.prepare("UPDATE onboarding_checklists SET documents_submitted_at=?,updated_at=? WHERE company_id=? AND business_type=? AND documents_submitted_at IS NULL")
    .bind(new Date().toISOString(), new Date().toISOString(), companyId, businessType).run();
  if (changed.meta.changes) {
    await db.prepare("INSERT INTO communications(id,company_id,author_id,author_name,body,created_at) VALUES(?,?,'system','TNB Onboarding',?,?)")
      .bind(crypto.randomUUID(), companyId, "All required documents have been submitted. TNB can now complete its document review.", new Date().toISOString()).run();
    await notifyCompanyAndTnb(db, companyId, "TNB onboarding documents received", "All requested onboarding documents have been submitted. TNB can now review the business documents. This confirms receipt only; it does not mean the documents are approved.");
  }
  return Boolean(changed.meta.changes);
}

export async function checklistApproved(db: D1, companyId: string, businessType: string) {
  const row = await db.prepare(`SELECT COUNT(*) AS total,
    SUM(CASE WHEN status IN ('approved','not_applicable') THEN 1 ELSE 0 END) AS approved
    FROM checklist_requirements WHERE company_id=? AND business_type=? AND required=1`)
    .bind(companyId, businessType).first<{ total: number; approved: number }>();
  return Boolean(row?.total && row.approved === row.total);
}

/** The checklist business type currently shown for a company (matches the workspace query). */
export async function currentBusinessType(db: D1, companyId: string) {
  const company = await db.prepare("SELECT id,type FROM companies WHERE id=? AND status='active'").bind(companyId).first<{ id: string; type: string }>();
  if (!company || company.type === "admin") return null;
  if (company.type !== "healthcare_client") return company.type;
  const intake = await db.prepare("SELECT business_type FROM credentialing_intakes WHERE company_id=?").bind(companyId).first<{ business_type: string }>();
  return intake?.business_type ?? "other";
}

export async function postSystemMessage(db: D1, companyId: string, body: string) {
  await db.prepare("INSERT INTO communications(id,company_id,author_id,author_name,body,created_at) VALUES(?,?,'system','TNB Onboarding',?,?)")
    .bind(crypto.randomUUID(), companyId, body, new Date().toISOString()).run();
}
