"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { extractApiError } from "@/lib/utils";
import { api } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/context";
import type { AppConfig } from "@/types";

const basicSchema = z.object({
  app_name: z.string().min(1),
  default_language: z.string(),
  default_theme: z.string(),
});

const behaviorSchema = z.object({
  auto_close_after_days: z.coerce.number().int().min(1).optional(),
  log_retention_days: z.coerce.number().int().min(1).optional(),
});

const integrationsSchema = z.object({
  oci_tenancy_ocid: z.string().optional(),
  oci_user_ocid: z.string().optional(),
  oci_key_fingerprint: z.string().optional(),
  oci_private_key: z.string().optional(),
  oci_region: z.string().optional(),
  oci_compartment_ocid: z.string().optional(),
  oci_bucket_name: z.string().optional(),
  oci_bucket_namespace: z.string().optional(),
  oci_sender_email: z.string().optional(),
});

export default function SettingsPage() {
  const { toast } = useToast();
  const t = useT();

  const [loaded, setLoaded] = useState(false);
  const [allowSignup, setAllowSignup] = useState(false);
  const [notifyComment, setNotifyComment] = useState(true);
  const [notifyStatus, setNotifyStatus] = useState(true);
  const [notifyAssignment, setNotifyAssignment] = useState(true);
  const [autoClose, setAutoClose] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [priority, setPriority] = useState<string | null>("medium");

  const basic = useForm({ resolver: zodResolver(basicSchema), defaultValues: { app_name: "", default_language: "en", default_theme: "light" } });
  const behavior = useForm({ resolver: zodResolver(behaviorSchema), defaultValues: { auto_close_after_days: 7, log_retention_days: 30 } });
  const integrations = useForm({ resolver: zodResolver(integrationsSchema) });

  useEffect(() => {
    api.get<AppConfig>("/settings/app/")
      .then((cfg) => {
        basic.reset({
          app_name: cfg.app_name ?? "",
          default_language: cfg.default_language ?? "en",
          default_theme: cfg.default_theme ?? "light",
        });
        setAllowSignup(cfg.allow_customer_signup ?? false);
        setNotifyComment(cfg.notify_on_comment ?? true);
        setNotifyStatus(cfg.notify_on_status_change ?? true);
        setNotifyAssignment(cfg.notify_on_assignment ?? true);
        setAutoClose(cfg.auto_close_inactive_tickets ?? false);
        setPriority(cfg.default_ticket_priority ?? "medium");
        behavior.reset({
          auto_close_after_days: cfg.auto_close_after_days ?? 7,
          log_retention_days: cfg.log_retention_days ?? 30,
        });
        setEmailEnabled(cfg.email_notifications_enabled ?? false);
        integrations.reset({
          oci_tenancy_ocid: cfg.oci_tenancy_ocid ?? "",
          oci_user_ocid: cfg.oci_user_ocid ?? "",
          oci_key_fingerprint: cfg.oci_key_fingerprint ?? "",
          oci_region: cfg.oci_region ?? "",
          oci_compartment_ocid: cfg.oci_compartment_ocid ?? "",
          oci_bucket_name: cfg.oci_bucket_name ?? "",
          oci_bucket_namespace: cfg.oci_bucket_namespace ?? "",
          oci_sender_email: cfg.oci_sender_email ?? "",
        });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const saveBasic = async (data: z.infer<typeof basicSchema>) => {
    try {
      await api.patch("/settings/app/", data);
      toast("success", "Basic settings saved");
    } catch (e) {
      toast("error", extractApiError(e));
    }
  };

  const saveBehavior = async (data: z.infer<typeof behaviorSchema>) => {
    try {
      await api.patch("/settings/app/", {
        allow_customer_signup: allowSignup,
        notify_on_comment: notifyComment,
        notify_on_status_change: notifyStatus,
        notify_on_assignment: notifyAssignment,
        auto_close_inactive_tickets: autoClose,
        auto_close_after_days: data.auto_close_after_days,
        default_ticket_priority: priority,
        log_retention_days: data.log_retention_days,
      });
      toast("success", "Behavior settings saved");
    } catch (e) {
      toast("error", extractApiError(e));
    }
  };

  const saveIntegrations = async (data: z.infer<typeof integrationsSchema>) => {
    try {
      const payload = Object.fromEntries(
        Object.entries({ ...data, email_notifications_enabled: emailEnabled }).filter(([, v]) => v !== "" && v !== undefined)
      );
      await api.patch("/settings/app/", payload);
      toast("success", "Integration settings saved");
    } catch (e) {
      toast("error", extractApiError(e));
    }
  };

  const langOptions = [
    { value: "en", label: t("lang_en") },
    { value: "pt", label: t("lang_pt") },
  ];
  const themeOptions = [
    { value: "light", label: t("settings_theme_light") },
    { value: "dark",  label: t("settings_theme_dark") },
  ];
  const priorityOptions = [
    { value: "high",   label: t("priority_high") },
    { value: "medium", label: t("priority_medium") },
    { value: "low",    label: t("priority_low") },
  ];

  if (!loaded) {
    return (
      <div className="mx-auto max-w-2xl flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t("settings_title")}</h2>
          <p className="text-sm text-slate-500">{t("settings_subtitle")}</p>
        </div>
        <p className="text-sm text-slate-400">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t("settings_title")}</h2>
        <p className="text-sm text-slate-500">{t("settings_subtitle")}</p>
      </div>

      {/* Basic */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">{t("settings_basic_title")}</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={basic.handleSubmit(saveBasic)} className="flex flex-col gap-4">
            <Input label={t("settings_app_name")} error={basic.formState.errors.app_name?.message} {...basic.register("app_name")} />
            <div className="grid grid-cols-2 gap-4">
              <Controller name="default_language" control={basic.control} render={({ field }) => (
                <AppSelect label={t("settings_default_language")} value={field.value} onValueChange={(v) => field.onChange(v ?? "en")} options={langOptions} />
              )} />
              <Controller name="default_theme" control={basic.control} render={({ field }) => (
                <AppSelect label={t("settings_default_theme")} value={field.value} onValueChange={(v) => field.onChange(v ?? "light")} options={themeOptions} />
              )} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={basic.formState.isSubmitting}>{t("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Behavior */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">{t("settings_behavior_title")}</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={behavior.handleSubmit(saveBehavior)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Toggle checked={allowSignup} onCheckedChange={setAllowSignup} label={t("settings_allow_signup")} description={t("settings_allow_signup_desc")} />
              <Toggle checked={notifyComment} onCheckedChange={setNotifyComment} label={t("settings_notify_comment")} />
              <Toggle checked={notifyStatus} onCheckedChange={setNotifyStatus} label={t("settings_notify_status")} />
              <Toggle checked={notifyAssignment} onCheckedChange={setNotifyAssignment} label={t("settings_notify_assignment")} />
              <Toggle checked={autoClose} onCheckedChange={setAutoClose} label={t("settings_auto_close")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {autoClose && (
                <Input label={t("settings_auto_close_days")} type="number" min={1} {...behavior.register("auto_close_after_days")} />
              )}
              <AppSelect
                label={t("settings_default_priority")}
                value={priority}
                onValueChange={setPriority}
                options={priorityOptions}
              />
              <Input label={t("settings_log_retention")} type="number" min={1} {...behavior.register("log_retention_days")} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={behavior.formState.isSubmitting}>{t("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Email & Integrations */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">{t("settings_integrations_title")}</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={integrations.handleSubmit(saveIntegrations)} className="flex flex-col gap-4">
            <Toggle checked={emailEnabled} onCheckedChange={setEmailEnabled} label={t("settings_email_enabled")} description={t("settings_email_desc")} />
            {emailEnabled && (
              <Input label={t("settings_sender_email")} type="email" {...integrations.register("oci_sender_email")} />
            )}
            <details className="group rounded-lg border border-slate-200">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 list-none flex items-center justify-between">
                {t("settings_oci_title")}
                <span className="text-slate-400">▾</span>
              </summary>
              <div className="grid grid-cols-2 gap-4 px-4 pb-4 pt-2">
                <Input label={t("settings_oci_tenancy")} {...integrations.register("oci_tenancy_ocid")} />
                <Input label={t("settings_oci_user")} {...integrations.register("oci_user_ocid")} />
                <Input label={t("settings_oci_fingerprint")} {...integrations.register("oci_key_fingerprint")} />
                <Input label={t("settings_oci_region")} {...integrations.register("oci_region")} />
                <Input label={t("settings_oci_compartment")} {...integrations.register("oci_compartment_ocid")} />
                <Input label={t("settings_oci_bucket")} {...integrations.register("oci_bucket_name")} />
                <Input label={t("settings_oci_namespace")} {...integrations.register("oci_bucket_namespace")} />
                <div className="col-span-2">
                  <Input label={t("settings_oci_key")} type="password" placeholder={t("settings_oci_key_placeholder")} {...integrations.register("oci_private_key")} />
                </div>
              </div>
            </details>
            <div className="flex justify-end">
              <Button type="submit" loading={integrations.formState.isSubmitting}>{t("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
