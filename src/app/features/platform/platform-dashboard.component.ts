import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlatformTenantsApi } from '../../core/api/platform-tenants.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { PlatformTenantListItem, SubscriptionPlan } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-platform-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ greeting() }}, {{ firstName(auth.user()?.fullName ?? '') }} ⚡</h1>
        <p>Platform-level overview across every business on this deployment.</p>
      </div>
      <a class="btn btn-primary" routerLink="/platform/tenants">+ Add New Business</a>
    </div>

    @if (loading()) {
      <div class="muted" style="padding:1rem;">Loading platform stats…</div>
    } @else {
      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-icon">🏢</div>
          <span class="kpi-label">Total Businesses</span>
          <span class="kpi-value">{{ tenants().length }}</span>
          <span class="kpi-meta">{{ activeCount() }} active · {{ tenants().length - activeCount() }} deactivated</span>
        </div>
        <div class="kpi">
          <div class="kpi-icon">📍</div>
          <span class="kpi-label">Total Locations</span>
          <span class="kpi-value">{{ totalBranches() }}</span>
          <span class="kpi-meta">Across every business</span>
        </div>
        <div class="kpi">
          <div class="kpi-icon">👥</div>
          <span class="kpi-label">Total Users</span>
          <span class="kpi-value">{{ totalUsers() }}</span>
          <span class="kpi-meta">All tenants combined</span>
        </div>
        <div class="kpi">
          <div class="kpi-icon">💼</div>
          <span class="kpi-label">Plan Mix</span>
          <span class="kpi-value" style="font-size:0.92rem; line-height:1.45;">
            @for (kv of planBreakdown(); track kv.label) {
              <div>{{ kv.label }}: <strong>{{ kv.count }}</strong></div>
            }
          </span>
        </div>
      </div>

      <div class="quick-grid">
        <a class="quick" routerLink="/platform/tenants">
          <div class="quick-ico">🏢</div>
          <div>
            <strong>Manage Businesses</strong>
            <div class="muted small">View, edit, deactivate any business</div>
          </div>
        </a>
        <a class="quick" routerLink="/roles">
          <div class="quick-ico">🔐</div>
          <div>
            <strong>Roles &amp; Permissions</strong>
            <div class="muted small">Edit platform-wide role catalog</div>
          </div>
        </a>
        <a class="quick" routerLink="/settings">
          <div class="quick-ico">⚙️</div>
          <div>
            <strong>Business Settings</strong>
            <div class="muted small">Tenant config (currency, tax, RP…)</div>
          </div>
        </a>
        <a class="quick" routerLink="/users">
          <div class="quick-ico">👤</div>
          <div>
            <strong>Users</strong>
            <div class="muted small">Manage individual user accounts</div>
          </div>
        </a>
      </div>

      <div class="panel recent-businesses">
        <div class="panel-head">
          <h2>Recently Added Businesses</h2>
          <a routerLink="/platform/tenants" class="btn btn-sm">View all →</a>
        </div>
        @if (recentTenants().length === 0) {
          <p class="muted">No businesses on the platform yet.</p>
        } @else {
          <table class="data-table" style="margin-top:0.5rem;">
            <thead>
              <tr>
                <th>Business</th>
                <th>Plan</th>
                <th style="text-align:right;">Locations</th>
                <th style="text-align:right;">Users</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (t of recentTenants(); track t.id) {
                <tr>
                  <td><strong>{{ t.name }}</strong></td>
                  <td><span class="badge" [class]="'plan-' + t.plan">{{ planLabel(t.plan) }}</span></td>
                  <td style="text-align:right;" class="mono">{{ t.branchCount }}</td>
                  <td style="text-align:right;" class="mono">{{ t.userCount }}</td>
                  <td>
                    @if (t.isActive) {
                      <span class="badge badge-active">Active</span>
                    } @else {
                      <span class="badge badge-danger">Deactivated</span>
                    }
                  </td>
                  <td style="text-align:right;">
                    <a class="btn btn-sm" [routerLink]="['/platform/tenants', t.id, 'manage']">Manage</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }
  `,
  styles: [`
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.85rem;
      margin-bottom: 1.5rem;
    }
    .quick {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.95rem 1.15rem;
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius-lg);
      text-decoration: none;
      color: var(--c-text);
      box-shadow: var(--shadow-xs);
      transition: all var(--t-fast);
      &:hover {
        border-color: var(--c-accent);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        color: var(--c-text);
      }
    }
    .quick-ico {
      width: 42px; height: 42px;
      display: grid; place-items: center;
      border-radius: var(--radius-md);
      background: var(--c-accent-soft);
      font-size: 1.25rem;
    }
    .recent-businesses {
      max-width: none;
    }
    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      h2 { margin: 0; font-size: 1rem; }
    }
    .badge.plan-0 { background: #e0e7ff; color: #3730a3; }
    .badge.plan-1 { background: #dbeafe; color: #1e40af; }
    .badge.plan-2 { background: #fef3c7; color: #92400e; }
    .badge.plan-3 { background: #fce7f3; color: #9d174d; }
  `]
})
export class PlatformDashboardComponent {
  private readonly api = inject(PlatformTenantsApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly tenants = signal<PlatformTenantListItem[]>([]);
  protected readonly loading = signal(true);

  protected readonly activeCount = computed(() => this.tenants().filter(t => t.isActive).length);
  protected readonly totalBranches = computed(() => this.tenants().reduce((s, t) => s + t.branchCount, 0));
  protected readonly totalUsers = computed(() => this.tenants().reduce((s, t) => s + t.userCount, 0));

  protected readonly recentTenants = computed(() =>
    [...this.tenants()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5));

  protected readonly planBreakdown = computed(() => {
    const counts = new Map<SubscriptionPlan, number>();
    for (const t of this.tenants()) counts.set(t.plan, (counts.get(t.plan) ?? 0) + 1);
    return [...counts.entries()]
      .map(([plan, count]) => ({ label: this.planLabel(plan), count }))
      .sort((a, b) => b.count - a.count);
  });

  constructor() {
    this.api.list(true).subscribe({
      next: list => { this.tenants.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  protected greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  protected firstName(fullName: string): string {
    return (fullName ?? '').trim().split(/\s+/)[0] ?? '';
  }

  protected planLabel(p: SubscriptionPlan): string {
    return p === SubscriptionPlan.Basic ? 'Basic'
         : p === SubscriptionPlan.Standard ? 'Standard'
         : p === SubscriptionPlan.Premium ? 'Premium'
         : p === SubscriptionPlan.Enterprise ? 'Enterprise'
         : 'Unknown';
  }
}
