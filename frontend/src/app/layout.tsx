import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "SHeDS — Helpdesk",
  description: "Simple Helpdesk System",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-slate-50">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
