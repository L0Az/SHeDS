"use client";

import { useState } from "react";
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
  oci_sender_email: z.string().optional(),
});

export default function SettingsPage() {
  const { toast } = useToast();
  const [priority, setPriority] = useState<string | null>("medium");
  const [allowSignup, setAllowSignup] = useState(false);
  const [notifyComment, setNotifyComment] = useState(true);
  const [notifyStatus, setNotifyStatus] = useState(true);
  const [notifyAssignment, setNotifyAssignment] = useState(true);
  const [autoClose, setAutoClose] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);

  const behavior = useForm({ resolver: zodResolver(step2Schema), defaultValues: { auto_close_after_days: 7, log_retention_days: 30 } });
  const integrations = useForm({ resolver: zodResolver(step3Schema) });

  const saveBehavior = async (data: z.infer<typeof step2Schema>) => {
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
      toast("success", "Behavior settings saved");
    } catch (e) {
      toast("error", extractApiError(e));
    }
  };

  const saveIntegrations = async (data: z.infer<typeof step3Schema>) => {
    try {
      const payload = Object.fromEntries(
        Object.entries({ ...data, email_notifications_enabled: emailEnabled }).filter(([, v]) => v !== "" && v !== undefined)
      );
      await api.patch("/settings/final/step/", payload);
      toast("success", "Integration settings saved");
    } catch (e) {
      toast("error", extractApiError(e));
    }
  };

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500">Configure your helpdesk application</p>
      </div>

      {/* Ticket Behavior */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">Ticket Behavior</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={behavior.handleSubmit(saveBehavior)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Toggle checked={allowSignup} onCheckedChange={setAllowSignup} label="Allow customer self-signup" description="Customers can register their own accounts" />
              <Toggle checked={notifyComment} onCheckedChange={setNotifyComment} label="Notify on new comment" />
              <Toggle checked={notifyStatus} onCheckedChange={setNotifyStatus} label="Notify on status change" />
              <Toggle checked={notifyAssignment} onCheckedChange={setNotifyAssignment} label="Notify on ticket assignment" />
              <Toggle checked={autoClose} onCheckedChange={setAutoClose} label="Auto-close inactive tickets" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {autoClose && (
                <Input label="Auto-close after (days)" type="number" min={1} {...behavior.register("auto_close_after_days")} />
              )}
              <AppSelect
                label="Default ticket priority"
                value={priority}
                onValueChange={setPriority}
                options={[
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
              />
              <Input label="Log retention (days)" type="number" min={1} {...behavior.register("log_retention_days")} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={behavior.formState.isSubmitting}>Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Email & Integrations */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">Email & Integrations</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={integrations.handleSubmit(saveIntegrations)} className="flex flex-col gap-4">
            <Toggle checked={emailEnabled} onCheckedChange={setEmailEnabled} label="Enable email notifications" description="Send emails via OCI Email Delivery" />

            {emailEnabled && (
              <Input label="Sender Email" type="email" {...integrations.register("oci_sender_email")} />
            )}

            <details className="group rounded-lg border border-slate-200">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 list-none flex items-center justify-between">
                Oracle Cloud (OCI) Configuration
                <span className="text-slate-400">▾</span>
              </summary>
              <div className="grid grid-cols-2 gap-4 px-4 pb-4 pt-2">
                <Input label="Tenancy OCID" {...integrations.register("oci_tenancy_ocid")} />
                <Input label="User OCID" {...integrations.register("oci_user_ocid")} />
                <Input label="Key Fingerprint" {...integrations.register("oci_key_fingerprint")} />
                <Input label="Region" {...integrations.register("oci_region")} />
                <Input label="Compartment OCID" {...integrations.register("oci_compartment_ocid")} />
                <Input label="Bucket Name" {...integrations.register("oci_bucket_name")} />
                <Input label="Bucket Namespace" {...integrations.register("oci_bucket_namespace")} />
                <div className="col-span-2">
                  <Input label="Private Key" type="password" placeholder="Paste key to update (never shown)" {...integrations.register("oci_private_key")} />
                </div>
              </div>
            </details>

            <div className="flex justify-end">
              <Button type="submit" loading={integrations.formState.isSubmitting}>Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
