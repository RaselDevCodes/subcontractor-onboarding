import { identity, memberFor, audit, jsonError } from "../../_lib";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const auth=await identity(); if("response" in auth) return auth.response;
  const member=await memberFor(auth.db,auth.user); if(member?.role!=="admin") return jsonError("Admin access required",403);
  const body=await request.json() as {primeCompanyId?:string;vendorCompanyId?:string};
  if(!body.primeCompanyId||!body.vendorCompanyId||body.primeCompanyId===body.vendorCompanyId) return jsonError("Choose one prime contractor and one vendor.");
  const [prime,vendor]=await Promise.all([
    auth.db.prepare("SELECT id FROM companies WHERE id=? AND type='prime' AND status='active'").bind(body.primeCompanyId).first(),
    auth.db.prepare("SELECT id FROM companies WHERE id=? AND type='vendor' AND status='active'").bind(body.vendorCompanyId).first(),
  ]);
  if(!prime||!vendor) return jsonError("The selected companies do not match the required types.");
  const id=crypto.randomUUID();
  await auth.db.prepare("INSERT OR IGNORE INTO prime_vendor_links(id,prime_company_id,vendor_company_id) VALUES(?,?,?)").bind(id,body.primeCompanyId,body.vendorCompanyId).run();
  await audit(auth.db,auth.user.userId,"vendor_linked",body.vendorCompanyId); return Response.json({ok:true});
}
