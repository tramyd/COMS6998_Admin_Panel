import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { checkSuperadmin, getHelloWorldUrl } from "@/lib/superadmin";

export const instant = false;

const navigation = [
  { href: "/dashboard", label: "Overview" },
  { href: "/profiles", label: "Profiles" },
  { href: "/comments", label: "AI comments" },
  { href: "/feedback", label: "Ratings & votes" },
];

export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error?.name === "AuthSessionMissingError") redirect("/");
  if (error) {
    console.error("Failed to verify admin session:", error);
    return <p className="page-error" role="alert">Could not verify your session. Please sign in again.</p>;
  }
  if (!user) redirect("/");
  const access = await checkSuperadmin(supabase, user.id);
  if (access.error) {
    console.error("Failed to verify superadmin access:", access.error);
    return <p className="page-error" role="alert">Could not verify admin permissions. Please try again.</p>;
  }
  if (!access.isSuperadmin) {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) console.error("Failed to sign out unauthorized admin user:", signOutError);
    redirect("/?error=unauthorized");
  }

  return (
    <div className="app-shell">
      <header className="admin-header">
        <Link className="admin-title" href="/dashboard">AI Meme Caption Generator Admin Panel</Link>
        <nav className="admin-nav" aria-label="Admin navigation">
          {navigation.map((item) => <Link className="header-button" href={item.href} key={item.href}>{item.label}</Link>)}
          <a className="header-button" href={getHelloWorldUrl()}>Back to Hello World</a>
          <form action={signOut}><button className="header-button" type="submit">Sign out</button></form>
        </nav>
      </header>
      <main className="admin-main"><div className="page-content">{children}</div></main>
    </div>
  );
}
