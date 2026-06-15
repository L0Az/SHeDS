import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";

const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? "http://localhost:9000";

export default async function RegisterPage() {
  let allowSignup = false;
  try {
    const res = await fetch(`${DJANGO_URL}/v1/settings/public/`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json() as { allow_customer_signup?: boolean };
      allowSignup = data.allow_customer_signup ?? false;
    }
  } catch {
    // Django unreachable
  }

  if (!allowSignup) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <RegisterForm />
    </div>
  );
}
