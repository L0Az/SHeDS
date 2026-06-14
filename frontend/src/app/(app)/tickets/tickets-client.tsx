"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { AppDialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { AppSelect } from "@/components/ui/select";
import { formatDate, extractApiError } from "@/lib/utils";
import { api } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import type { Ticket, Department, Category, PaginatedResponse } from "@/types";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  category: z.string().min(1, "Category is required"),
  priority: z.string().optional(),
  status: z.string().optional(),
  assigned_to: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface TicketsClientProps {
  initialData: PaginatedResponse<Ticket>;
  departments: Department[];
  categories: Category[];
  role: string;
}

const LIMIT = 10;

export function TicketsClient({ initialData, departments, categories, role }: TicketsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState(initialData);
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const load = useCallback(async (newOffset: number) => {
    setLoading(true);
    try {
      const res = await api.paginate<Ticket>("/helpdesk/tickets/", LIMIT, newOffset);
      setData(res);
      setOffset(newOffset);
    } catch {
      toast("error", "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/helpdesk/tickets/", {
        title: data.title,
        description: data.description,
        department: Number(data.department),
        category: Number(data.category),
        priority: data.priority || undefined,
        status: data.status || undefined,
        assigned_to: data.assigned_to ? Number(data.assigned_to) : undefined,
      });
      toast("success", "Ticket created successfully");
      setOpen(false);
      reset();
      load(0);
    } catch (e) {
      toast("error", extractApiError(e));
    }
  };

  const filteredCategories = selectedDept
    ? categories.filter((c) => String(c.department) === selectedDept)
    : categories;

  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }));
  const catOptions = filteredCategories.map((c) => ({ value: String(c.id), label: c.name }));
  const priorityOptions = [
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ];
  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "in_development", label: "In Development" },
    { value: "closed", label: "Closed" },
  ];

  const canManage = role === "admin" || role === "technician";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Tickets</h2>
          <p className="text-sm text-slate-500">{data.count} total</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <Th>#</Th>
            <Th>Title</Th>
            <Th>Priority</Th>
            <Th>Status</Th>
            <Th>Created</Th>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && (
            <TableRow>
              <Td className="text-center text-slate-400 py-8" colSpan={99}>Loading…</Td>
            </TableRow>
          )}
          {!loading && data.results.length === 0 && (
            <TableRow>
              <Td className="text-center text-slate-400 py-8" colSpan={99}>No tickets found</Td>
            </TableRow>
          )}
          {!loading && data.results.map((t) => (
            <TableRow key={t.id} onClick={() => router.push(`/tickets/${t.id}`)}>
              <Td className="font-mono text-slate-400 w-16">#{t.id}</Td>
              <Td className="font-medium text-slate-900">{t.title}</Td>
              <Td><PriorityBadge priority={t.priority} /></Td>
              <Td><StatusBadge status={t.status} /></Td>
              <Td className="text-slate-500">{formatDate(t.created_at)}</Td>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination count={data.count} limit={LIMIT} offset={offset} onOffsetChange={load} />

      <AppDialog open={open} onOpenChange={setOpen} title="New Ticket" description="Fill in the details to create a new support ticket.">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Title" placeholder="Brief summary of the issue" error={errors.title?.message} {...register("title")} />
          <Textarea label="Description" placeholder="Describe the issue in detail…" {...register("description")} />
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="department"
              control={control}
              render={({ field }) => (
                <AppSelect
                  label="Department"
                  value={field.value ?? null}
                  onValueChange={(v) => { field.onChange(v); setSelectedDept(v); }}
                  options={deptOptions}
                  placeholder="Select dept…"
                  error={errors.department?.message}
                />
              )}
            />
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <AppSelect
                  label="Category"
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                  options={catOptions}
                  placeholder="Select category…"
                  error={errors.category?.message}
                />
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <AppSelect label="Priority" value={field.value ?? null} onValueChange={field.onChange} options={priorityOptions} placeholder="Default" />
              )}
            />
            {canManage && (
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <AppSelect label="Status" value={field.value ?? null} onValueChange={field.onChange} options={statusOptions} placeholder="Open" />
                )}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Create Ticket</Button>
          </div>
        </form>
      </AppDialog>
    </div>
  );
}
