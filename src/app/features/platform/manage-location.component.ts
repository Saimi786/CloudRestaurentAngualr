import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  PlatformBranchDetailDto, PlatformTenantsApi, UserSummaryLike
} from '../../core/api/platform-tenants.api';
import { userMessage } from '../../core/errors/problem-details.helper';
import { BusinessType, SubscriptionPlan } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

/**
 * SuperAdmin → "Manage Location" — Image 3 from the Blocks360 mockup.
 * Business + Owner cards at the top, then a Location card, then two sections:
 * Location Terminals (placeholder — we don't model terminals yet) and Location Users.
 */
@Component({
  selector: 'app-manage-location',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Manage Location</h1>
        <p>Operate this single location: terminals and assigned users.</p>
      </div>
      <a class="btn" [routerLink]="['/platform/tenants', tenantId(), 'manage']">← Back to business</a>
    </div>

    @if (loading()) {
      <div class="muted" style="padding:1rem;">Loading location…</div>
    } @else if (detail()) {
      @if (detail()!; as d) {
      <div class="header-cards">
        <div class="info-card business">
          <div class="info-card-icon">🏢</div>
          <dl>
            <dt>Business Name</dt><dd>{{ d.tenantName }}</dd>
            <dt>Location Name</dt><dd>{{ d.branchName }} <span class="muted small">({{ d.branchCode }})</span></dd>
            <dt>Vertical</dt><dd>{{ businessTypeLabel(d.tenantBusinessType) }}</dd>
            <dt>Plan</dt><dd><span class="badge" [class]="'plan-' + d.tenantPlan">{{ planLabel(d.tenantPlan) }}</span></dd>
            <dt>Status</dt><dd>
              @if (d.branchIsActive) { <span class="badge badge-active">Active</span> }
              @else { <span class="badge badge-danger">Inactive</span> }
            </dd>
          </dl>
        </div>

        <div class="info-card owner">
          <div class="info-card-icon">👤</div>
          <dl>
            <dt>Owner / Admin</dt><dd>{{ d.ownerEmail ?? 'Not seeded' }}</dd>
            <dt>Company</dt><dd>{{ d.companyName }}</dd>
            <dt>Legal Name</dt><dd>{{ d.companyLegalName }}</dd>
            <dt>Time Zone</dt><dd class="mono">{{ d.timeZone }}</dd>
          </dl>
        </div>
      </div>

      <div class="panel address-panel">
        <h2>📍 Address</h2>
        <p class="address-text">
          {{ d.addressLine1 || '—' }}@if (d.addressLine2) {, {{ d.addressLine2 }}}<br>
          {{ d.city || '' }}@if (d.city && d.state) {, }{{ d.state || '' }}
          {{ d.postalCode || '' }}<br>
          {{ d.country || '—' }}
        </p>
        <div style="margin-top:0.75rem;">
          <a class="btn btn-sm" [routerLink]="['/branches', d.branchId]">✎ Edit Location</a>
        </div>
      </div>

      <!-- ===== Location Terminals (placeholder until Terminal entity is built) ===== -->
      <div class="panel section-panel">
        <div class="section-head">
          <h2>🖥️ Location Terminals</h2>
          <button class="btn btn-sm" disabled title="Terminal management coming soon">+ Add Terminal</button>
        </div>
        <div class="empty-state">
          <div class="empty-icon">🖥️</div>
          <p><strong>Point-of-sale terminals aren't modeled yet.</strong></p>
          <p class="muted small">
            Terminal Code / Licence Key / MAC binding will land alongside the offline-POS
            sync work — until then, every device hits the API directly with a per-user JWT.
          </p>
        </div>
      </div>

      <!-- ===== Location Users ===== -->
      <div class="panel section-panel">
        <div class="section-head">
          <h2>👥 Location Users</h2>
          <span class="muted small">{{ users().length }} user{{ users().length === 1 ? '' : 's' }} assigned</span>
        </div>

        @if (loadingUsers()) {
          <div class="muted" style="padding:0.5rem;">Loading users…</div>
        } @else if (users().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">👤</div>
            <p>No users are assigned to this location yet.</p>
            <p class="muted small">Assign users via the <a routerLink="/users">Users</a> page —
              each user can carry up to one branch in their JWT scope.</p>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:50px;">#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Max Discount</th>
                <th>Last Login</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id; let i = $index) {
                <tr [class.inactive]="!u.isActive">
                  <td class="muted">{{ i + 1 }}</td>
                  <td><strong>{{ u.fullName }}</strong></td>
                  <td class="mono small">{{ u.email }}</td>
                  <td>
                    @for (r of u.roles; track r) {
                      <span class="badge badge-primary">{{ r }}</span>
                    }
                  </td>
                  <td class="mono">{{ u.maxDiscountPercent === null ? '—' : (u.maxDiscountPercent + '%') }}</td>
                  <td class="muted small">{{ u.lastLoginAt ? (u.lastLoginAt | date:'short') : 'Never' }}</td>
                  <td>
                    @if (u.isActive) { <span class="badge badge-active">Active</span> }
                    @else { <span class="badge badge-inactive">Inactive</span> }
                  </td>
                  <td>
                    <button class="btn btn-sm" (click)="resetPassword(u)" [disabled]="resettingFor() === u.id">
                      {{ resettingFor() === u.id ? '…' : 'Update Password' }}
                    </button>
                    <a class="btn btn-sm btn-ghost" [routerLink]="['/users', u.id]" title="Open user">✎</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
      }
    }
  `,
  styles: [`
    .header-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.25rem;
      @media (max-width: 900px) { grid-template-columns: 1fr; }
    }
    .info-card {
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem 1.5rem;
      box-shadow: var(--shadow-xs);
      position: relative;

      .info-card-icon {
        position: absolute;
        top: 1.25rem; right: 1.25rem;
        width: 44px; height: 44px;
        display: grid; place-items: center;
        border-radius: var(--radius-md);
        background: var(--c-primary-soft);
        font-size: 1.4rem;
      }
      &.business .info-card-icon { background: #fee2e2; }
      &.owner    .info-card-icon { background: #fef3c7; }

      dl {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 0.5rem 1rem;
        margin: 0;
        padding-right: 60px;
      }
      dt {
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--c-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        align-self: center;
      }
      dd { margin: 0; color: var(--c-text); font-size: 0.88rem; align-self: center; }
      .mono { font-family: var(--font-mono); font-size: 0.82rem; }
    }

    .address-panel {
      margin-bottom: 1.25rem;
      h2 { margin: 0 0 0.5rem; font-size: 1rem; }
      .address-text { margin: 0; font-size: 0.92rem; color: var(--c-text); line-height: 1.5; }
    }

    .section-panel {
      margin-bottom: 1rem;
      padding: 1rem 1.25rem 1.25rem;
    }
    .section-head {
      display: flex; justify-content: space-between; align-items: center;
      padding-bottom: 0.65rem;
      border-bottom: 1px solid var(--c-divider);
      margin-bottom: 0.85rem;
      h2 { margin: 0; font-size: 1.05rem; }
    }
    .empty-state {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--c-text-subtle);
      .empty-icon { font-size: 2.5rem; opacity: 0.55; margin-bottom: 0.4rem; }
      p { margin: 0.25rem 0; }
    }

    .badge.plan-0 { background: #e0e7ff; color: #3730a3; }
    .badge.plan-1 { background: #dbeafe; color: #1e40af; }
    .badge.plan-2 { background: #fef3c7; color: #92400e; }
    .badge.plan-3 { background: #fce7f3; color: #9d174d; }
  `]
})
export class ManageLocationComponent {
  private readonly api = inject(PlatformTenantsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);

  protected readonly tenantId = signal<string>('');
  protected readonly branchId = signal<string>('');
  protected readonly detail = signal<PlatformBranchDetailDto | null>(null);
  protected readonly users = signal<UserSummaryLike[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingUsers = signal(true);
  protected readonly resettingFor = signal<string | null>(null);

  constructor() {
    const tid = this.route.snapshot.paramMap.get('tenantId');
    const bid = this.route.snapshot.paramMap.get('branchId');
    if (!tid || !bid) return;
    this.tenantId.set(tid);
    this.branchId.set(bid);

    this.api.branchDetail(bid).subscribe({
      next: d => { this.detail.set(d); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
    this.api.branchUsers(bid).subscribe({
      next: list => { this.users.set(list); this.loadingUsers.set(false); },
      error: err => { this.loadingUsers.set(false); this.notify.error(userMessage(err)); }
    });
  }

  protected resetPassword(u: UserSummaryLike): void {
    const newPwd = prompt(`Reset password for ${u.email}\n\nNew password (8+ chars, upper/lower/digit/symbol):`);
    if (!newPwd) return;
    this.resettingFor.set(u.id);
    this.api.resetUserPassword(u.id, newPwd).subscribe({
      next: () => {
        this.resettingFor.set(null);
        this.notify.success(`Password reset for ${u.email}.`);
      },
      error: err => {
        this.resettingFor.set(null);
        this.notify.error(userMessage(err));
      }
    });
  }

  protected businessTypeLabel(t: BusinessType | number): string {
    return t === BusinessType.Restaurant ? 'Restaurant'
         : t === BusinessType.Retail ? 'Retail'
         : t === BusinessType.Wholesale ? 'Wholesale'
         : 'Unknown';
  }

  protected planLabel(p: SubscriptionPlan | number): string {
    return p === SubscriptionPlan.Basic ? 'Basic'
         : p === SubscriptionPlan.Standard ? 'Standard'
         : p === SubscriptionPlan.Premium ? 'Premium'
         : p === SubscriptionPlan.Enterprise ? 'Enterprise'
         : 'Unknown';
  }
}
