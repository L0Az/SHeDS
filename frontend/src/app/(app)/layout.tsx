import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "SHeDS";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={session.role} appName={appName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar name={session.name} role={session.role} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
