import { Injectable, signal } from '@angular/core';

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: number;
  level: NotificationLevel;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  private readonly _items = signal<Notification[]>([]);
  readonly items = this._items.asReadonly();

  show(level: NotificationLevel, message: string, autoCloseMs = 4000): void {
    const id = this.nextId++;
    this._items.update(list => [...list, { id, level, message }]);
    if (autoCloseMs > 0) setTimeout(() => this.dismiss(id), autoCloseMs);
  }

  success(msg: string): void { this.show('success', msg); }
  error(msg: string): void { this.show('error', msg, 6000); }
  info(msg: string): void { this.show('info', msg); }

  dismiss(id: number): void {
    this._items.update(list => list.filter(n => n.id !== id));
  }
}
