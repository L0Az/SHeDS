"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Save, Upload, Paperclip, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { AppSelect } from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { AppDialog } from "@/components/ui/dialog";
import { formatDateTime, formatBytes, extractApiError } from "@/lib/utils";
import { api } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import type { Ticket, Department, Category, TicketAttachment, TicketComment, PaginatedResponse } from "@/types";

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

function CommentsSection({ ticketId, role }: { ticketId: number; role: string }) {
  const { toast } = useToast();
  const canManage = role === "admin" || role === "technician";
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [body, setBody] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<PaginatedResponse<TicketComment>>(`/helpdesk/tickets/${ticketId}/comments/`, { limit: 200 })
      .then((res) => setComments(res.results))
      .catch(() => {});
  }, [ticketId]);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const comment = await api.post<TicketComment>(`/helpdesk/tickets/${ticketId}/comments/`, {
        body: body.trim(),
        is_private: isPrivate,
      });
      setComments((prev) => [...prev, comment]);
      setBody("");
      setIsPrivate(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      toast("error", extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {comments.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className={`rounded-lg border px-4 py-3 text-sm ${
                c.is_private
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-100 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-slate-800">{c.author_name}</span>
                <div className="flex items-center gap-2">
                  {c.is_private && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Lock className="h-3 w-3" /> Private
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{formatDateTime(c.created_at)}</span>
                </div>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
          <div ref={bottomRef} />
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Write a comment…"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <div className="flex items-center justify-between gap-2">
          {canManage && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded"
              />
              Private (internal only)
            </label>
          )}
          {!canManage && <span />}
          <Button type="button" size="sm" loading={submitting} disabled={!body.trim()} onClick={handleSubmit}>
            <Send className="h-4 w-4" /> Post
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TicketDetailClient({ ticket, departments, categories, role }: TicketDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canManage = role === "admin" || role === "technician";

  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<PaginatedResponse<TicketAttachment>>(`/helpdesk/tickets/${ticket.id}/attachments/`, { limit: 100 })
      .then((res) => setAttachments(res.results))
      .catch(() => {});
  }, [ticket.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Step 1: get a pre-signed upload URL from the backend
      const { upload_url, file_url } = await api.post<{ upload_url: string; file_url: string }>(
        `/helpdesk/tickets/${ticket.id}/attachments/presign/`,
        { filename: file.name },
      );

      // Step 2: PUT the file directly to OCI — no Django in the middle
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);

      // Step 3: register the attachment in the backend with the final URL
      const att = await api.post<TicketAttachment>(
        `/helpdesk/tickets/${ticket.id}/attachments/`,
        {
          file_url,
          original_filename: file.name,
          content_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        },
      );
      setAttachments((prev) => [...prev, att]);
      toast("success", "File uploaded");
    } catch (err) {
      toast("error", extractApiError(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await api.delete(`/helpdesk/tickets/${ticket.id}/attachments/${attachmentId}/`);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast("success", "Attachment removed");
    } catch (err) {
      toast("error", extractApiError(err));
    }
  };

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
            <h2 className="mb-4 font-semibold text-slate-800">Comments</h2>
            <CommentsSection ticketId={ticket.id} role={role} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Attachments</h2>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> Upload
              </Button>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
            {attachments.length === 0 ? (
              <p className="text-sm text-slate-500">No attachments yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                      <a
                        href={a.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-slate-800 truncate hover:underline"
                      >
                        {a.original_filename}
                      </a>
                      <span className="text-xs text-slate-400 shrink-0">{formatBytes(a.size_bytes)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(a.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                      aria-label="Delete attachment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
