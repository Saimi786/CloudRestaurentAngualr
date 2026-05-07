import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsersApi } from '../../core/api/users.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { UserDto } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Users</h1>
        <p class="muted">Manage who can sign in to your tenant and what roles they hold.</p>
      </div>
      <div class="actions">
        <label class="muted" style="display:flex;align-items:center;gap:0.4rem;">
          <input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="reload()" />
          Show inactive
        </label>
        <a class="btn btn-primary" routerLink="/users/new">+ New User</a>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Name</th>
          <th>Roles</th>
          <th>Last login</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr><td colspan="6" class="empty">Loading…</td></tr>
        } @else if (rows().length === 0) {
          <tr><td colspan="6" class="empty">No users.</td></tr>
        } @else {
          @for (u of rows(); track u.id) {
            <tr [class.inactive]="!u.isActive">
              <td class="mono">{{ u.email }}</td>
              <td>{{ u.fullName }}</td>
              <td>
                @if (u.roles.length === 0) {
                  <span class="muted">none</span>
                } @else {
                  @for (r of u.roles; track r) {
                    <span class="role-pill">{{ r }}</span>
                  }
                }
              </td>
              <td class="muted">
                {{ u.lastLoginAt ? (u.lastLoginAt | date:'short') : 'Never' }}
              </td>
              <td>
                <span class="badge" [class.badge-active]="u.isActive" [class.badge-inactive]="!u.isActive">
                  {{ u.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions">
                <a class="btn btn-sm" [routerLink]="['/users', u.id]">Edit</a>
                @if (u.isActive && u.id !== auth.user()?.userId) {
                  <button class="btn btn-sm btn-danger" (click)="deactivate(u)">Deactivate</button>
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
    .role-pill {
      display: inline-block;
      padding: 0.1rem 0.5rem;
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
      font-size: 0.75rem;
      margin-right: 0.25rem;
    }
  `]
})
export class UsersListComponent {
  private readonly api = inject(UsersApi);
  private readonly notify = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly rows = signal<UserDto[]>([]);
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

  deactivate(u: UserDto): void {
    if (!confirm(`Deactivate user "${u.email}"? They won't be able to sign in.`)) return;
    this.api.deactivate(u.id).subscribe({
      next: () => { this.notify.success(`${u.email} deactivated.`); this.reload(); },
      error: err => this.notify.error(userMessage(err))
    });
  }
}
