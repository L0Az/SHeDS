"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, KeyRound, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/ui/select";
import { RoleBadge } from "@/components/ui/badge";
import { extractApiError } from "@/lib/utils";
import { api } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/context";
import type { User, Department, PaginatedResponse } from "@/types";

const createSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Min 8 characters"),
  phone: z.string().optional(),
  department: z.string().optional(),
  type: z.string(),
  language: z.string(),
});
const editSchema = createSchema.extend({ password: z.string().optional() });
type EditFormData = z.infer<typeof editSchema>;

const LIMIT = 10;

const PERMISSION_MODELS = [
  { key: "user",             labelKey: "perm_user" },
  { key: "department",       labelKey: "perm_department" },
  { key: "category",         labelKey: "perm_category" },
  { key: "ticket",           labelKey: "perm_ticket" },
  { key: "ticketcomment",    labelKey: "perm_ticketcomment" },
  { key: "ticketattachment", labelKey: "perm_ticketattachment" },
] as const;

const PERMISSION_ACTIONS = ["view", "add", "change", "delete"] as const;

function permCode(action: string, model: string) {
  return `${action}_${model}`;
}

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

interface UsersClientProps {
  initialData: PaginatedResponse<User>;
  allUsers: User[];
  departments: Department[];
}

export function UsersClient({ initialData, allUsers: _allUsers, departments }: UsersClientProps) {
  const { toast } = useToast();
  const t = useT();
  const [data, setData] = useState(initialData);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);

  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const filtersRef = useRef({ search: "", ordering: "", filterRole: "all", filterDept: "all" });
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [permTarget, setPermTarget] = useState<User | null>(null);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [activePerms, setActivePerms] = useState<Set<string>>(new Set());
  const [originalPerms, setOriginalPerms] = useState<Set<string>>(new Set());

  const roleOptions = [
    { value: "admin",      label: t("role_admin") },
    { value: "technician", label: t("role_technician") },
    { value: "customer",   label: t("role_customer") },
  ];
  const roleFilterOptions = [
    { value: "all",        label: t("all_roles") },
    { value: "admin",      label: t("role_admin") },
    { value: "technician", label: t("role_technician") },
    { value: "customer",   label: t("role_customer") },
  ];
  const langOptions = [
    { value: "en", label: t("lang_en") },
    { value: "pt", label: t("lang_pt") },
  ];
  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }));
  const deptFilterOptions = [{ value: "all", label: t("all_departments") }, ...deptOptions];
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } =
    useForm<EditFormData>({
      resolver: zodResolver(editing ? editSchema : createSchema),
      defaultValues: { type: "customer", language: "en" },
    });

  const load = useCallback(async (newOffset: number) => {
    setLoading(true);
    try {
      const { search, ordering, filterRole, filterDept } = filtersRef.current;
      const extra: Record<string, string | undefined> = {};
      if (search) extra.search = search;
      if (ordering) extra.ordering = ordering;
      if (filterRole !== "all") extra.type = filterRole;
      if (filterDept !== "all") extra.department = filterDept;
      const res = await api.paginate<User>("/accounts/users/", LIMIT, newOffset, extra);
      setData(res);
      setOffset(newOffset);
    } catch {
      toast("error", "Failed to load users");
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

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", email: "", password: "", phone: "", department: null as unknown as string, type: "customer", language: "en" });
    setFormOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    reset({ name: u.name, email: u.email, password: "", phone: u.phone ?? "", department: u.department ? String(u.department) : (null as unknown as string), type: u.type, language: u.language });
    setFormOpen(true);
  };

  const onSubmit = async (formData: EditFormData) => {
    try {
      const payload: Record<string, unknown> = { ...formData };
      if (!payload.password) delete payload.password;
      payload.department = formData.department ? Number(formData.department) : null;
      if (editing) {
        await api.patch(`/accounts/users/${editing.id}/`, payload);
        toast("success", "User updated");
      } else {
        await api.post("/accounts/users/", payload);
        toast("success", "User created");
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
      await api.delete(`/accounts/users/${deleteTarget.id}/`);
      toast("success", "User deleted");
      setDeleteTarget(null);
      load(offset);
    } catch (e) {
      toast("error", extractApiError(e));
    }
  };

  const openPerms = async (u: User) => {
    setPermTarget(u);
    setActivePerms(new Set());
    setOriginalPerms(new Set());
    setPermLoading(true);
    try {
      const res = await api.get<{ permissions: string[] }>(`/accounts/users/${u.id}/permissions/`);
      const loaded = new Set(res.permissions);
      setActivePerms(loaded);
      setOriginalPerms(loaded);
    } catch {
      toast("error", "Failed to load permissions");
    } finally {
      setPermLoading(false);
    }
  };

  const togglePerm = (code: string) => {
    setActivePerms((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const toggleRow = (modelKey: string) => {
    const allCodes = PERMISSION_ACTIONS.map((a) => permCode(a, modelKey));
    const allChecked = allCodes.every((c) => activePerms.has(c));
    setActivePerms((prev) => {
      const next = new Set(prev);
      allCodes.forEach((c) => allChecked ? next.delete(c) : next.add(c));
      return next;
    });
  };

  const savePerms = async () => {
    if (!permTarget) return;
    setPermSaving(true);
    try {
      const toGrant = [...activePerms].filter((p) => !originalPerms.has(p));
      const toRevoke = [...originalPerms].filter((p) => !activePerms.has(p));
      if (toGrant.length > 0) {
        await api.post(`/accounts/users/${permTarget.id}/permissions/`, { permissions: toGrant });
      }
      if (toRevoke.length > 0) {
        await api.delete(`/accounts/users/${permTarget.id}/permissions/`, { permissions: toRevoke });
      }
      setOriginalPerms(new Set(activePerms));
      toast("success", "Permissions saved");
    } catch (e) {
      toast("error", extractApiError(e));
    } finally {
      setPermSaving(false);
    }
  };

  useEffect(() => {
    if (!permTarget) {
      setActivePerms(new Set());
      setOriginalPerms(new Set());
    }
  }, [permTarget]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t("users_title")}</h2>
          <p className="text-sm text-slate-500">{data.count} {t("total")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t("users_new")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-52">
          <Input
            placeholder={t("users_search")}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <AppSelect value={filterRole} onValueChange={handleFilter("filterRole", setFilterRole)} options={roleFilterOptions} />
        </div>
        <div className="w-52">
          <AppSelect value={filterDept} onValueChange={handleFilter("filterDept", setFilterDept)} options={deptFilterOptions} />
        </div>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <Th onClick={() => handleOrdering("name")}>{t("name")} <SortIcon dir={sortDir(ordering, "name")} /></Th>
            <Th onClick={() => handleOrdering("email")}>{t("email")} <SortIcon dir={sortDir(ordering, "email")} /></Th>
            <Th onClick={() => handleOrdering("type")}>{t("role")} <SortIcon dir={sortDir(ordering, "type")} /></Th>
            <Th onClick={() => handleOrdering("department__name")}>{t("department")} <SortIcon dir={sortDir(ordering, "department__name")} /></Th>
            <Th className="w-32">{t("actions")}</Th>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && (
            <TableRow><Td className="text-center text-slate-400 py-8" colSpan={99}>{t("loading")}</Td></TableRow>
          )}
          {!loading && data.results.length === 0 && (
            <TableRow><Td className="text-center text-slate-400 py-8" colSpan={99}>{t("users_no_results")}</Td></TableRow>
          )}
          {!loading && data.results.map((u) => (
            <TableRow key={u.id}>
              <Td className="font-medium text-slate-900">{u.name}</Td>
              <Td className="text-slate-600">{u.email}</Td>
              <Td><RoleBadge role={u.type} /></Td>
              <Td className="text-slate-500">{u.department ? (deptMap[u.department] ?? `#${u.department}`) : "—"}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" title={t("users_permissions")} onClick={() => openPerms(u)}>
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(u)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Td>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination count={data.count} limit={LIMIT} offset={offset} onOffsetChange={load} />

      <AppDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? `${t("edit")} ${t("perm_user")}` : t("users_new")}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label={t("users_full_name")} error={errors.name?.message} {...register("name")} />
          <Input label={t("email")} type="email" error={errors.email?.message} {...register("email")} />
          <Input
            label={editing ? t("users_new_password") : t("password")}
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("phone")} {...register("phone")} />
            <Controller name="department" control={control} render={({ field }) => (
              <AppSelect label={t("department")} value={field.value ?? null} onValueChange={(v) => field.onChange(v)} options={deptOptions} placeholder={t("none")} />
            )} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller name="type" control={control} render={({ field }) => (
              <AppSelect label={t("role")} value={field.value} onValueChange={(v) => field.onChange(v ?? "customer")} options={roleOptions} />
            )} />
            <Controller name="language" control={control} render={({ field }) => (
              <AppSelect label={t("language")} value={field.value} onValueChange={(v) => field.onChange(v ?? "en")} options={langOptions} />
            )} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" loading={isSubmitting}>{editing ? t("save") : t("create")}</Button>
          </div>
        </form>
      </AppDialog>

      <AppDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("users_delete_title")}
        description={`${deleteTarget?.name} — ${t("users_delete_desc")}`}
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>{t("cancel")}</Button>
          <Button variant="danger" onClick={onDelete}>{t("delete")}</Button>
        </div>
      </AppDialog>

      <AppDialog
        open={!!permTarget}
        onOpenChange={(v) => !v && setPermTarget(null)}
        title={`${t("users_permissions")} — ${permTarget?.name}`}
        description={t("users_permissions_desc")}
        className="max-w-2xl"
      >
        {permLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 font-medium text-slate-600 w-40">{t("perm_model")}</th>
                    {PERMISSION_ACTIONS.map((a) => (
                      <th key={a} className="text-center px-3 py-2 font-medium text-slate-600 capitalize w-20">{a}</th>
                    ))}
                    <th className="text-center px-3 py-2 font-medium text-slate-600 w-16">{t("perm_all")}</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODELS.map(({ key, labelKey }, i) => {
                    const allCodes = PERMISSION_ACTIONS.map((a) => permCode(a, key));
                    const allChecked = allCodes.every((c) => activePerms.has(c));
                    const someChecked = allCodes.some((c) => activePerms.has(c));
                    return (
                      <tr key={key} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="px-3 py-2.5 font-medium text-slate-700">{t(labelKey)}</td>
                        {PERMISSION_ACTIONS.map((action) => {
                          const code = permCode(action, key);
                          return (
                            <td key={action} className="text-center px-3 py-2.5">
                              <input
                                type="checkbox"
                                checked={activePerms.has(code)}
                                onChange={() => togglePerm(code)}
                                className="h-4 w-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                              />
                            </td>
                          );
                        })}
                        <td className="text-center px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                            onChange={() => toggleRow(key)}
                            className="h-4 w-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setPermTarget(null)}>{t("cancel")}</Button>
              <Button loading={permSaving} onClick={savePerms}>{t("users_save_permissions")}</Button>
            </div>
          </div>
        )}
      </AppDialog>
    </div>
  );
}
