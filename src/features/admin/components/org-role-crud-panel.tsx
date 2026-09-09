import {
  createOrganizationRole,
  deleteOrganizationRole,
  updateOrganizationRole,
} from '@/features/admin/server/org-role-actions';
import { getWorkspaceRoleDisplayName } from '@/lib/workspace/roles';

type RoleRow = {
  id: string;
  name: string;
  description?: string | null;
  organization_id?: string | null;
  user_roles?: Array<{ id?: string | null }> | null;
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const immutableNames = new Set(['owner', 'admin', 'manager', 'sales', 'field_sales']);
const undeletableNames = new Set(['owner', 'admin', 'sales']);

function displayName(name: string) {
  return getWorkspaceRoleDisplayName(name) === 'Member'
    ? name.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : getWorkspaceRoleDisplayName(name);
}

export function OrgRoleCrudPanel({ roles }: { roles: RoleRow[] }) {
  const organizationRoles = roles.filter((role) => Boolean(role.organization_id));
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Organization roles</p>
          <h2 className="mt-1 text-base font-black text-slate-950">Create, update and remove workspace roles</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Role names are stored as normalized internal values. “Field Sales” is stored as <code className="rounded bg-slate-100 px-1 py-0.5">field_sales</code> so permissions and RLS remain consistent.</p>
        </div>
      </div>

      <form action={createOrganizationRole} className="mt-4 grid gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 md:grid-cols-[220px_1fr_auto]">
        <input className={inputClass} name="name" placeholder="Role name, e.g. Field Sales" required />
        <input className={inputClass} name="description" placeholder="What this role is responsible for" />
        <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700">+ Add role</button>
      </form>

      <div className="mt-4 space-y-2">
        {organizationRoles.map((role) => {
          const normalized = String(role.name ?? '').toLowerCase();
          const immutableName = immutableNames.has(normalized);
          const assignedCount = Array.isArray(role.user_roles) ? role.user_roles.length : 0;
          return (
            <div key={role.id} className="rounded-xl border border-slate-200 p-3">
              <form action={updateOrganizationRole} className="grid gap-2 md:grid-cols-[220px_1fr_auto]">
                <input type="hidden" name="id" value={role.id} />
                <label className="text-[9px] font-black uppercase tracking-wide text-slate-500">Role
                  <input className={`${inputClass} mt-1 ${immutableName ? 'bg-slate-50 text-slate-500' : ''}`} name="name" defaultValue={normalized} readOnly={immutableName} />
                </label>
                <label className="text-[9px] font-black uppercase tracking-wide text-slate-500">Description
                  <input className={`${inputClass} mt-1`} name="description" defaultValue={role.description ?? ''} />
                </label>
                <div className="flex items-end gap-2">
                  <button type="submit" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Save</button>
                </div>
              </form>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                <p className="text-[10px] text-slate-500"><strong className="text-slate-700">{displayName(normalized)}</strong> · {assignedCount} member assignment{assignedCount === 1 ? '' : 's'}</p>
                {!undeletableNames.has(normalized) ? (
                  <form action={deleteOrganizationRole}>
                    <input type="hidden" name="id" value={role.id} />
                    <button type="submit" className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100">Delete role</button>
                  </form>
                ) : <span className="text-[9px] font-bold uppercase text-slate-400">Core role</span>}
              </div>
            </div>
          );
        })}
        {organizationRoles.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">No organization-specific roles configured.</p> : null}
      </div>
    </section>
  );
}
