import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MixMatchApi } from '../../../core/api/mix-match.api';
import { AuthService } from '../../../core/auth/auth.service';
import { userMessage } from '../../../core/errors/problem-details.helper';
import { DaysOfWeekFlags, MixMatchGroupDto, MixMatchType } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-mix-match-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Mix &amp; Match Groups</h1>
        <p class="muted">
          "Buy any N from this group" promotions. Time- and day-restricted; flat amount,
          percent, or fixed group price.
        </p>
      </div>
      <div class="actions">
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin')) {
          <a class="btn btn-primary" routerLink="/catalog/mix-match/new">+ New Group</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th style="text-align:right;">Qty</th>
          <th style="text-align:right;">Discount</th>
          <th>Days</th>
          <th>Window</th>
          <th style="text-align:right;">Products</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="9" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="9" class="empty">No groups yet.</td></tr>
        } @else {
          @for (r of rows(); track r.id) {
            <tr [class.inactive]="!r.isActive">
              <td>{{ r.name }}</td>
              <td>{{ typeLabel(r.type) }}</td>
              <td style="text-align:right;">{{ r.quantity }}</td>
              <td style="text-align:right;" class="mono">{{ formatDiscount(r) }}</td>
              <td class="mono">{{ daysLabel(r.daysOfWeek) }}</td>
              <td class="mono">{{ r.startTime ? r.startTime.substring(0,5) + '–' + r.endTime!.substring(0,5) : 'all day' }}</td>
              <td style="text-align:right;">{{ r.productCount }}</td>
              <td>
                <span class="badge" [class.badge-active]="r.isActive" [class.badge-inactive]="!r.isActive">
                  {{ r.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/catalog/mix-match', r.id]">Edit</a>
                @if (auth.hasRole('TenantAdmin') && r.isActive) {
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
export class MixMatchListComponent {
  private readonly api = inject(MixMatchApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<MixMatchGroupDto[]>([]);
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

  typeLabel(t: MixMatchType): string {
    return t === MixMatchType.DiscountAmount ? 'Discount Amount'
         : t === MixMatchType.PercentDiscount ? 'Percent Off'
         : 'Fixed Price';
  }

  formatDiscount(r: MixMatchGroupDto): string {
    if (r.type === MixMatchType.PercentDiscount) return r.discountValue + '%';
    return r.discountValue.toFixed(2);
  }

  daysLabel(flags: number): string {
    if (flags === 0 || flags === DaysOfWeekFlags.All) return 'every day';
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return labels.filter((_, i) => (flags & (1 << i)) !== 0).join(', ');
  }

  deactivate(r: MixMatchGroupDto): void {
    if (!confirm(`Deactivate group "${r.name}"?`)) return;
    this.api.deactivate(r.id).subscribe({
      next: () => { this.notify.success('Group deactivated.'); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
