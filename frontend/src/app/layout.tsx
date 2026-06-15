import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { getSession } from "@/lib/auth";
import { getCachedAppConfig, getCachedMe } from "@/lib/server-cache";

export const metadata: Metadata = {
  title: "SHeDS — Helpdesk",
  description: "Simple Helpdesk System",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  let lang = "en";
  let theme = "light";

  if (session) {
    const [me, config] = await Promise.all([getCachedMe(), getCachedAppConfig()]);
    lang = me?.language ?? "en";
    theme = config?.default_theme ?? "light";
  }

  return (
    <html lang={lang} data-theme={theme} className="h-full antialiased">
      <body className="h-full bg-slate-50">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
