import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe],
  template: `
    <h1>Dashboard</h1>
    @if (auth.user(); as user) {
      <div class="card">
        <h2>Welcome, {{ user.fullName }}</h2>
        <dl>
          <dt>Email</dt><dd>{{ user.email }}</dd>
          <dt>Tenant ID</dt><dd>{{ user.tenantId }}</dd>
          <dt>Roles</dt><dd>{{ user.roles.join(', ') }}</dd>
          <dt>Token expires</dt><dd>{{ user.expiresAt | date:'medium' }}</dd>
        </dl>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    h1 { margin: 0 0 1rem; color: #111827; }
    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      max-width: 600px;
    }
    h2 { margin: 0 0 1rem; font-size: 1.1rem; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1rem; margin: 0; }
    dt { font-weight: 600; color: #6b7280; font-size: 0.85rem; }
    dd { margin: 0; color: #111827; font-family: ui-monospace, monospace; font-size: 0.85rem; }
  `]
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
}
