"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
import { useT } from "@/lib/i18n/context";
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

export function TicketsClient({ initialData, departments, categories, role }: TicketsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useT();
  const [data, setData] = useState(initialData);
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const filtersRef = useRef({
    search: "", ordering: "",
    filterStatus: "all", filterPriority: "all",
    filterDept: "all", filterCat: "all",
  });
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const STATUS_OPTIONS = [
    { value: "all",            label: t("status_all") },
    { value: "open",           label: t("status_open") },
    { value: "in_progress",    label: t("status_in_progress") },
    { value: "in_development", label: t("status_in_development") },
    { value: "closed",         label: t("status_closed") },
  ];

  const PRIORITY_OPTIONS = [
    { value: "all",    label: t("priority_all") },
    { value: "high",   label: t("priority_high") },
    { value: "medium", label: t("priority_medium") },
    { value: "low",    label: t("priority_low") },
  ];

  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }));
  const deptFilterOptions = [{ value: "all", label: t("all_departments") }, ...deptOptions];

  const allCatOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));
  const catFilterOptions = [{ value: "all", label: t("categories_title") }, ...allCatOptions];
  const filteredCategories = selectedDept
    ? categories.filter((c) => String(c.department) === selectedDept)
    : categories;
  const catFormOptions = filteredCategories.map((c) => ({ value: String(c.id), label: c.name }));

  const canManage = role === "admin" || role === "technician";

  const load = useCallback(async (newOffset: number) => {
    setLoading(true);
    try {
      const f = filtersRef.current;
      const extra: Record<string, string | undefined> = {};
      if (f.search) extra.search = f.search;
      if (f.ordering) extra.ordering = f.ordering;
      if (f.filterStatus !== "all") extra.status = f.filterStatus;
      if (f.filterPriority !== "all") extra.priority = f.filterPriority;
      if (f.filterDept !== "all") extra.department = f.filterDept;
      if (f.filterCat !== "all") extra.category = f.filterCat;
      const res = await api.paginate<Ticket>("/helpdesk/tickets/", LIMIT, newOffset, extra);
      setData(res);
      setOffset(newOffset);
    } catch {
      toast("error", "Failed to load tickets");
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

  const handleFilter = (key: keyof typeof filtersRef.current, setter: (v: string) => void) =>
    (value: string | null) => {
      const v = value ?? "all";
      setter(v);
      filtersRef.current[key] = v;
      setOffset(0);
      load(0);
    };

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t("tickets_title")}</h2>
          <p className="text-sm text-slate-500">{data.count} {t("total")}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {t("tickets_new")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-52">
          <Input
            placeholder={t("tickets_search")}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <AppSelect value={filterStatus} onValueChange={handleFilter("filterStatus", setFilterStatus)} options={STATUS_OPTIONS} />
        </div>
        <div className="w-44">
          <AppSelect value={filterPriority} onValueChange={handleFilter("filterPriority", setFilterPriority)} options={PRIORITY_OPTIONS} />
        </div>
        <div className="w-48">
          <AppSelect value={filterDept} onValueChange={handleFilter("filterDept", setFilterDept)} options={deptFilterOptions} />
        </div>
        <div className="w-48">
          <AppSelect value={filterCat} onValueChange={handleFilter("filterCat", setFilterCat)} options={catFilterOptions} />
        </div>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <Th className="w-12">#</Th>
            <Th onClick={() => handleOrdering("title")}>{t("title")} <SortIcon dir={sortDir(ordering, "title")} /></Th>
            <Th onClick={() => handleOrdering("priority")}>{t("priority")} <SortIcon dir={sortDir(ordering, "priority")} /></Th>
            <Th onClick={() => handleOrdering("status")}>{t("status")} <SortIcon dir={sortDir(ordering, "status")} /></Th>
            <Th onClick={() => handleOrdering("created_at")}>{t("created")} <SortIcon dir={sortDir(ordering, "created_at")} /></Th>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && (
            <TableRow><Td className="text-center text-slate-400 py-8" colSpan={99}>{t("loading")}</Td></TableRow>
          )}
          {!loading && data.results.length === 0 && (
            <TableRow><Td className="text-center text-slate-400 py-8" colSpan={99}>{t("tickets_no_results")}</Td></TableRow>
          )}
          {!loading && data.results.map((tk) => (
            <TableRow key={tk.id} onClick={() => router.push(`/tickets/${tk.id}`)}>
              <Td className="font-mono text-slate-400 w-16">#{tk.id}</Td>
              <Td className="font-medium text-slate-900">{tk.title}</Td>
              <Td><PriorityBadge priority={tk.priority} /></Td>
              <Td><StatusBadge status={tk.status} /></Td>
              <Td className="text-slate-500">{formatDate(tk.created_at)}</Td>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination count={data.count} limit={LIMIT} offset={offset} onOffsetChange={load} />

      <AppDialog open={open} onOpenChange={setOpen} title={t("tickets_new")} description={t("tickets_new_desc")}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label={t("title")} placeholder={t("tickets_title_placeholder")} error={errors.title?.message} {...register("title")} />
          <Textarea label={t("description")} placeholder={t("tickets_description_placeholder")} {...register("description")} />
          <div className="grid grid-cols-2 gap-3">
            <Controller name="department" control={control} render={({ field }) => (
              <AppSelect label={t("department")} value={field.value ?? null} onValueChange={(v) => { field.onChange(v); setSelectedDept(v); }} options={deptOptions} placeholder={t("select_dept")} error={errors.department?.message} />
            )} />
            <Controller name="category" control={control} render={({ field }) => (
              <AppSelect label={t("category")} value={field.value ?? null} onValueChange={field.onChange} options={catFormOptions} placeholder={t("select_category")} error={errors.category?.message} />
            )} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller name="priority" control={control} render={({ field }) => (
              <AppSelect label={t("priority")} value={field.value ?? null} onValueChange={field.onChange} options={PRIORITY_OPTIONS.slice(1)} placeholder={t("priority_default")} />
            )} />
            {canManage && (
              <Controller name="status" control={control} render={({ field }) => (
                <AppSelect label={t("status")} value={field.value ?? null} onValueChange={field.onChange} options={STATUS_OPTIONS.slice(1)} placeholder={t("status_open")} />
              )} />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" loading={isSubmitting}>{t("tickets_create")}</Button>
          </div>
        </form>
      </AppDialog>
    </div>
  );
}
