import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    @if (auth.user(); as user) {
      <div class="page-header">
        <div>
          <h1>{{ greeting() }}, {{ firstName(user.fullName) }} 👋</h1>
          <p>Here's a quick snapshot of your workspace.</p>
        </div>
        <div class="actions">
          <a class="btn" routerLink="/reports">📈 Reports</a>
          <a class="btn btn-primary" routerLink="/pos">🛒 Open POS</a>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-icon">👤</div>
          <span class="kpi-label">Signed in as</span>
          <span class="kpi-value" style="font-size:1.1rem;">{{ user.email }}</span>
          <span class="kpi-meta">{{ user.roles.length }} role{{ user.roles.length === 1 ? '' : 's' }} active</span>
        </div>

        <div class="kpi">
          <div class="kpi-icon">🏢</div>
          <span class="kpi-label">Tenant</span>
          <span class="kpi-value" style="font-size:1rem; font-family:var(--font-mono);">{{ user.tenantId.substring(0, 8) }}</span>
          <span class="kpi-meta">Token valid until {{ user.expiresAt | date:'shortTime' }}</span>
        </div>

        <div class="kpi">
          <div class="kpi-icon">📍</div>
          <span class="kpi-label">Branch scope</span>
          <span class="kpi-value" style="font-size:1.2rem;">
            @if (auth.canAccessAllBranches()) {
              <span class="badge badge-primary">All branches</span>
            } @else {
              {{ auth.branchIds().length }}
            }
          </span>
          <span class="kpi-meta">
            {{ auth.canAccessAllBranches() ? 'Admin — unrestricted' : 'Branch-scoped user' }}
          </span>
        </div>

        <div class="kpi">
          <div class="kpi-icon">💲</div>
          <span class="kpi-label">Discount cap</span>
          <span class="kpi-value">
            {{ auth.maxDiscountPercent() === null ? 'No cap' : auth.maxDiscountPercent() + '%' }}
          </span>
          <span class="kpi-meta">At the POS</span>
        </div>
      </div>

      <div class="quick-grid">
        <a class="quick" routerLink="/pos">
          <div class="quick-ico">🛒</div>
          <div><strong>Point of Sale</strong><div class="muted small">Take an order</div></div>
        </a>
        <a class="quick" routerLink="/kitchen">
          <div class="quick-ico">🍳</div>
          <div><strong>Kitchen Display</strong><div class="muted small">Tickets &amp; stations</div></div>
        </a>
        <a class="quick" routerLink="/catalog/products">
          <div class="quick-ico">📦</div>
          <div><strong>Products</strong><div class="muted small">Menu &amp; inventory items</div></div>
        </a>
        <a class="quick" routerLink="/reports">
          <div class="quick-ico">📈</div>
          <div><strong>Reports</strong><div class="muted small">Sales, tax, P&amp;L</div></div>
        </a>
        <a class="quick" routerLink="/inventory/balances">
          <div class="quick-ico">📊</div>
          <div><strong>Stock Balances</strong><div class="muted small">Current quantities</div></div>
        </a>
        <a class="quick" routerLink="/settings">
          <div class="quick-ico">⚙️</div>
          <div><strong>Business Settings</strong><div class="muted small">Currency, tax, prefixes</div></div>
        </a>
      </div>

      <div class="panel info-panel">
        <h2>Session details</h2>
        <dl>
          <dt>Roles</dt>
          <dd>
            @for (r of user.roles; track r) {
              <span class="badge badge-primary" style="margin-right:0.25rem;">{{ r }}</span>
            }
          </dd>
          <dt>Token expires</dt><dd>{{ user.expiresAt | date:'medium' }}</dd>
          <dt>User ID</dt><dd class="mono">{{ user.userId }}</dd>
        </dl>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.85rem;
      margin-bottom: 1.5rem;
    }
    .quick {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.95rem 1.15rem;
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius-lg);
      text-decoration: none;
      color: var(--c-text);
      box-shadow: var(--shadow-xs);
      transition: all var(--t-fast);
      &:hover {
        border-color: var(--c-primary);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        color: var(--c-text);
      }
    }
    .quick-ico {
      width: 42px; height: 42px;
      display: grid; place-items: center;
      border-radius: var(--radius-md);
      background: var(--c-primary-soft);
      font-size: 1.25rem;
    }
    .info-panel {
      max-width: 760px;
      h2 { margin: 0 0 0.85rem; font-size: 1.05rem; }
      dl {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 0.6rem 1.5rem;
        margin: 0;
      }
      dt { font-weight: 600; color: var(--c-text-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
      dd { margin: 0; color: var(--c-text); font-size: 0.9rem; }
      dd.mono { font-family: var(--font-mono); font-size: 0.82rem; }
    }
  `]
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);

  protected greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  });

  protected firstName(fullName: string): string {
    return (fullName ?? '').trim().split(/\s+/)[0] ?? '';
  }
}
