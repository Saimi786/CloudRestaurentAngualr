import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PlatformTenantsApi } from '../../core/api/platform-tenants.api';
import { userMessage } from '../../core/errors/problem-details.helper';
import { BusinessType, PlatformTenantListItem, SubscriptionPlan } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-platform-tenants-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Platform · Tenants</h1>
        <p>All businesses on the platform. Create, edit plan, activate, or deactivate.</p>
      </div>
      <div class="actions">
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show deactivated
        </label>
        <a class="btn btn-primary" routerLink="/platform/tenants/new">+ New Tenant</a>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-icon">🏢</div>
        <span class="kpi-label">Total tenants</span>
        <span class="kpi-value">{{ rows().length }}</span>
        <span class="kpi-meta">{{ activeCount() }} active · {{ rows().length - activeCount() }} deactivated</span>
      </div>
      <div class="kpi">
        <div class="kpi-icon">📍</div>
        <span class="kpi-label">Total branches</span>
        <span class="kpi-value">{{ totalBranches() }}</span>
        <span class="kpi-meta">Across the whole platform</span>
      </div>
      <div class="kpi">
        <div class="kpi-icon">👥</div>
        <span class="kpi-label">Total users</span>
        <span class="kpi-value">{{ totalUsers() }}</span>
        <span class="kpi-meta">Accounts on every tenant</span>
      </div>
      <div class="kpi">
        <div class="kpi-icon">💼</div>
        <span class="kpi-label">By plan</span>
        <span class="kpi-value" style="font-size:0.95rem; line-height:1.4;">
          @for (kv of planBreakdown(); track kv.label) {
            <div>{{ kv.label }}: <strong>{{ kv.count }}</strong></div>
          }
        </span>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Tenant</th>
          <th>Slug</th>
          <th>Vertical</th>
          <th>Plan</th>
          <th style="text-align:right;">Branches</th>
          <th style="text-align:right;">Users</th>
          <th>Created</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="9" class="empty">Loading tenants…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="9" class="empty">No tenants on this platform yet. <a routerLink="/platform/tenants/new">Create the first one →</a></td></tr>
        } @else {
          @for (t of rows(); track t.id) {
            <tr [class.inactive]="!t.isActive">
              <td>
                <div class="tenant-cell">
                  <div class="tenant-avatar" [style.background]="avatarColor(t.name)">
                    {{ tenantInitial(t.name) }}
                  </div>
                  <div>
                    <strong>{{ t.name }}</strong>
                    <div class="muted small">{{ t.companyCount }} compan{{ t.companyCount === 1 ? 'y' : 'ies' }}</div>
                  </div>
                </div>
              </td>
              <td class="mono muted">{{ t.slug }}</td>
              <td><span class="badge badge-info">{{ businessTypeLabel(t.businessType) }}</span></td>
              <td><span class="badge" [class]="'plan-' + t.plan">{{ planLabel(t.plan) }}</span></td>
              <td style="text-align:right;" class="mono">{{ t.branchCount }}</td>
              <td style="text-align:right;" class="mono">{{ t.userCount }}</td>
              <td class="muted small">{{ t.createdAt | date:'mediumDate' }}</td>
              <td>
                @if (t.isActive) {
                  <span class="badge badge-active">Active</span>
                } @else {
                  <span class="badge badge-danger">Deactivated</span>
                }
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/platform/tenants', t.id]">Edit</a>
                @if (t.isActive) {
                  <button class="btn btn-sm btn-danger" (click)="toggle(t, false)">Deactivate</button>
                } @else {
                  <button class="btn btn-sm" (click)="toggle(t, true)">Reactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`
    .tenant-cell { display: flex; align-items: center; gap: 0.7rem; }
    .tenant-avatar {
      width: 36px; height: 36px;
      border-radius: 8px;
      display: grid; place-items: center;
      color: #fff;
      font-weight: 700;
      font-size: 0.95rem;
      letter-spacing: -0.02em;
      flex-shrink: 0;
    }
    .badge.plan-0 { background: #e0e7ff; color: #3730a3; }
    .badge.plan-1 { background: #dbeafe; color: #1e40af; }
    .badge.plan-2 { background: #fef3c7; color: #92400e; }
    .badge.plan-3 { background: #fce7f3; color: #9d174d; }
  `]
})
export class PlatformTenantsListComponent {
  private readonly api = inject(PlatformTenantsApi);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<PlatformTenantListItem[]>([]);
  protected readonly loading = signal(true);
  protected includeInactive = true;

  protected readonly activeCount = computed(() => this.rows().filter(t => t.isActive).length);
  protected readonly totalBranches = computed(() => this.rows().reduce((s, t) => s + t.branchCount, 0));
  protected readonly totalUsers = computed(() => this.rows().reduce((s, t) => s + t.userCount, 0));

  protected readonly planBreakdown = computed(() => {
    const counts = new Map<SubscriptionPlan, number>();
    for (const t of this.rows()) counts.set(t.plan, (counts.get(t.plan) ?? 0) + 1);
    return [...counts.entries()]
      .map(([plan, count]) => ({ label: this.planLabel(plan), count }))
      .sort((a, b) => b.count - a.count);
  });

  constructor() { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.api.list(this.includeInactive).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  toggle(t: PlatformTenantListItem, activate: boolean): void {
    const verb = activate ? 'Reactivate' : 'Deactivate';
    if (!confirm(`${verb} tenant "${t.name}"?${activate ? '' : ' Users will not be able to sign in.'}`)) return;
    const obs = activate ? this.api.activate(t.id) : this.api.deactivate(t.id);
    obs.subscribe({
      next: () => { this.notify.success(`${t.name} ${activate ? 'reactivated' : 'deactivated'}.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }

  businessTypeLabel(t: BusinessType): string {
    return t === BusinessType.Restaurant ? 'Restaurant'
         : t === BusinessType.Retail ? 'Retail'
         : t === BusinessType.Wholesale ? 'Wholesale'
         : 'Unknown';
  }

  planLabel(p: SubscriptionPlan): string {
    return p === SubscriptionPlan.Basic ? 'Basic'
         : p === SubscriptionPlan.Standard ? 'Standard'
         : p === SubscriptionPlan.Premium ? 'Premium'
         : p === SubscriptionPlan.Enterprise ? 'Enterprise'
         : 'Unknown';
  }

  tenantInitial(name: string): string {
    return (name ?? '?').trim().charAt(0).toUpperCase();
  }

  /** Deterministic per-name color so the same tenant always gets the same avatar tint. */
  avatarColor(name: string): string {
    const palette = [
      'linear-gradient(135deg,#6366f1,#4f46e5)',
      'linear-gradient(135deg,#f59e0b,#d97706)',
      'linear-gradient(135deg,#10b981,#059669)',
      'linear-gradient(135deg,#ec4899,#db2777)',
      'linear-gradient(135deg,#0ea5e9,#0284c7)',
      'linear-gradient(135deg,#8b5cf6,#7c3aed)'
    ];
    let h = 0;
    for (const ch of name ?? '') h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
    return palette[Math.abs(h) % palette.length];
  }
}
