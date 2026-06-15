"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { cn, extractApiError } from "@/lib/utils";
import { api } from "@/lib/client-api";

const STEPS = ["Basic Info", "Behavior", "Integrations"] as const;

const step1Schema = z.object({
  app_name: z.string().min(1, "App name is required"),
});

const step2Schema = z.object({
  auto_close_after_days: z.coerce.number().int().min(1).optional(),
  log_retention_days: z.coerce.number().int().min(1).optional(),
});

const step3Schema = z.object({
  oci_tenancy_ocid: z.string().optional(),
  oci_user_ocid: z.string().optional(),
  oci_key_fingerprint: z.string().optional(),
  oci_private_key: z.string().optional(),
  oci_region: z.string().optional(),
  oci_compartment_ocid: z.string().optional(),
  oci_bucket_name: z.string().optional(),
  oci_bucket_namespace: z.string().optional(),
  oci_sender_email: z.string().email().optional().or(z.literal("")),
});

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  const [language, setLanguage] = useState<string | null>("en");
  const [theme, setTheme] = useState<string | null>("light");
  const [priority, setPriority] = useState<string | null>("medium");

  const [allowSignup, setAllowSignup] = useState(false);
  const [notifyComment, setNotifyComment] = useState(true);
  const [notifyStatus, setNotifyStatus] = useState(true);
  const [notifyAssignment, setNotifyAssignment] = useState(true);
  const [autoClose, setAutoClose] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);

  const form1 = useForm({ resolver: zodResolver(step1Schema), defaultValues: { app_name: "SHeDS" } });
  const form2 = useForm({ resolver: zodResolver(step2Schema), defaultValues: { auto_close_after_days: 7, log_retention_days: 30 } });
  const form3 = useForm({ resolver: zodResolver(step3Schema) });

  const submitStep1 = async (data: z.infer<typeof step1Schema>) => {
    setError("");
    try {
      const fd = new FormData();
      fd.append("app_name", data.app_name);
      if (language) fd.append("default_language", language);
      if (theme) fd.append("default_theme", theme);
      await fetch("/api/v1/settings/first/step/", { method: "POST", body: fd });
      setStep(1);
    } catch (e) {
      setError(extractApiError(e));
    }
  };

  const submitStep2 = async (data: z.infer<typeof step2Schema>) => {
    setError("");
    try {
      await api.patch("/settings/second/step/", {
        allow_customer_signup: allowSignup,
        notify_on_comment: notifyComment,
        notify_on_status_change: notifyStatus,
        notify_on_assignment: notifyAssignment,
        auto_close_inactive_tickets: autoClose,
        auto_close_after_days: data.auto_close_after_days,
        default_ticket_priority: priority,
        log_retention_days: data.log_retention_days,
      });
      setStep(2);
    } catch (e) {
      setError(extractApiError(e));
    }
  };

  const submitStep3 = async (data: z.infer<typeof step3Schema>) => {
    setError("");
    try {
      const payload = Object.fromEntries(
        Object.entries({ ...data, email_notifications_enabled: emailEnabled }).filter(([, v]) => v !== "" && v !== undefined)
      );
      await api.patch("/settings/final/step/", payload);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(extractApiError(e));
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Setup Wizard</h1>
        <p className="mt-1 text-sm text-slate-500">Configure your helpdesk in three steps</p>
      </div>

      <div className="mb-6 flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                i < step && "bg-emerald-500 text-white",
                i === step && "bg-indigo-600 text-white",
                i > step && "bg-slate-200 text-slate-500"
              )}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-sm font-medium", i === step ? "text-slate-900" : "text-slate-400")}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="ml-2 h-px w-12 bg-slate-200" />}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === 0 && (
          <form onSubmit={form1.handleSubmit(submitStep1)} className="flex flex-col gap-4">
            <h2 className="font-semibold text-slate-800">Basic Configuration</h2>
            <Input
              label="Application Name"
              placeholder="SHeDS"
              error={form1.formState.errors.app_name?.message}
              {...form1.register("app_name")}
            />
            <div className="grid grid-cols-2 gap-4">
              <AppSelect
                label="Default Language"
                value={language}
                onValueChange={setLanguage}
                options={[{ value: "en", label: "English" }, { value: "pt", label: "Português" }]}
              />
              <AppSelect
                label="Default Theme"
                value={theme}
                onValueChange={setTheme}
                options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end">
              <Button type="submit" loading={form1.formState.isSubmitting}>Next →</Button>
            </div>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={form2.handleSubmit(submitStep2)} className="flex flex-col gap-4">
            <h2 className="font-semibold text-slate-800">Notifications & Ticket Behavior</h2>
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4">
              <Toggle checked={allowSignup} onCheckedChange={setAllowSignup} label="Allow customer self-signup" description="Customers can register their own accounts" />
              <Toggle checked={notifyComment} onCheckedChange={setNotifyComment} label="Notify on comment" />
              <Toggle checked={notifyStatus} onCheckedChange={setNotifyStatus} label="Notify on status change" />
              <Toggle checked={notifyAssignment} onCheckedChange={setNotifyAssignment} label="Notify on assignment" />
              <Toggle checked={autoClose} onCheckedChange={setAutoClose} label="Auto-close inactive tickets" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {autoClose && (
                <Input label="Auto-close after (days)" type="number" min={1} error={form2.formState.errors.auto_close_after_days?.message} {...form2.register("auto_close_after_days")} />
              )}
              <AppSelect
                label="Default Priority"
                value={priority}
                onValueChange={setPriority}
                options={[
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
              />
              <Input label="Log retention (days)" type="number" min={1} {...form2.register("log_retention_days")} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-between">
              <Button variant="secondary" type="button" onClick={() => setStep(0)}>← Back</Button>
              <Button type="submit" loading={form2.formState.isSubmitting}>Next →</Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={form3.handleSubmit(submitStep3)} className="flex flex-col gap-4">
            <h2 className="font-semibold text-slate-800">Integrations</h2>

            <div className="rounded-lg border border-slate-200 p-4">
              <Toggle checked={emailEnabled} onCheckedChange={setEmailEnabled} label="Enable email notifications" description="Send emails via OCI Email Delivery" />
            </div>

            {emailEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Sender Email" type="email" {...form3.register("oci_sender_email")} />
              </div>
            )}

            <details className="group rounded-lg border border-slate-200">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 list-none flex items-center justify-between">
                Oracle Cloud (OCI) Configuration
                <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="grid grid-cols-2 gap-4 px-4 pb-4">
                <Input label="Tenancy OCID" {...form3.register("oci_tenancy_ocid")} />
                <Input label="User OCID" {...form3.register("oci_user_ocid")} />
                <Input label="Key Fingerprint" {...form3.register("oci_key_fingerprint")} />
                <Input label="Region" {...form3.register("oci_region")} />
                <Input label="Compartment OCID" {...form3.register("oci_compartment_ocid")} />
                <Input label="Bucket Name" {...form3.register("oci_bucket_name")} />
                <Input label="Bucket Namespace" {...form3.register("oci_bucket_namespace")} />
                <div className="col-span-2">
                  <Input label="Private Key" type="password" placeholder="Paste private key…" {...form3.register("oci_private_key")} />
                </div>
              </div>
            </details>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-between">
              <Button variant="secondary" type="button" onClick={() => setStep(1)}>← Back</Button>
              <Button type="submit" loading={form3.formState.isSubmitting}>Finish setup</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
