import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PriceRulesApi } from '../../../core/api/price-rules.api';
import { AuthService } from '../../../core/auth/auth.service';
import { userMessage } from '../../../core/errors/problem-details.helper';
import { DaysOfWeekFlags, PriceRuleDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-price-rules-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Price Rules</h1>
        <p class="muted">
          Override a Product's base price for specific branches, days, and time windows.
          Branch-specific rules win over branch-null; higher priority wins next.
        </p>
      </div>
      <div class="actions">
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin') || auth.hasRole('BranchManager')) {
          <a class="btn btn-primary" routerLink="/catalog/price-rules/new">+ New Rule</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Product</th>
          <th>Branch</th>
          <th>Days</th>
          <th>Window</th>
          <th style="text-align:right;">Override</th>
          <th style="text-align:right;">Priority</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="9" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="9" class="empty">No rules. Without rules, every Product uses its BasePrice.</td></tr>
        } @else {
          @for (r of rows(); track r.id) {
            <tr [class.inactive]="!r.isActive">
              <td>{{ r.name }}</td>
              <td>{{ r.productName }} <small class="mono muted">({{ r.productSku }})</small></td>
              <td>{{ r.branchName || 'all' }}</td>
              <td class="mono">{{ daysLabel(r.daysOfWeek) }}</td>
              <td class="mono">{{ r.startTime ? r.startTime.substring(0,5) + '–' + r.endTime!.substring(0,5) : 'all day' }}</td>
              <td style="text-align:right;" class="mono">{{ r.overridePriceAmount | number:'1.2-2' }} {{ r.overridePriceCurrency }}</td>
              <td style="text-align:right;">{{ r.priority }}</td>
              <td>
                <span class="badge" [class.badge-active]="r.isActive" [class.badge-inactive]="!r.isActive">
                  {{ r.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/catalog/price-rules', r.id]">Edit</a>
                @if ((auth.hasRole('TenantAdmin') || auth.hasRole('BranchManager')) && r.isActive) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(r)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`.mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }`]
})
export class PriceRulesListComponent {
  private readonly api = inject(PriceRulesApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<PriceRuleDto[]>([]);
  protected readonly loading = signal(true);
  protected includeInactive = false;

  constructor() { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.api.list({ includeInactive: this.includeInactive }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  daysLabel(flags: number): string {
    if (flags === 0 || flags === DaysOfWeekFlags.All) return 'every day';
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return labels.filter((_, i) => (flags & (1 << i)) !== 0).join(', ');
  }

  deactivate(r: PriceRuleDto): void {
    if (!confirm(`Deactivate rule "${r.name}"?`)) return;
    this.api.deactivate(r.id).subscribe({
      next: () => { this.notify.success('Rule deactivated.'); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
