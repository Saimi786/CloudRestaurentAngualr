import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Platform-level (SuperAdmin) shell. Renders inside the regular tenant shell —
 * adds a tab strip at the top of the content area for navigating between the
 * SuperAdmin dashboard and the all-businesses list. Mirrors Blocks360's tab
 * strip on every /superadmin/* page.
 *
 * Auth guard redirects non-SuperAdmin users away so this view is always safe
 * to render — the topbar SuperAdmin button is the only way in.
 */
@Component({
  selector: 'app-platform-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="platform-tabs">
      <a routerLink="/platform" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="tab">
        <span class="tab-ico">⚡</span> SuperAdmin Dashboard
      </a>
      <a routerLink="/platform/tenants" routerLinkActive="active" class="tab">
        <span class="tab-ico">🏢</span> All Businesses
      </a>
    </nav>

    <router-outlet />
  `,
  styles: [`
    .platform-tabs {
      display: flex;
      gap: 0.4rem;
      margin: -0.5rem 0 1.25rem;
      padding-bottom: 0.65rem;
      border-bottom: 1px solid var(--c-border);
    }
    .tab {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 1.1rem;
      border-radius: var(--radius-md);
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--c-text-muted);
      text-decoration: none;
      transition: all var(--t-fast);
      border: 1px solid transparent;

      .tab-ico { font-size: 1rem; }

      &:hover {
        background: var(--c-surface-alt);
        color: var(--c-text);
      }
      &.active {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #fff;
        border-color: transparent;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
      }
    }
  `]
})
export class PlatformShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // Defense-in-depth: even if the route guard misses, kick non-SuperAdmin users out.
    if (!this.auth.hasRole('SuperAdmin')) {
      this.router.navigate(['/dashboard']);
    }
  }
}
