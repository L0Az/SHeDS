import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { serverApi } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const SETUP_PATH = "/settings/setup";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  let configStatus: boolean | null = null;
  try {
    const { config_status } = await serverApi.get<{ config_status: boolean }>("/settings/verify/");
    configStatus = config_status;
  } catch {
    // verify call failed — treat as unconfigured so the user is sent to setup
    configStatus = false;
  }

  if (configStatus === false && !pathname.startsWith(SETUP_PATH)) {
    redirect(SETUP_PATH);
  }
  if (configStatus === true && pathname.startsWith(SETUP_PATH)) {
    redirect("/dashboard");
  }

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
