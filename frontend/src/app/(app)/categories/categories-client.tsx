"use client";

import { useState, useCallback, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { AppSelect } from "@/components/ui/select";
import { formatDate, extractApiError } from "@/lib/utils";
import { api } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import type { Category, Department, PaginatedResponse } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  department: z.string().min(1, "Department is required"),
});
type FormData = z.infer<typeof schema>;

const LIMIT = 10;

type SortDir = "asc" | "desc" | null;
function sortDir(ordering: string, field: string): SortDir {
  if (ordering === field) return "asc";
  if (ordering === `-${field}`) return "desc";
  return null;
}
function toggleOrdering(current: string, field: string): string {
  return current === field ? `-${field}` : field;
}
function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === "asc") return <ArrowUp className="inline h-3 w-3 ml-0.5" />;
  if (dir === "desc") return <ArrowDown className="inline h-3 w-3 ml-0.5" />;
  return <ArrowUpDown className="inline h-3 w-3 ml-0.5 opacity-30" />;
}

interface CategoriesClientProps {
  initialData: PaginatedResponse<Category>;
  departments: Department[];
}

export function CategoriesClient({ initialData, departments }: CategoriesClientProps) {
  const { toast } = useToast();
  const [data, setData] = useState(initialData);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);

  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const filtersRef = useRef({ search: "", ordering: "", filterDept: "all" });
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }));
  const deptFilterOptions = [
    { value: "all", label: "All departments" },
    ...deptOptions,
  ];

  const load = useCallback(async (newOffset: number) => {
    setLoading(true);
    try {
      const { search, ordering, filterDept } = filtersRef.current;
      const extra: Record<string, string | undefined> = {};
      if (search) extra.search = search;
      if (ordering) extra.ordering = ordering;
      if (filterDept !== "all") extra.department = filterDept;
      const res = await api.paginate<Category>("/helpdesk/categories/", LIMIT, newOffset, extra);
      setData(res);
      setOffset(newOffset);
    } catch {
      toast("error", "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSearch = (value: string) => {
    setSearch(value);
    filtersRef.current.search = value;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setOffset(0); load(0); }, 300);
  };

  const handleOrdering = (field: string) => {
    const next = toggleOrdering(ordering, field);
    setOrdering(next);
    filtersRef.current.ordering = next;
    setOffset(0);
    load(0);
  };

  const handleFilterDept = (value: string | null) => {
    const v = value ?? "all";
    setFilterDept(v);
    filtersRef.current.filterDept = v;
    setOffset(0);
    load(0);
  };

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", description: "", department: "" });
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    reset({ name: c.name, description: c.description ?? "", department: String(c.department) });
    setFormOpen(true);
  };

  const onSubmit = async (formData: FormData) => {
    try {
      const payload = { ...formData, department: Number(formData.department) };
      if (editing) {
        await api.patch(`/helpdesk/categories/${editing.id}/`, payload);
        toast("success", "Category updated");
      } else {
        await api.post("/helpdesk/categories/", payload);
        toast("success", "Category created");
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
      await api.delete(`/helpdesk/categories/${deleteTarget.id}/`);
      toast("success", "Category deleted");
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
          <h2 className="text-xl font-semibold text-slate-900">Categories</h2>
          <p className="text-sm text-slate-500">{data.count} total</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Category
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-52">
          <Input
            placeholder="Search by name or description…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="w-52">
          <AppSelect
            value={filterDept}
            onValueChange={handleFilterDept}
            options={deptFilterOptions}
            placeholder="All departments"
          />
        </div>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <Th onClick={() => handleOrdering("name")}>
              Name <SortIcon dir={sortDir(ordering, "name")} />
            </Th>
            <Th onClick={() => handleOrdering("department__name")}>
              Department <SortIcon dir={sortDir(ordering, "department__name")} />
            </Th>
            <Th>Description</Th>
            <Th onClick={() => handleOrdering("id")}>
              Created <SortIcon dir={sortDir(ordering, "id")} />
            </Th>
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
              <Td className="text-center text-slate-400 py-8" colSpan={99}>No categories yet</Td>
            </TableRow>
          )}
          {!loading && data.results.map((c) => (
            <TableRow key={c.id}>
              <Td className="font-medium text-slate-900">{c.name}</Td>
              <Td>{deptMap[c.department] ?? `#${c.department}`}</Td>
              <Td className="text-slate-500 max-w-xs truncate">{c.description ?? "—"}</Td>
              <Td className="text-slate-500">{formatDate(c.created_at)}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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
        title={editing ? "Edit Category" : "New Category"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Name" placeholder="e.g. Hardware" error={errors.name?.message} {...register("name")} />
          <Controller
            name="department"
            control={control}
            render={({ field }) => (
              <AppSelect
                label="Department"
                value={field.value || null}
                onValueChange={field.onChange}
                options={deptOptions}
                placeholder="Select department…"
                error={errors.department?.message}
              />
            )}
          />
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
        title="Delete category?"
        description={`Delete "${deleteTarget?.name}"? This will also delete associated tickets.`}
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={onDelete}>Delete</Button>
        </div>
      </AppDialog>
    </div>
  );
}
