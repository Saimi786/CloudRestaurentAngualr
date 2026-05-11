import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ActiveLocationService } from '../../core/active-location/active-location.service';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { NotificationService } from '../../core/notifications/notification.service';
import { NotificationHostComponent } from '../../shared/notification-host/notification-host.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, NotificationHostComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly location = inject(ActiveLocationService);
  private readonly notify = inject(NotificationService);
  protected readonly pickerOpen = signal(false);

  constructor() {
    // Eagerly load available locations so the top-bar picker has data on first render.
    this.location.load().subscribe({
      error: err => this.notify.error(userMessage(err))
    });
  }

  logout(): void {
    this.location.clear();
    this.auth.logout();
  }

  togglePicker(): void { this.pickerOpen.update(v => !v); }

  pick(branchId: string): void {
    this.location.select(branchId);
    this.pickerOpen.set(false);
    const opt = this.location.current();
    if (opt) this.notify.success(`Switched to ${opt.tenantName} · ${opt.branchName}`);
  }

  initials(fullName: string): string {
    const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
