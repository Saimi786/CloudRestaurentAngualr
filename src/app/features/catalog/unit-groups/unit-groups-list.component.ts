import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UnitGroupsApi } from '../../../core/api/unit-groups.api';
import { AuthService } from '../../../core/auth/auth.service';
import { userMessage } from '../../../core/errors/problem-details.helper';
import { UnitGroupDto } from '../../../core/models';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-unit-groups-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Unit Groups</h1>
        <p class="muted">Measurement families. Units in the same group can convert to each other (e.g. KG ↔ GM).</p>
      </div>
      <div class="actions">
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        @if (auth.hasRole('TenantAdmin')) {
          <a class="btn btn-primary" routerLink="/catalog/unit-groups/new">+ New Unit Group</a>
        }
      </div>
    </div>

    <table class="data-table">
      <thead><tr><th>Name</th><th># Units</th><th>Status</th><th></th></tr></thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="4" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="4" class="empty">No unit groups yet.</td></tr>
        } @else {
          @for (g of rows(); track g.id) {
            <tr [class.inactive]="!g.isActive">
              <td>{{ g.name }}</td>
              <td>{{ g.unitCount }}</td>
              <td>
                <span class="badge" [class.badge-active]="g.isActive" [class.badge-inactive]="!g.isActive">
                  {{ g.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/catalog/unit-groups', g.id]">Edit</a>
                @if (auth.hasRole('TenantAdmin') && g.isActive) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(g)">Deactivate</button>
                }
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
  `
})
export class UnitGroupsListComponent {
  private readonly api = inject(UnitGroupsApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<UnitGroupDto[]>([]);
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

  deactivate(g: UnitGroupDto): void {
    if (!confirm(`Deactivate unit group "${g.name}"?`)) return;
    this.api.deactivate(g.id).subscribe({
      next: () => { this.notify.success(`${g.name} deactivated.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
