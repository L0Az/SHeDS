"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
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
import type { User, PaginatedResponse } from "@/types";

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
type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

const LIMIT = 10;

const PERM_OPTIONS = [
  { value: "view_user", label: "View" },
  { value: "change_user", label: "Edit" },
  { value: "delete_user", label: "Delete" },
];

interface UsersClientProps {
  initialData: PaginatedResponse<User>;
  allUsers: User[];
}

export function UsersClient({ initialData, allUsers }: UsersClientProps) {
  const { toast } = useToast();
  const [data, setData] = useState(initialData);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [permTarget, setPermTarget] = useState<User | null>(null);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [permSaving, setPermSaving] = useState(false);

  const roleOptions = [
    { value: "admin", label: "Administrator" },
    { value: "technician", label: "Technician" },
    { value: "customer", label: "Customer" },
  ];
  const langOptions = [
    { value: "en", label: "English" },
    { value: "pt", label: "Português" },
  ];

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
    reset({ name: "", email: "", password: "", phone: "", department: "", type: "customer", language: "en" });
    setFormOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    reset({ name: u.name, email: u.email, password: "", phone: u.phone ?? "", department: u.department ?? "", type: u.type, language: u.language });
    setFormOpen(true);
  };

  const onSubmit = async (formData: EditFormData) => {
    try {
      const payload: Record<string, unknown> = { ...formData };
      if (!payload.password) delete payload.password;
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

  const openPerms = (u: User) => {
    setPermTarget(u);
    setPermUserId(null);
    setSelectedPerms([]);
  };

  const togglePerm = (p: string) => {
    setSelectedPerms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const grantPerms = async () => {
    if (!permTarget || !permUserId || selectedPerms.length === 0) return;
    setPermSaving(true);
    try {
      await api.post(`/accounts/users/${permTarget.id}/permissions/`, {
        user_id: Number(permUserId),
        permissions: selectedPerms,
      });
      toast("success", "Permissions granted");
    } catch (e) {
      toast("error", extractApiError(e));
    } finally {
      setPermSaving(false);
    }
  };

  const revokePerms = async () => {
    if (!permTarget || !permUserId || selectedPerms.length === 0) return;
    setPermSaving(true);
    try {
      await api.delete(`/accounts/users/${permTarget.id}/permissions/`, {
        user_id: Number(permUserId),
        permissions: selectedPerms,
      });
      toast("success", "Permissions revoked");
    } catch (e) {
      toast("error", extractApiError(e));
    } finally {
      setPermSaving(false);
    }
  };

  const userOptions = allUsers.map((u) => ({ value: String(u.id), label: `${u.name} (${u.email})` }));

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
              <Td className="text-slate-500">{u.department ?? "—"}</Td>
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
            <Input label="Department" {...register("department")} />
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
        title={`Manage permissions on ${permTarget?.name}`}
        description="Grant or revoke object-level permissions for a specific user."
      >
        <div className="flex flex-col gap-4">
          <AppSelect
            label="Target user (who receives permissions)"
            value={permUserId}
            onValueChange={setPermUserId}
            options={userOptions}
            placeholder="Select user…"
          />
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-700">Permissions</p>
            {PERM_OPTIONS.map((p) => (
              <label key={p.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPerms.includes(p.value)}
                  onChange={() => togglePerm(p.value)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">{p.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPermTarget(null)}>Close</Button>
            <Button variant="danger" loading={permSaving} onClick={revokePerms} disabled={!permUserId || selectedPerms.length === 0}>
              Revoke
            </Button>
            <Button loading={permSaving} onClick={grantPerms} disabled={!permUserId || selectedPerms.length === 0}>
              Grant
            </Button>
          </div>
        </div>
      </AppDialog>
    </div>
  );
}
