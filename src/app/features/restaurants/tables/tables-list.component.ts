import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BranchesApi } from '../../../core/api/branches.api';
import { FloorPlansApi } from '../../../core/api/floor-plans.api';
import { TablesApi } from '../../../core/api/tables.api';
import { AuthService } from '../../../core/auth/auth.service';
import { userMessage } from '../../../core/errors/problem-details.helper';
import { BranchDto, FloorPlanDto, TableDto, TableStatus } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-tables-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Tables</h1>
        <p class="muted">All tables across branches and floor plans. Click a status pill to change it.</p>
      </div>
      <div class="actions">
        <select [(ngModel)]="branchFilter" (ngModelChange)="onBranchChange()">
          <option value="">All branches</option>
          @for (b of branches(); track b.id) {
            <option [value]="b.id">{{ b.name }}</option>
          }
        </select>
        <select [(ngModel)]="floorPlanFilter" (ngModelChange)="reload()">
          <option value="">All floor plans</option>
          @for (p of filteredFloorPlans(); track p.id) {
            <option [value]="p.id">{{ p.name }}</option>
          }
        </select>
        <select [(ngModel)]="statusFilter" (ngModelChange)="reload()">
          <option value="">Any status</option>
          <option [value]="0">Available</option>
          <option [value]="1">Occupied</option>
          <option [value]="2">Reserved</option>
          <option [value]="3">Out of service</option>
        </select>
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin') || auth.hasRole('BranchManager')) {
          <a class="btn btn-primary" routerLink="/restaurant/tables/new">+ New Table</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Branch</th>
          <th>Floor Plan</th>
          <th>Code</th>
          <th style="text-align:right;">Seats</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="6" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="6" class="empty">No tables found.</td></tr>
        } @else {
          @for (t of rows(); track t.id) {
            <tr [class.inactive]="!t.isActive">
              <td>{{ t.branchName }}</td>
              <td>{{ t.floorPlanName }}</td>
              <td class="mono">{{ t.code }}</td>
              <td style="text-align:right;">{{ t.capacity }}</td>
              <td>
                <select class="status-select status-{{ t.statusName.toLowerCase() }}"
                        [value]="t.status"
                        (change)="onStatusChange(t, +$any($event.target).value)">
                  <option [value]="0">Available</option>
                  <option [value]="1">Occupied</option>
                  <option [value]="2">Reserved</option>
                  <option [value]="3">Out of service</option>
                </select>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/restaurant/tables', t.id]">Edit</a>
                @if ((auth.hasRole('TenantAdmin') || auth.hasRole('BranchManager')) && t.isActive) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(t)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `,
  styles: [`
    .mono { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    select {
      padding: 0.4rem 0.6rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #fff;
    }
    .status-select { font-weight: 600; }
    .status-available    { color: #166534; background: #dcfce7; }
    .status-occupied     { color: #991b1b; background: #fee2e2; }
    .status-reserved     { color: #92400e; background: #fef3c7; }
    .status-outofservice { color: #6b7280; background: #f3f4f6; }
  `]
})
export class TablesListComponent {
  private readonly api = inject(TablesApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly floorPlansApi = inject(FloorPlansApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<TableDto[]>([]);
  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly allFloorPlans = signal<FloorPlanDto[]>([]);
  protected readonly loading = signal(true);
  protected branchFilter = '';
  protected floorPlanFilter = '';
  protected statusFilter: '' | TableStatus = '';
  protected includeInactive = false;

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));
    this.floorPlansApi.list().subscribe(list => this.allFloorPlans.set(list));
    this.reload();
  }

  filteredFloorPlans(): FloorPlanDto[] {
    if (!this.branchFilter) return this.allFloorPlans();
    return this.allFloorPlans().filter(p => p.branchId === this.branchFilter);
  }

  onBranchChange(): void {
    // Reset floor-plan filter if it no longer matches the selected branch
    const stillValid = !this.floorPlanFilter
      || this.allFloorPlans().some(p => p.id === this.floorPlanFilter && (!this.branchFilter || p.branchId === this.branchFilter));
    if (!stillValid) this.floorPlanFilter = '';
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.list({
      branchId: this.branchFilter || undefined,
      floorPlanId: this.floorPlanFilter || undefined,
      status: this.statusFilter === '' ? undefined : Number(this.statusFilter) as TableStatus,
      includeInactive: this.includeInactive
    }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  onStatusChange(table: TableDto, newStatus: TableStatus): void {
    if (newStatus === table.status) return;
    this.api.setStatus(table.id, newStatus).subscribe({
      next: () => { this.notify.success(`${table.code} → ${TableStatus[newStatus]}.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }

  deactivate(t: TableDto): void {
    if (!confirm(`Deactivate table "${t.code}"?`)) return;
    this.api.deactivate(t.id).subscribe({
      next: () => { this.notify.success(`${t.code} deactivated.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
