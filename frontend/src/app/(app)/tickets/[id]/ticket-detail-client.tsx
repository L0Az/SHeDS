"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { AppSelect } from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { AppDialog } from "@/components/ui/dialog";
import { formatDateTime, extractApiError } from "@/lib/utils";
import { api } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import type { Ticket, Department, Category } from "@/types";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string(),
  priority: z.string(),
  department: z.string(),
  category: z.string(),
  assigned_to: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface TicketDetailClientProps {
  ticket: Ticket;
  departments: Department[];
  categories: Category[];
  role: string;
}

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_development", label: "In Development" },
  { value: "closed", label: "Closed" },
];
const priorityOptions = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function TicketDetailClient({ ticket, departments, categories, role }: TicketDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canManage = role === "admin" || role === "technician";

  const { register, handleSubmit, control, watch, formState: { isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: ticket.title,
      description: ticket.description ?? "",
      status: ticket.status,
      priority: ticket.priority,
      department: String(ticket.department),
      category: String(ticket.category),
      assigned_to: ticket.assigned_to ? String(ticket.assigned_to) : "",
    },
  });

  const selectedDept = watch("department");
  const filteredCats = selectedDept
    ? categories.filter((c) => String(c.department) === selectedDept)
    : categories;

  const onSave = async (data: FormData) => {
    try {
      await api.patch(`/helpdesk/tickets/${ticket.id}/`, {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        department: Number(data.department),
        category: Number(data.category),
        assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
      });
      toast("success", "Ticket updated");
      router.refresh();
    } catch (e) {
      toast("error", extractApiError(e));
    }
  };

  const onDelete = async () => {
    try {
      await api.delete(`/helpdesk/tickets/${ticket.id}/`);
      toast("success", "Ticket deleted");
      router.push("/tickets");
    } catch (e) {
      toast("error", extractApiError(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSave)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-slate-400">#{ticket.id}</span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
        <div className="flex items-center gap-2">
          {canManage && isDirty && (
            <Button type="submit" size="sm" loading={isSubmitting}>
              <Save className="h-4 w-4" /> Save
            </Button>
          )}
          {canManage && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold text-slate-800">Details</h2>
            <div className="flex flex-col gap-4">
              {canManage ? (
                <Input label="Title" error={undefined} {...register("title")} />
              ) : (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Title</p>
                  <p className="text-slate-900 font-medium">{ticket.title}</p>
                </div>
              )}
              {canManage ? (
                <Textarea label="Description" rows={6} {...register("description")} />
              ) : (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{ticket.description ?? "—"}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-2 font-semibold text-slate-800">Comments</h2>
            <p className="text-sm text-slate-500 italic">Comments coming soon.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-2 font-semibold text-slate-800">Attachments</h2>
            <p className="text-sm text-slate-500 italic">Attachments coming soon.</p>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-700 uppercase tracking-wide">Properties</h3>
            <div className="flex flex-col gap-4">
              {canManage ? (
                <Controller name="status" control={control} render={({ field }) => (
                  <AppSelect label="Status" value={field.value} onValueChange={(v) => field.onChange(v ?? "open")} options={statusOptions} />
                )} />
              ) : (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
                  <StatusBadge status={ticket.status} />
                </div>
              )}

              {canManage ? (
                <Controller name="priority" control={control} render={({ field }) => (
                  <AppSelect label="Priority" value={field.value} onValueChange={(v) => field.onChange(v ?? "medium")} options={priorityOptions} />
                )} />
              ) : (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Priority</p>
                  <PriorityBadge priority={ticket.priority} />
                </div>
              )}

              {canManage && (
                <Controller name="department" control={control} render={({ field }) => (
                  <AppSelect
                    label="Department"
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? "")}
                    options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
                  />
                )} />
              )}

              {canManage && (
                <Controller name="category" control={control} render={({ field }) => (
                  <AppSelect
                    label="Category"
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? "")}
                    options={filteredCats.map((c) => ({ value: String(c.id), label: c.name }))}
                  />
                )} />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wide">Timestamps</h3>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-700">{formatDateTime(ticket.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Updated</dt>
                <dd className="text-slate-700">{formatDateTime(ticket.updated_at)}</dd>
              </div>
              {ticket.closed_at && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Closed</dt>
                  <dd className="text-slate-700">{formatDateTime(ticket.closed_at)}</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>

      <AppDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete ticket?"
        description="This will soft-delete the ticket. This action cannot be undone from the UI."
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={onDelete}>Delete</Button>
        </div>
      </AppDialog>
    </form>
  );
}
