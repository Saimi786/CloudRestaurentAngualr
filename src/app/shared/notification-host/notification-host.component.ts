import { Component, inject } from '@angular/core';
import { NotificationService } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-notification-host',
  standalone: true,
  template: `
    <div class="stack">
      @for (n of notifications.items(); track n.id) {
        <div class="toast" [class]="'toast-' + n.level" (click)="notifications.dismiss(n.id)">
          {{ n.message }}
        </div>
      }
    </div>
  `,
  styles: [`
    .stack {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 380px;
    }
    .toast {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      color: #fff;
      font-size: 0.9rem;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(0,0,0,0.18);
      animation: slide-in 0.18s ease-out;
    }
    .toast-success { background: #16a34a; }
    .toast-error   { background: #dc2626; }
    .toast-warning { background: #d97706; }
    .toast-info    { background: #2563eb; }
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
  `]
})
export class NotificationHostComponent {
  protected readonly notifications = inject(NotificationService);
}
