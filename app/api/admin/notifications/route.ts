import { identity, memberFor, jsonError } from "../../_lib";
import { retryEmail } from "../../../../lib/email";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth=await identity();if("response" in auth)return auth.response;
  const member=await memberFor(auth.db,auth.user);if(member?.role!=="admin")return jsonError("Admin access required.",403);
  const rows=await auth.db.prepare("SELECT n.id,n.company_id,c.name AS company_name,n.recipient,n.subject,n.status,n.attempts,n.last_error,n.created_at,n.sent_at FROM notification_outbox n LEFT JOIN companies c ON c.id=n.company_id ORDER BY n.created_at DESC LIMIT 100").all();
  return Response.json({notifications:rows.results});
}

export async function POST(request:Request) {
  const auth=await identity();if("response" in auth)return auth.response;
  const member=await memberFor(auth.db,auth.user);if(member?.role!=="admin")return jsonError("Admin access required.",403);
  const body=await request.json().catch(()=>({})) as {id?:string};
  if(!body.id)return jsonError("Choose a notification to retry.");
  const result=await retryEmail(auth.db,body.id);
  if(!result.found)return jsonError("Queued email not found or already sent.",404);
  return Response.json({id:body.id,status:result.status});
}
