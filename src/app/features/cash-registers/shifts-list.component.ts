import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CashRegistersApi } from '../../core/api/cash-registers.api';
import { userMessage } from '../../core/errors/problem-details.helper';
import { CashRegisterShiftSummaryDto, ShiftStatus } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-shifts-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Cash Register Shifts</h1>
        <p class="muted">All historical shifts. Click to view the Z-report.</p>
      </div>
      <div class="actions">
        <select [(ngModel)]="statusFilter" (ngModelChange)="reload()">
          <option [ngValue]="null">All statuses</option>
          <option [ngValue]="ShiftStatus.Open">Open only</option>
          <option [ngValue]="ShiftStatus.Closed">Closed only</option>
        </select>
        <a class="btn" routerLink="/cash-registers">← Registers</a>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Register</th>
          <th>Cashier</th>
          <th>Opened</th>
          <th>Closed</th>
          <th style="text-align:right;">Opening</th>
          <th style="text-align:right;">Declared</th>
          <th style="text-align:right;">Over/Short</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="8" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="8" class="empty">No shifts yet.</td></tr>
        } @else {
          @for (r of rows(); track r.id) {
            <tr>
              <td>
                <a [routerLink]="['/cash-registers/shifts', r.id]" class="mono">{{ r.cashRegisterCode }}</a>
              </td>
              <td>{{ r.openedByUserName }}</td>
              <td>{{ r.openedAt | date:'short' }}</td>
              <td>{{ r.closedAt ? (r.closedAt | date:'short') : '—' }}</td>
              <td style="text-align:right;" class="mono">{{ r.openingAmount | number:'1.2-2' }}</td>
              <td style="text-align:right;" class="mono">
                {{ r.declaredClosingAmount != null ? (r.declaredClosingAmount | number:'1.2-2') : '—' }}
              </td>
              <td style="text-align:right;" class="mono"
                  [class.text-danger]="(r.overShortAmount ?? 0) < 0"
                  [class.text-success]="(r.overShortAmount ?? 0) > 0">
                {{ r.overShortAmount != null ? (r.overShortAmount | number:'1.2-2') : '—' }}
              </td>
              <td>
                <span class="badge" [class.badge-active]="r.status === ShiftStatus.Open">
                  {{ r.statusName }}
                </span>
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .text-danger { color: #dc2626; }
    .text-success { color: #16a34a; }
  `]
})
export class ShiftsListComponent {
  private readonly api = inject(CashRegistersApi);
  private readonly notify = inject(NotificationService);

  protected readonly ShiftStatus = ShiftStatus;
  protected readonly rows = signal<CashRegisterShiftSummaryDto[]>([]);
  protected readonly loading = signal(true);
  protected statusFilter: ShiftStatus | null = null;

  constructor() { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.api.listShifts({
      status: this.statusFilter ?? undefined,
      take: 200
    }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }
}
