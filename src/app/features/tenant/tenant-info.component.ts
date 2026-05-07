import { Component, inject, signal } from '@angular/core';
import { TenantsApi } from '../../core/api/tenants.api';
import { BusinessType, SubscriptionPlan, TenantDto } from '../../core/models';

@Component({
  selector: 'app-tenant-info',
  standalone: true,
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Tenant Info</h1>
        <p class="muted">Your subscription account on the platform.</p>
      </header>

      @let t = tenant();
      @if (loading()) {
        <div class="card">Loading…</div>
      } @else if (t) {
        <div class="card">
          <dl>
            <dt>Tenant ID</dt><dd class="mono">{{ t.id }}</dd>
            <dt>Name</dt><dd>{{ t.name }}</dd>
            <dt>Slug</dt><dd class="mono">{{ t.slug }}</dd>
            <dt>Business Type</dt><dd>{{ businessTypeLabel(t.businessType) }}</dd>
            <dt>Subscription Plan</dt><dd>{{ planLabel(t.plan) }}</dd>
            <dt>Status</dt><dd>{{ t.isActive ? 'Active' : 'Inactive' }}</dd>
          </dl>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 720px; }
    .page-header { margin-bottom: 1.25rem; }
    .page-header h1 { margin: 0 0 0.25rem; }
    .muted { margin: 0; color: #6b7280; font-size: 0.9rem; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.25rem 1.5rem; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1.25rem; margin: 0; }
    dt { font-weight: 600; color: #6b7280; font-size: 0.85rem; }
    dd { margin: 0; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
  `]
})
export class TenantInfoComponent {
  private readonly api = inject(TenantsApi);
  protected readonly tenant = signal<TenantDto | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.api.getCurrent().subscribe({
      next: t => { this.tenant.set(t); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  businessTypeLabel(t: BusinessType): string {
    return BusinessType[t];
  }

  planLabel(p: SubscriptionPlan): string {
    return SubscriptionPlan[p];
  }
}
