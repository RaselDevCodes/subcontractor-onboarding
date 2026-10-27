import { env } from "cloudflare:workers";
import { getChatGPTUser, type ChatGPTUser } from "../chatgpt-auth";

export type Member = { id: string; email: string; user_id: string | null; role: "admin" | "prime" | "vendor" | "healthcare_client"; company_id: string; status: string };
export async function identity() {
  const user = await getChatGPTUser();
  if (!user) return { response: Response.json({ error: "Sign in required" }, { status: 401 }) as Response };
  if (!env.DB || !env.BUCKET) return { response: Response.json({ error: "Storage is not configured" }, { status: 503 }) as Response };
  return { user, db: env.DB, bucket: env.BUCKET };
}

export async function memberFor(db: D1Database, user: ChatGPTUser): Promise<Member | null> {
  // First authenticated user bootstraps the TNB admin. The Site is private and owner-only during setup.
  await db.prepare("INSERT OR IGNORE INTO companies (id,name,type,status,created_at) VALUES ('tnb','TNB Business Solutions','admin','active',?)").bind(new Date().toISOString()).run();
  const existing = await db.prepare("SELECT id,email,user_id,role,company_id,status FROM memberships WHERE user_id=? OR (lower(email)=lower(?) AND status='pending') LIMIT 1").bind(user.userId,user.email).first<Member>();
  if (existing?.status === "pending") {
    await db.prepare("UPDATE memberships SET user_id=?,status='active' WHERE id=?").bind(user.userId,existing.id).run();
    return { ...existing, user_id: user.userId, status: "active" };
  }
  if (existing) return existing.status === "active" ? existing : null;
  const count = await db.prepare("SELECT COUNT(*) AS total FROM memberships").first<{total:number}>();
  if ((count?.total ?? 0) > 0) return null;
  const id = crypto.randomUUID();
  await db.prepare("INSERT OR IGNORE INTO memberships (id,email,user_id,role,company_id,status,created_at) VALUES (?,?,?,'admin','tnb','active',?)").bind(id,user.email,user.userId,new Date().toISOString()).run();
  return db.prepare("SELECT id,email,user_id,role,company_id,status FROM memberships WHERE user_id=?").bind(user.userId).first<Member>();
}

export async function companyScope(db: D1Database, member: Member): Promise<string[]> {
  if (member.role === "admin") {
    const rows = await db.prepare("SELECT id FROM companies WHERE status='active'").all<{id:string}>();
    return rows.results.map((row) => row.id);
  }
  if (member.role === "prime") {
    const linked = await db.prepare("SELECT vendor_company_id AS id FROM prime_vendor_links WHERE prime_company_id=?").bind(member.company_id).all<{id:string}>();
    return [member.company_id,...linked.results.map((row) => row.id)];
  }
  return [member.company_id];
}

export async function audit(db: D1Database, actor: string, action: string, target: string) {
  await db.prepare("INSERT INTO audit_events (id,actor_id,action,target_id,created_at) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),actor,action,target,new Date().toISOString()).run();
}

export function jsonError(error: string, status = 400) { return Response.json({error},{status}); }
