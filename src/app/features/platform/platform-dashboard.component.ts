import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PlatformTenantsApi } from '../../core/api/platform-tenants.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { PlatformTenantListItem, SubscriptionPlan } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

type Period = 'weekly' | 'monthly' | 'yearly';

interface KpiCard {
  label: string;
  value: number | string;
  icon: string;
  gradient: string;
  bar: string;
}

@Component({
  selector: 'app-platform-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <!-- ============ HEADER ============ -->
    <div class="dash-head">
      <div>
        <h1>Business Dashboard</h1>
        <p class="muted">Monitor your business metrics in real-time</p>
      </div>
      <select class="period-picker" [(ngModel)]="period">
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>
    </div>

    @if (loading()) {
      <div class="muted" style="padding:1rem;">Loading platform stats…</div>
    } @else {
      <!-- ============ KPI GRID ============ -->
      <div class="kpi-row">
        @for (k of kpis(); track k.label) {
          <div class="kpi-card">
            <div class="kpi-top">
              <div class="kpi-icon" [style.background]="k.gradient">{{ k.icon }}</div>
              <span class="kpi-period">{{ periodLabel() }}</span>
            </div>
            <div class="kpi-value">{{ k.value }}</div>
            <div class="kpi-label">{{ k.label }}</div>
            <div class="kpi-bar" [style.background]="k.bar"></div>
          </div>
        }
      </div>

      <!-- ============ TOP 5 BUSINESSES ============ -->
      <div class="panel-card">
        <h2 class="section-title">Top Five Businesses</h2>
        @if (topFive().length === 0) {
          <div class="empty">No businesses on the platform yet.</div>
        } @else {
          <div class="top-five">
            @for (t of topFive(); track t.id) {
              <a class="biz-tile" [routerLink]="['/platform/tenants', t.id, 'manage']" [title]="t.name + ' — ' + t.branchCount + ' locations'">
                <div class="biz-avatar" [style.background]="avatarColor(t.name)">
                  {{ initial(t.name) }}
                </div>
                <div class="biz-name">{{ t.name }}</div>
                <div class="biz-meta muted">{{ t.branchCount }} loc · {{ t.userCount }} users</div>
              </a>
            }
          </div>
        }
      </div>

      <!-- ============ CHARTS ROW ============ -->
      <div class="charts-row">
        <!-- Business Distribution (pie via conic-gradient) -->
        <div class="panel-card">
          <h2 class="section-title">Business Distribution</h2>
          @if (tenants().length === 0) {
            <div class="empty">No data.</div>
          } @else {
            <div class="pie-wrap">
              <div class="pie" [style.background]="pieGradient()"></div>
              <ul class="pie-legend">
                <li><span class="dot" style="background:#ec4899"></span> New Registrations <strong>{{ newRegistrations() }}</strong></li>
                <li><span class="dot" style="background:#3b82f6"></span> Current Registrations <strong>{{ activeCount() }}</strong></li>
                <li><span class="dot" style="background:#f59e0b"></span> Expired Registrations <strong>{{ expiredCount() }}</strong></li>
              </ul>
            </div>
          }
        </div>

        <!-- Registration Trends (bar chart by month) -->
        <div class="panel-card">
          <h2 class="section-title">Registration Trends</h2>
          <div class="bar-wrap">
            <div class="bar-grid">
              @for (b of monthlyBars(); track b.label) {
                <div class="bar-col">
                  <div class="bar" [style.height.%]="b.heightPct" [title]="b.count + ' sign-ups in ' + b.label">
                    @if (b.count > 0) { <span class="bar-val">{{ b.count }}</span> }
                  </div>
                  <div class="bar-label">{{ b.label }}</div>
                </div>
              }
            </div>
            @if (noBarData()) {
              <div class="empty" style="position:absolute; inset:0; display:grid; place-items:center; pointer-events:none;">No sign-ups in this period.</div>
            }
          </div>
        </div>
      </div>

      <!-- ============ RECENT BUSINESSES TABLE ============ -->
      <div class="panel-card">
        <div class="section-head">
          <h2 class="section-title">Recently Added</h2>
          <a routerLink="/platform/tenants" class="btn btn-sm">View all →</a>
        </div>
        @if (recentTenants().length === 0) {
          <div class="empty">No businesses yet.</div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Plan</th>
                <th style="text-align:right;">Locations</th>
                <th style="text-align:right;">Users</th>
                <th>Added</th>
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
                  <td class="muted small">{{ t.createdAt | date:'mediumDate' }}</td>
                  <td>
                    @if (t.isActive) { <span class="badge badge-active">Active</span> }
                    @else { <span class="badge badge-danger">Deactivated</span> }
                  </td>
                  <td style="text-align:right;">
                    <a class="btn btn-sm btn-accent" [routerLink]="['/platform/tenants', t.id, 'manage']">→ Manage</a>
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
    /* ---- Header ---- */
    .dash-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
      h1 { margin: 0; font-size: 1.6rem; letter-spacing: -0.02em; }
      .muted { margin: 0.15rem 0 0; font-size: 0.92rem; }
    }
    .period-picker {
      padding: 0.55rem 0.85rem;
      border: 1px solid var(--c-border-strong);
      border-radius: var(--radius-md);
      background: var(--c-surface);
      font-family: inherit;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--c-text);
      min-width: 140px;
      cursor: pointer;
      &:focus { outline: none; border-color: var(--c-primary); box-shadow: var(--shadow-focus); }
    }

    /* ---- KPI cards ---- */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1rem;
      margin-bottom: 1.25rem;
      @media (max-width: 1100px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      @media (max-width: 560px)  { grid-template-columns: 1fr; }
    }
    .kpi-card {
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius-lg);
      padding: 1.1rem 1.25rem 0;
      box-shadow: var(--shadow-xs);
      display: flex; flex-direction: column;
      transition: transform var(--t-fast), box-shadow var(--t-fast);
      overflow: hidden;
      position: relative;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
    }
    .kpi-top {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 0.75rem;
    }
    .kpi-icon {
      width: 44px; height: 44px;
      border-radius: 10px;
      display: grid; place-items: center;
      font-size: 1.35rem;
      color: #fff;
      box-shadow: 0 6px 12px rgba(15, 23, 42, 0.12);
    }
    .kpi-period {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--c-text-muted);
      background: var(--c-surface-alt);
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-pill);
      text-transform: capitalize;
      letter-spacing: 0.02em;
    }
    .kpi-value {
      font-size: 2.1rem;
      font-weight: 700;
      color: var(--c-text-strong);
      letter-spacing: -0.025em;
      font-feature-settings: 'tnum';
      line-height: 1.1;
    }
    .kpi-label {
      font-size: 0.88rem;
      color: var(--c-text-muted);
      margin: 0.25rem 0 0.85rem;
    }
    .kpi-bar {
      height: 5px;
      margin: 0 -1.25rem;
      border-radius: 0;
    }

    /* ---- Panels ---- */
    .panel-card {
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem 1.5rem;
      box-shadow: var(--shadow-xs);
      margin-bottom: 1.25rem;
    }
    .section-title {
      margin: 0 0 1rem;
      font-size: 1.05rem;
      letter-spacing: -0.01em;
    }
    .section-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0.5rem;
      .section-title { margin: 0; }
    }
    .empty {
      padding: 1.5rem 1rem;
      text-align: center;
      color: var(--c-text-subtle);
      font-size: 0.88rem;
    }

    /* ---- Top 5 ---- */
    .top-five {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.75rem;
      @media (max-width: 800px) { grid-template-columns: repeat(2, 1fr); }
    }
    .biz-tile {
      display: flex; flex-direction: column; align-items: center;
      gap: 0.45rem;
      padding: 1.1rem 0.75rem 0.85rem;
      background: var(--c-surface-alt);
      border: 1px solid var(--c-border);
      border-radius: var(--radius-lg);
      text-decoration: none;
      color: var(--c-text);
      text-align: center;
      transition: all var(--t-fast);
      &:hover {
        border-color: var(--c-primary);
        background: var(--c-primary-soft);
        transform: translateY(-2px);
      }
    }
    .biz-avatar {
      width: 56px; height: 56px;
      border-radius: 14px;
      display: grid; place-items: center;
      color: #fff;
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
    }
    .biz-name {
      font-weight: 600;
      font-size: 0.88rem;
      line-height: 1.2;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-width: 100%;
    }
    .biz-meta { font-size: 0.72rem; }

    /* ---- Charts row ---- */
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.25rem;
      @media (max-width: 900px) { grid-template-columns: 1fr; }
    }
    .pie-wrap {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 1.5rem;
      align-items: center;
      @media (max-width: 600px) { grid-template-columns: 1fr; justify-items: center; }
    }
    .pie {
      width: 180px; height: 180px;
      border-radius: 50%;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
      position: relative;
      &::before {
        content: '';
        position: absolute;
        inset: 28%;
        background: var(--c-surface);
        border-radius: 50%;
      }
    }
    .pie-legend {
      list-style: none;
      padding: 0; margin: 0;
      display: flex; flex-direction: column;
      gap: 0.6rem;
      li {
        display: flex; align-items: center; gap: 0.6rem;
        font-size: 0.88rem; color: var(--c-text-muted);
        strong { margin-left: auto; color: var(--c-text); font-feature-settings: 'tnum'; }
      }
      .dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    }

    .bar-wrap {
      position: relative;
      height: 220px;
    }
    .bar-grid {
      height: 100%;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      gap: 0.5rem;
      align-items: end;
      padding-bottom: 1.5rem;
    }
    .bar-col {
      display: flex; flex-direction: column; align-items: center;
      height: 100%;
      justify-content: flex-end;
      position: relative;
    }
    .bar {
      width: 70%;
      max-width: 36px;
      background: linear-gradient(180deg, var(--c-primary) 0%, #6366f1 100%);
      border-radius: 6px 6px 0 0;
      min-height: 4px;
      transition: height var(--t-med);
      position: relative;
      box-shadow: 0 -2px 8px rgba(79, 70, 229, 0.18);
      &:hover { filter: brightness(1.05); }
    }
    .bar-val {
      position: absolute; top: -1.2rem; left: 50%; transform: translateX(-50%);
      font-size: 0.7rem; font-weight: 600; color: var(--c-text);
      font-feature-settings: 'tnum';
    }
    .bar-label {
      position: absolute; bottom: 0;
      font-size: 0.72rem;
      color: var(--c-text-muted);
      font-weight: 500;
    }

    /* ---- Recent table ---- */
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
  protected period: Period = 'monthly';

  /** Counts derived from the tenant list. */
  protected readonly totalCount = computed(() => this.tenants().length);
  protected readonly activeCount = computed(() => this.tenants().filter(t => t.isActive).length);
  protected readonly inactiveCount = computed(() => this.totalCount() - this.activeCount());

  /** "Expired registrations" — we don't have a real billing-expiry concept yet,
   *  so derive a proxy: deactivated tenants that were created > 1 year ago. */
  protected readonly expiredCount = computed(() => {
    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
    return this.tenants().filter(t => !t.isActive && new Date(t.createdAt).getTime() < cutoff).length;
  });

  /** "New registrations" inside the selected period. */
  protected readonly newRegistrations = computed(() => {
    const cutoff = this.periodCutoff();
    return this.tenants().filter(t => new Date(t.createdAt).getTime() >= cutoff).length;
  });

  /** Total users across all tenants. */
  protected readonly totalUsers = computed(() => this.tenants().reduce((s, t) => s + t.userCount, 0));

  /** Active users: we don't get a per-tenant active flag, so approximate by
   *  counting users in active tenants only. */
  protected readonly totalActiveUsers = computed(() =>
    this.tenants().filter(t => t.isActive).reduce((s, t) => s + t.userCount, 0));

  protected readonly topFive = computed(() =>
    [...this.tenants()]
      .sort((a, b) => b.branchCount - a.branchCount || b.userCount - a.userCount)
      .slice(0, 5));

  protected readonly recentTenants = computed(() =>
    [...this.tenants()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5));

  /** The 8 KPI cards in Blocks360 order. */
  protected readonly kpis = computed<KpiCard[]>(() => [
    {
      label: 'Total Businesses', value: this.totalCount(), icon: '🏢',
      gradient: 'linear-gradient(135deg,#8b5cf6,#6366f1)', bar: 'linear-gradient(90deg,#8b5cf6,#6366f1)',
    },
    {
      label: 'Active Businesses', value: this.activeCount(), icon: '✓',
      gradient: 'linear-gradient(135deg,#14b8a6,#0d9488)', bar: 'linear-gradient(90deg,#14b8a6,#0d9488)',
    },
    {
      label: 'Inactive Businesses', value: this.inactiveCount(), icon: '⊘',
      gradient: 'linear-gradient(135deg,#f97316,#ea580c)', bar: 'linear-gradient(90deg,#f97316,#ea580c)',
    },
    {
      label: 'Expired Registrations', value: this.expiredCount(), icon: '⏱',
      gradient: 'linear-gradient(135deg,#ec4899,#db2777)', bar: 'linear-gradient(90deg,#ec4899,#db2777)',
    },
    {
      label: 'New Registrations', value: this.newRegistrations(), icon: '⚑',
      gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)', bar: 'linear-gradient(90deg,#6366f1,#4f46e5)',
    },
    {
      label: 'Current Registrations', value: this.activeCount(), icon: '📋',
      gradient: 'linear-gradient(135deg,#10b981,#059669)', bar: 'linear-gradient(90deg,#10b981,#059669)',
    },
    {
      label: 'Total Users', value: this.totalUsers(), icon: '👥',
      gradient: 'linear-gradient(135deg,#a855f7,#7c3aed)', bar: 'linear-gradient(90deg,#a855f7,#7c3aed)',
    },
    {
      label: 'Total Active Users', value: this.totalActiveUsers(), icon: '👤',
      gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', bar: 'linear-gradient(90deg,#f59e0b,#d97706)',
    },
  ]);

  /** Pie chart for Business Distribution — uses CSS conic-gradient. */
  protected readonly pieGradient = computed(() => {
    const a = this.newRegistrations();
    const b = this.activeCount();
    const c = this.expiredCount();
    const total = a + b + c;
    if (total === 0) return 'conic-gradient(#e2e8f0 0 100%)';
    const pa = (a / total) * 100;
    const pb = pa + (b / total) * 100;
    return `conic-gradient(
      #ec4899 0 ${pa}%,
      #3b82f6 ${pa}% ${pb}%,
      #f59e0b ${pb}% 100%)`;
  });

  /** Monthly buckets for the bar chart — last 6 buckets of the selected period. */
  protected readonly monthlyBars = computed(() => {
    const buckets = this.buildBuckets();
    const max = Math.max(1, ...buckets.map(b => b.count));
    return buckets.map(b => ({ ...b, heightPct: (b.count / max) * 80 + 4 }));
  });

  /** Cached so the template doesn't need an arrow-function .every call. */
  protected readonly noBarData = computed(() => this.monthlyBars().every(b => b.count === 0));

  protected readonly periodLabel = computed(() =>
    this.period === 'weekly' ? 'Weekly' : this.period === 'yearly' ? 'Yearly' : 'Monthly');

  constructor() {
    this.api.list(true).subscribe({
      next: list => { this.tenants.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  private periodCutoff(): number {
    const now = Date.now();
    return this.period === 'weekly'  ? now - 7 * 24 * 60 * 60 * 1000
         : this.period === 'yearly'  ? now - 365 * 24 * 60 * 60 * 1000
         : now - 30 * 24 * 60 * 60 * 1000;
  }

  private buildBuckets(): { label: string; count: number }[] {
    // Always 6 buckets, period-sized. Weekly = 6 weeks; monthly = 6 months; yearly = 6 years.
    const now = new Date();
    const buckets: { label: string; count: number; from: number; to: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now);
      const to = new Date(now);
      let label = '';
      if (this.period === 'weekly') {
        from.setDate(now.getDate() - (i + 1) * 7);
        to.setDate(now.getDate() - i * 7);
        label = `W${6 - i}`;
      } else if (this.period === 'yearly') {
        from.setFullYear(now.getFullYear() - (i + 1));
        to.setFullYear(now.getFullYear() - i);
        label = String(now.getFullYear() - i);
      } else {
        from.setMonth(now.getMonth() - (i + 1));
        to.setMonth(now.getMonth() - i);
        label = from.toLocaleString('default', { month: 'short' });
      }
      buckets.push({ label, count: 0, from: from.getTime(), to: to.getTime() });
    }
    for (const t of this.tenants()) {
      const created = new Date(t.createdAt).getTime();
      for (const b of buckets) {
        if (created >= b.from && created < b.to) { b.count++; break; }
      }
    }
    return buckets.map(b => ({ label: b.label, count: b.count }));
  }

  protected planLabel(p: SubscriptionPlan): string {
    return p === SubscriptionPlan.Basic ? 'Basic'
         : p === SubscriptionPlan.Standard ? 'Standard'
         : p === SubscriptionPlan.Premium ? 'Premium'
         : p === SubscriptionPlan.Enterprise ? 'Enterprise'
         : 'Unknown';
  }

  protected initial(name: string): string {
    return (name ?? '?').trim().charAt(0).toUpperCase();
  }

  protected avatarColor(name: string): string {
    const palette = [
      'linear-gradient(135deg,#6366f1,#4f46e5)',
      'linear-gradient(135deg,#f59e0b,#d97706)',
      'linear-gradient(135deg,#10b981,#059669)',
      'linear-gradient(135deg,#ec4899,#db2777)',
      'linear-gradient(135deg,#0ea5e9,#0284c7)',
      'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    ];
    let h = 0;
    for (const ch of name ?? '') h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
    return palette[Math.abs(h) % palette.length];
  }
}
