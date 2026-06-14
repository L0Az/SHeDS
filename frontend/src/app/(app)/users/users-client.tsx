"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, KeyRound, Loader2 } from "lucide-react";
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
  { key: "user",              label: "User" },
  { key: "department",        label: "Department" },
  { key: "category",          label: "Category" },
  { key: "ticket",            label: "Ticket" },
  { key: "ticketcomment",     label: "Ticket Comment" },
  { key: "ticketattachment",  label: "Ticket Attachment" },
] as const;

const PERMISSION_ACTIONS = ["view", "add", "change", "delete"] as const;

function permCode(action: string, model: string) {
  return `${action}_${model}`;
}

interface UsersClientProps {
  initialData: PaginatedResponse<User>;
  allUsers: User[];
  departments: Department[];
}

export function UsersClient({ initialData, allUsers: _allUsers, departments }: UsersClientProps) {
  const { toast } = useToast();
  const [data, setData] = useState(initialData);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);

  // Permissions state
  const [permTarget, setPermTarget] = useState<User | null>(null);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [activePerms, setActivePerms] = useState<Set<string>>(new Set());
  const [originalPerms, setOriginalPerms] = useState<Set<string>>(new Set());

  const roleOptions = [
    { value: "admin", label: "Administrator" },
    { value: "technician", label: "Technician" },
    { value: "customer", label: "Customer" },
  ];
  const langOptions = [
    { value: "en", label: "English" },
    { value: "pt", label: "Português" },
  ];
  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }));
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } =
    useForm<EditFormData>({
      resolver: zodResolver(editing ? editSchema : createSchema),
      defaultValues: { type: "customer", language: "en" },
    });

  const load = useCallback(async (newOffset: number) => {
    setLoading(true);
    try {
      const res = await api.paginate<User>("/accounts/users/", LIMIT, newOffset);
      setData(res);
      setOffset(newOffset);
    } catch {
      toast("error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [toast]);

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

  // Reset permissions dialog when closed
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
          <h2 className="text-xl font-semibold text-slate-900">Users</h2>
          <p className="text-sm text-slate-500">{data.count} total</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New User
        </Button>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Department</Th>
            <Th className="w-32">Actions</Th>
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
              <Td className="text-center text-slate-400 py-8" colSpan={99}>No users</Td>
            </TableRow>
          )}
          {!loading && data.results.map((u) => (
            <TableRow key={u.id}>
              <Td className="font-medium text-slate-900">{u.name}</Td>
              <Td className="text-slate-600">{u.email}</Td>
              <Td><RoleBadge role={u.type} /></Td>
              <Td className="text-slate-500">{u.department ? (deptMap[u.department] ?? `#${u.department}`) : "—"}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" title="Permissions" onClick={() => openPerms(u)}>
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

      {/* Create / Edit dialog */}
      <AppDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit User" : "New User"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Full Name" error={errors.name?.message} {...register("name")} />
          <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
          <Input
            label={editing ? "New Password (leave blank to keep)" : "Password"}
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" {...register("phone")} />
            <Controller name="department" control={control} render={({ field }) => (
              <AppSelect
                label="Department"
                value={field.value ?? null}
                onValueChange={(v) => field.onChange(v)}
                options={deptOptions}
                placeholder="None"
              />
            )} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller name="type" control={control} render={({ field }) => (
              <AppSelect label="Role" value={field.value} onValueChange={(v) => field.onChange(v ?? "customer")} options={roleOptions} />
            )} />
            <Controller name="language" control={control} render={({ field }) => (
              <AppSelect label="Language" value={field.value} onValueChange={(v) => field.onChange(v ?? "en")} options={langOptions} />
            )} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{editing ? "Save" : "Create"}</Button>
          </div>
        </form>
      </AppDialog>

      {/* Delete dialog */}
      <AppDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete user?"
        description={`Delete ${deleteTarget?.name}? Their account will be anonymised.`}
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={onDelete}>Delete</Button>
        </div>
      </AppDialog>

      {/* Permissions dialog */}
      <AppDialog
        open={!!permTarget}
        onOpenChange={(v) => !v && setPermTarget(null)}
        title={`Permissions — ${permTarget?.name}`}
        description="Grant or revoke model-level permissions for this user."
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
                    <th className="text-left px-3 py-2 font-medium text-slate-600 w-40">Model</th>
                    {PERMISSION_ACTIONS.map((a) => (
                      <th key={a} className="text-center px-3 py-2 font-medium text-slate-600 capitalize w-20">{a}</th>
                    ))}
                    <th className="text-center px-3 py-2 font-medium text-slate-600 w-16">All</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODELS.map(({ key, label }, i) => {
                    const allCodes = PERMISSION_ACTIONS.map((a) => permCode(a, key));
                    const allChecked = allCodes.every((c) => activePerms.has(c));
                    const someChecked = allCodes.some((c) => activePerms.has(c));
                    return (
                      <tr key={key} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="px-3 py-2.5 font-medium text-slate-700">{label}</td>
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
              <Button variant="secondary" onClick={() => setPermTarget(null)}>Cancel</Button>
              <Button loading={permSaving} onClick={savePerms}>Save permissions</Button>
            </div>
          </div>
        )}
      </AppDialog>
    </div>
  );
}
