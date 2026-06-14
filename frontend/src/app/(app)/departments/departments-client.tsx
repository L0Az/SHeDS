"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { formatDate, extractApiError } from "@/lib/utils";
import { api } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import type { Department, PaginatedResponse } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const LIMIT = 10;

interface DepartmentsClientProps {
  initialData: PaginatedResponse<Department>;
}

export function DepartmentsClient({ initialData }: DepartmentsClientProps) {
  const { toast } = useToast();
  const [data, setData] = useState(initialData);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [editing, setEditing] = useState<Department | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const load = useCallback(async (newOffset: number) => {
    setLoading(true);
    try {
      const res = await api.paginate<Department>("/helpdesk/departments/", LIMIT, newOffset);
      setData(res);
      setOffset(newOffset);
    } catch {
      toast("error", "Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", description: "" });
    setFormOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    reset({ name: d.name, description: d.description ?? "" });
    setFormOpen(true);
  };

  const onSubmit = async (formData: FormData) => {
    try {
      if (editing) {
        await api.patch(`/helpdesk/departments/${editing.id}/`, formData);
        toast("success", "Department updated");
      } else {
        await api.post("/helpdesk/departments/", formData);
        toast("success", "Department created");
      }
      setFormOpen(false);
      load(offset);
    } catch (e) {
      toast("error", extractApiError(e));
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/helpdesk/departments/${deleteTarget.id}/`);
      toast("success", "Department deleted");
      setDeleteTarget(null);
      load(offset);
    } catch (e) {
      toast("error", extractApiError(e));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Departments</h2>
          <p className="text-sm text-slate-500">{data.count} total</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Department
        </Button>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <Th>Name</Th>
            <Th>Description</Th>
            <Th>Created</Th>
            <Th className="w-24">Actions</Th>
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
              <Td className="text-center text-slate-400 py-8" colSpan={99}>No departments yet</Td>
            </TableRow>
          )}
          {!loading && data.results.map((d) => (
            <TableRow key={d.id}>
              <Td className="font-medium text-slate-900">{d.name}</Td>
              <Td className="text-slate-500 max-w-xs truncate">{d.description ?? "—"}</Td>
              <Td className="text-slate-500">{formatDate(d.created_at)}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(d)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Td>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination count={data.count} limit={LIMIT} offset={offset} onOffsetChange={load} />

      <AppDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit Department" : "New Department"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Name" placeholder="e.g. IT Support" error={errors.name?.message} {...register("name")} />
          <Textarea label="Description" placeholder="Optional description…" {...register("description")} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{editing ? "Save changes" : "Create"}</Button>
          </div>
        </form>
      </AppDialog>

      <AppDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete department?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This will also delete all associated categories and tickets.`}
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={onDelete}>Delete</Button>
        </div>
      </AppDialog>
    </div>
  );
}
