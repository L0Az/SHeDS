import { LanguageProvider } from "@/lib/i18n/context";
import { getCachedPublicConfig } from "@/lib/server-cache";
import type { Language } from "@/types";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const publicConfig = await getCachedPublicConfig();
  const language: Language = (publicConfig?.default_language as Language) ?? "en";

  return (
    <LanguageProvider language={language}>
      {children}
    </LanguageProvider>
  );
}
