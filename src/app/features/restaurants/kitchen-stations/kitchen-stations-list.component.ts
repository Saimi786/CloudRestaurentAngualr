import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BranchesApi } from '../../../core/api/branches.api';
import { KitchenStationsApi } from '../../../core/api/kitchen-stations.api';
import { AuthService } from '../../../core/auth/auth.service';
import { userMessage } from '../../../core/errors/problem-details.helper';
import { BranchDto, KitchenStationDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-kitchen-stations-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Kitchen Stations</h1>
        <p class="muted">Route products to a station — Grill, Bar, Cold, Bakery — so each cook only sees what they need.</p>
      </div>
      <div class="actions">
        <select [(ngModel)]="branchId" (ngModelChange)="reload()">
          <option [ngValue]="null">All branches</option>
          @for (b of branches(); track b.id) {
            <option [ngValue]="b.id">{{ b.name }}</option>
          }
        </select>
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin')) {
          <a class="btn btn-primary" routerLink="/restaurant/kitchen-stations/new">+ New Station</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr><th>Order</th><th>Name</th><th>Branch</th><th>Description</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="6" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="6" class="empty">No stations yet.</td></tr>
        } @else {
          @for (s of rows(); track s.id) {
            <tr [class.inactive]="!s.isActive">
              <td>{{ s.displayOrder }}</td>
              <td>{{ s.name }}</td>
              <td class="muted">{{ s.branchName }}</td>
              <td class="muted">{{ s.description || '—' }}</td>
              <td>
                <span class="badge" [class.badge-active]="s.isActive" [class.badge-inactive]="!s.isActive">
                  {{ s.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/restaurant/kitchen-stations', s.id]">Edit</a>
                @if (auth.hasRole('TenantAdmin') && s.isActive) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(s)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `
})
export class KitchenStationsListComponent {
  private readonly api = inject(KitchenStationsApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<KitchenStationDto[]>([]);
  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly loading = signal(true);
  protected branchId: string | null = null;
  protected includeInactive = false;

  constructor() {
    this.branchesApi.list().subscribe(list => this.branches.set(list));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.list(this.branchId ?? undefined, this.includeInactive).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  deactivate(s: KitchenStationDto): void {
    if (!confirm(`Deactivate station "${s.name}"?`)) return;
    this.api.deactivate(s.id).subscribe({
      next: () => { this.notify.success(`${s.name} deactivated.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
