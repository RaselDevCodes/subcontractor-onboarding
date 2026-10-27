import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from "./chatgpt-auth";
import Workspace from "./workspace";

export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getChatGPTUser();
  if (!user) return <main className="signin"><section className="signin-card"><div className="brand-block"><img className="brand-logo" src="/tnb-logo.png" alt="TNB Business Solutions"/><span className="tagline-rule"/><p className="tagline">From Strategy to Implementation</p></div><p className="eyebrow">TNB BUSINESS SOLUTIONS</p><h1>Partner workspace</h1><p>Sign in to manage vendor records, compliance documents, project updates, or a healthcare credentialing request.</p><a className="button primary" href={chatGPTSignInPath("/")} target="_top">Sign in with ChatGPT</a><small>Access is limited to people invited to this workspace.</small></section></main>;
  return <Workspace user={{name:user.displayName,email:user.email,signOut:chatGPTSignOutPath("/")}} />;
}
