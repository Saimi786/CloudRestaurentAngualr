import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RolesApi } from '../../core/api/roles.api';
import { userMessage } from '../../core/errors/problem-details.helper';
import { PermissionDescriptor, RoleDetailsDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

interface DraftRole {
  id: string | null;
  name: string;
  isBuiltIn: boolean;
  userCount: number;
  permissions: Set<string>;
}

@Component({
  selector: 'app-roles-admin',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Roles &amp; Permissions</h1>
        <p class="muted">Built-in roles ship with a sensible default. Tune permissions per role, or create custom roles for unusual job titles.</p>
      </div>
      <div class="actions">
        <button class="btn btn-primary" (click)="newRole()">+ New Role</button>
      </div>
    </div>

    <div class="layout">
      <aside class="role-list panel">
        @if (loading()) {
          <div class="muted" style="padding:0.5rem;">Loading…</div>
        } @else {
          @for (r of roles(); track r.id) {
            <button class="role-row" [class.selected]="selectedId() === r.id" (click)="select(r)">
              <div class="role-name">{{ r.name }}</div>
              <div class="role-meta">
                <span class="pill" [class.built-in]="r.isBuiltIn">{{ r.isBuiltIn ? 'Built-in' : 'Custom' }}</span>
                <span class="muted">{{ r.userCount }} user{{ r.userCount === 1 ? '' : 's' }}</span>
                <span class="muted">· {{ r.permissions.length }} perms</span>
              </div>
            </button>
          }
        }
      </aside>

      @if (draft(); as d) {
        <section class="role-editor panel">
          <div class="form-row">
            <div class="field">
              <label>Role name</label>
              <input [ngModel]="d.name" (ngModelChange)="renameDraft($event)" [disabled]="d.isBuiltIn" />
              @if (d.isBuiltIn) {
                <small class="muted">Built-in role name is fixed (used by the authorization system). You can still adjust its permissions below.</small>
              }
            </div>
            <div class="field" style="align-self:end;">
              <button class="btn btn-link" (click)="toggleAll(true)">Select all</button>
              <button class="btn btn-link" (click)="toggleAll(false)">Clear all</button>
            </div>
          </div>

          @for (area of permissionAreas(); track area) {
            <details class="area" open>
              <summary>
                <strong>{{ area }}</strong>
                <span class="muted">({{ countSelected(area) }} / {{ countTotal(area) }})</span>
              </summary>
              <div class="perm-grid">
                @for (p of permissionsByArea()[area]; track p.key) {
                  <label class="perm">
                    <input type="checkbox"
                           [checked]="d.permissions.has(p.key)"
                           (change)="toggle(p.key, $any($event.target).checked)" />
                    <span class="mono">{{ p.key }}</span>
                  </label>
                }
              </div>
            </details>
          }

          <div class="form-actions">
            @if (!d.isBuiltIn && d.id) {
              <button class="btn btn-danger" (click)="remove()" [disabled]="saving()">Delete role</button>
            }
            <div style="margin-left:auto; display:flex; gap:0.5rem;">
              <button class="btn" (click)="reset()" [disabled]="saving()">Reset</button>
              <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
        </section>
      } @else {
        <section class="panel empty">
          <p class="muted">Select a role on the left to view or edit its permissions.</p>
        </section>
      }
    </div>
  `,
  styles: [`
    .layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 1rem;
      align-items: start;
    }
    .role-list { padding: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .role-row {
      text-align: left; background: none; border: 1px solid transparent;
      padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer;
    }
    .role-row:hover { background: #f9fafb; }
    .role-row.selected { background: #eef2ff; border-color: #c7d2fe; }
    .role-name { font-weight: 600; }
    .role-meta { display: flex; gap: 0.4rem; font-size: 0.8rem; margin-top: 0.15rem; align-items: center; }
    .pill { padding: 0 0.4rem; border-radius: 999px; background: #f3f4f6; color: #374151; font-size: 0.7rem; }
    .pill.built-in { background: #fef3c7; color: #92400e; }
    .panel.empty { padding: 2rem; text-align: center; }
    .area { border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.5rem 0.75rem; margin-bottom: 0.5rem; }
    .area summary { cursor: pointer; padding: 0.25rem 0; }
    .perm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.25rem 1rem; padding: 0.5rem 0; }
    .perm { display: flex; align-items: center; gap: 0.5rem; padding: 0.2rem 0; }
    .perm input { accent-color: #3b82f6; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; padding: 0 0.4rem; font-size: 0.85rem; }
    .btn-link:hover { text-decoration: underline; }
  `]
})
export class RolesAdminComponent {
  private readonly api = inject(RolesApi);
  private readonly notify = inject(NotificationService);

  protected readonly roles = signal<RoleDetailsDto[]>([]);
  protected readonly catalog = signal<PermissionDescriptor[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly draft = signal<DraftRole | null>(null);

  protected readonly permissionsByArea = computed<Record<string, PermissionDescriptor[]>>(() => {
    const out: Record<string, PermissionDescriptor[]> = {};
    for (const p of this.catalog()) {
      (out[p.area] ??= []).push(p);
    }
    return out;
  });
  protected readonly permissionAreas = computed(() => Object.keys(this.permissionsByArea()).sort());

  constructor() { this.reload(); }

  reload(): void {
    this.loading.set(true);
    let rolesDone = false;
    let permsDone = false;
    const tryFinish = () => { if (rolesDone && permsDone) this.loading.set(false); };
    this.api.details().subscribe({
      next: list => {
        this.roles.set(list);
        rolesDone = true;
        tryFinish();
        // Re-select current draft to pick up server-side changes after a save.
        const id = this.selectedId();
        if (id) {
          const refreshed = list.find(r => r.id === id);
          if (refreshed) this.select(refreshed);
        }
      },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
    this.api.permissions().subscribe({
      next: list => { this.catalog.set(list); permsDone = true; tryFinish(); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  select(r: RoleDetailsDto): void {
    this.selectedId.set(r.id);
    this.draft.set({
      id: r.id,
      name: r.name,
      isBuiltIn: r.isBuiltIn,
      userCount: r.userCount,
      permissions: new Set(r.permissions)
    });
  }

  newRole(): void {
    this.selectedId.set(null);
    this.draft.set({
      id: null,
      name: '',
      isBuiltIn: false,
      userCount: 0,
      permissions: new Set()
    });
  }

  renameDraft(name: string): void {
    const d = this.draft();
    if (!d) return;
    this.draft.set({ ...d, name });
  }

  toggle(key: string, checked: boolean): void {
    const d = this.draft();
    if (!d) return;
    const next = new Set(d.permissions);
    if (checked) next.add(key); else next.delete(key);
    this.draft.set({ ...d, permissions: next });
  }

  toggleAll(checked: boolean): void {
    const d = this.draft();
    if (!d) return;
    const next = new Set(d.permissions);
    if (checked) {
      for (const p of this.catalog()) next.add(p.key);
    } else {
      next.clear();
    }
    this.draft.set({ ...d, permissions: next });
  }

  countSelected(area: string): number {
    const d = this.draft();
    if (!d) return 0;
    return (this.permissionsByArea()[area] ?? [])
      .filter(p => d.permissions.has(p.key)).length;
  }

  countTotal(area: string): number {
    return (this.permissionsByArea()[area] ?? []).length;
  }

  reset(): void {
    const id = this.selectedId();
    if (!id) { this.draft.set(null); return; }
    const r = this.roles().find(x => x.id === id);
    if (r) this.select(r);
  }

  save(): void {
    const d = this.draft();
    if (!d) return;
    if (!d.isBuiltIn && d.name.trim() === '') {
      this.notify.error('Role name is required.');
      return;
    }
    this.saving.set(true);
    const body = { name: d.name.trim(), permissions: [...d.permissions] };
    const obs = d.id
      ? this.api.update(d.id, body)
      : this.api.create(body);

    obs.subscribe({
      next: saved => {
        this.notify.success(d.id ? 'Role updated.' : 'Role created.');
        this.saving.set(false);
        this.selectedId.set(saved.id);
        this.reload();
      },
      error: err => { this.saving.set(false); this.notify.error(userMessage(err)); }
    });
  }

  remove(): void {
    const d = this.draft();
    if (!d?.id || d.isBuiltIn) return;
    if (!confirm(`Delete role "${d.name}"? Users assigned to it must be moved first.`)) return;
    this.saving.set(true);
    this.api.delete(d.id).subscribe({
      next: () => {
        this.notify.success('Role deleted.');
        this.saving.set(false);
        this.selectedId.set(null);
        this.draft.set(null);
        this.reload();
      },
      error: err => { this.saving.set(false); this.notify.error(userMessage(err)); }
    });
  }
}
