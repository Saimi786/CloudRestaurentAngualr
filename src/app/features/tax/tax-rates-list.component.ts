import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TaxRatesApi } from '../../core/api/tax-rates.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { TaxRateDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-tax-rates-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Tax Rates</h1>
        <p class="muted">Configure GST / VAT / sales-tax percentages applied to product sales.</p>
      </div>
      <div class="actions">
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin')) {
          <a class="btn btn-primary" routerLink="/tax-rates/new">+ New Rate</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr><th>Name</th><th>Percentage</th><th>Compound</th><th>Default</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="6" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="6" class="empty">No tax rates configured yet.</td></tr>
        } @else {
          @for (t of rows(); track t.id) {
            <tr [class.inactive]="!t.isActive">
              <td>{{ t.name }}</td>
              <td>{{ t.percentage }}%</td>
              <td>{{ t.isCompound ? 'Yes' : 'No' }}</td>
              <td>
                @if (t.isDefault) { <span class="badge badge-active">Default</span> }
              </td>
              <td>
                <span class="badge" [class.badge-active]="t.isActive" [class.badge-inactive]="!t.isActive">
                  {{ t.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/tax-rates', t.id]">Edit</a>
                @if (auth.hasRole('TenantAdmin') && t.isActive && !t.isDefault) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(t)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `
})
export class TaxRatesListComponent {
  private readonly api = inject(TaxRatesApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<TaxRateDto[]>([]);
  protected readonly loading = signal(true);
  protected includeInactive = false;

  constructor() { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.api.list(this.includeInactive).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  deactivate(t: TaxRateDto): void {
    if (!confirm(`Deactivate tax rate "${t.name}"?`)) return;
    this.api.deactivate(t.id).subscribe({
      next: () => { this.notify.success(`${t.name} deactivated.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
