"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Headset } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractApiError } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

export function RegisterForm() {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState("");

  const schema = z.object({
    name: z.string().min(1, t("name_required")),
    email: z.string().email(t("email_invalid")),
    password: z.string().min(8, t("password_min_length")),
    confirm_password: z.string().min(1, t("confirm_password_required")),
  }).refine((d) => d.password === d.confirm_password, {
    message: t("password_mismatch"),
    path: ["confirm_password"],
  });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.detail ?? extractApiError(body));
      return;
    }
    router.push("/tickets");
    router.refresh();
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
          <Headset className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">SHeDS</h1>
        <p className="mt-1 text-sm text-slate-500">{t("register_subtitle")}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label={t("register_name")}
            type="text"
            placeholder="Your name"
            autoComplete="name"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label={t("email")}
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label={t("password")}
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label={t("register_confirm_password")}
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.confirm_password?.message}
            {...register("confirm_password")}
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200">
              {error}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full mt-1">
            {t("register_submit")}
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        {t("register_have_account")}{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          {t("register_sign_in")}
        </Link>
      </p>
    </div>
  );
}
