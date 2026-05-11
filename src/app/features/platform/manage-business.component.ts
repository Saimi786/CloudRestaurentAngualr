import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlatformBranchDto, PlatformTenantsApi } from '../../core/api/platform-tenants.api';
import { userMessage } from '../../core/errors/problem-details.helper';
import { BusinessType, PlatformTenantDetails, SubscriptionPlan } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

/**
 * SuperAdmin → "Manage Business" — Image 2 from the Blocks360 mockup.
 * Two header cards (business identity + owner), then a list of every branch
 * (location) under this tenant with a quick way to drill into each one.
 */
@Component({
  selector: 'app-manage-business',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page-header">
      <div>
        <h1>{{ tenant()?.name ?? 'Business' }}</h1>
        <p>Manage locations and users for this business.</p>
      </div>
      <div class="actions">
        <a class="btn" routerLink="/platform/tenants">← Back to all businesses</a>
        <a class="btn btn-primary" [routerLink]="['/platform/tenants', tenantId(), 'branches', 'new']" style="display:none;">+ Add New Location</a>
      </div>
    </div>

    @if (loading()) {
      <div class="muted" style="padding:1rem;">Loading business…</div>
    } @else if (tenant()) {
      @if (tenant()!; as t) {
      <div class="header-cards">
        <div class="info-card business">
          <div class="info-card-icon">🏢</div>
          <dl>
            <dt>Business Name</dt><dd>{{ t.name }}</dd>
            <dt>Slug</dt><dd class="mono">{{ t.slug }}</dd>
            <dt>Vertical</dt><dd>{{ businessTypeLabel(t.businessType) }}</dd>
            <dt>Plan</dt><dd>
              <span class="badge" [class]="'plan-' + t.plan">{{ planLabel(t.plan) }}</span>
            </dd>
            <dt>Status</dt><dd>
              @if (t.isActive) {
                <span class="badge badge-active">Active</span>
              } @else {
                <span class="badge badge-danger">Deactivated</span>
              }
            </dd>
          </dl>
        </div>

        <div class="info-card owner">
          <div class="info-card-icon">👤</div>
          <dl>
            <dt>Owner / Admin</dt><dd>{{ t.adminEmail ?? 'Not seeded' }}</dd>
            <dt>Companies</dt><dd>{{ t.companyCount }}</dd>
            <dt>Locations</dt><dd>{{ t.branchCount }}</dd>
            <dt>Users</dt><dd>{{ t.userCount }}</dd>
            <dt>Created</dt><dd>{{ t.createdAt | date:'mediumDate' }}</dd>
          </dl>
          <div class="info-card-actions">
            <a class="btn btn-sm" [routerLink]="['/platform/tenants', t.id]">✎ Edit Business</a>
          </div>
        </div>
      </div>

      <div class="panel locations-panel">
        <div class="panel-head">
          <h2>📍 Locations</h2>
          <span class="muted small">{{ branches().length }} location{{ branches().length === 1 ? '' : 's' }}</span>
        </div>

        @if (branches().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">📍</div>
            <p>No locations created for this business yet.</p>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:50px;">#</th>
                <th>Name</th>
                <th>Code</th>
                <th>Company</th>
                <th>City</th>
                <th>Country</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              @for (b of branches(); track b.id; let i = $index) {
                <tr [class.inactive]="!b.isActive">
                  <td class="muted">{{ i + 1 }}</td>
                  <td><strong>{{ b.name }}</strong></td>
                  <td class="mono">{{ b.code }}</td>
                  <td>{{ b.companyName }}</td>
                  <td>{{ b.city || '—' }}</td>
                  <td>{{ b.country || '—' }}</td>
                  <td class="mono small">{{ b.phoneNumber || '—' }}</td>
                  <td>
                    @if (b.isActive) {
                      <span class="badge badge-active">Active</span>
                    } @else {
                      <span class="badge badge-danger">Inactive</span>
                    }
                  </td>
                  <td class="manage-cell">
                    <a class="btn btn-sm" [routerLink]="['/branches', b.id]" title="Edit branch">✎</a>
                    <a class="btn btn-sm btn-accent"
                       [routerLink]="['/platform/tenants', tenantId(), 'branches', b.id]"
                       title="Manage this location">→</a>
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

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
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
      dd {
        margin: 0;
        color: var(--c-text);
        font-size: 0.88rem;
        align-self: center;
      }
      .mono { font-family: var(--font-mono); font-size: 0.82rem; }
      .info-card-actions {
        margin-top: 1rem;
        padding-top: 0.75rem;
        border-top: 1px dashed var(--c-divider);
      }
    }

    .locations-panel {
      padding: 1rem;
    }
    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      h2 { margin: 0; font-size: 1.05rem; }
    }
    .manage-cell {
      white-space: nowrap;
      .btn-sm { padding: 0.3rem 0.65rem; }
      .btn-accent { margin-left: 0.3rem; font-weight: 700; }
    }
    .empty-state {
      padding: 2.5rem 1rem;
      text-align: center;
      color: var(--c-text-subtle);
      .empty-icon { font-size: 2.5rem; opacity: 0.55; margin-bottom: 0.4rem; }
    }
    .badge.plan-0 { background: #e0e7ff; color: #3730a3; }
    .badge.plan-1 { background: #dbeafe; color: #1e40af; }
    .badge.plan-2 { background: #fef3c7; color: #92400e; }
    .badge.plan-3 { background: #fce7f3; color: #9d174d; }
  `]
})
export class ManageBusinessComponent {
  private readonly api = inject(PlatformTenantsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);

  protected readonly tenantId = signal<string>('');
  protected readonly tenant = signal<PlatformTenantDetails | null>(null);
  protected readonly branches = signal<PlatformBranchDto[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.tenantId.set(id);

    let tenantLoaded = false, branchesLoaded = false;
    const tryFinish = () => { if (tenantLoaded && branchesLoaded) this.loading.set(false); };

    this.api.get(id).subscribe({
      next: t => { this.tenant.set(t); tenantLoaded = true; tryFinish(); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
    this.api.branches(id).subscribe({
      next: list => { this.branches.set(list); branchesLoaded = true; tryFinish(); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  protected businessTypeLabel(t: BusinessType): string {
    return t === BusinessType.Restaurant ? 'Restaurant'
         : t === BusinessType.Retail ? 'Retail'
         : t === BusinessType.Wholesale ? 'Wholesale'
         : 'Unknown';
  }

  protected planLabel(p: SubscriptionPlan): string {
    return p === SubscriptionPlan.Basic ? 'Basic'
         : p === SubscriptionPlan.Standard ? 'Standard'
         : p === SubscriptionPlan.Premium ? 'Premium'
         : p === SubscriptionPlan.Enterprise ? 'Enterprise'
         : 'Unknown';
  }
}
