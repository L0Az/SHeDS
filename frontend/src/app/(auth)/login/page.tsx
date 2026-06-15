import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
