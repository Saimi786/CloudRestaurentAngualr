import { DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BranchesApi } from '../../core/api/branches.api';
import { KitchenApi } from '../../core/api/kitchen.api';
import { KitchenStationsApi } from '../../core/api/kitchen-stations.api';
import { AuthService } from '../../core/auth/auth.service';
import { userMessage } from '../../core/errors/problem-details.helper';
import { BranchDto, KitchenStationDto, KitchenTicketDto, KitchenTicketStatus } from '../../core/models';
import { NotificationService } from '../../core/notifications/notification.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-kitchen-display',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="kds-toolbar">
      <h1>Kitchen Display</h1>
      <select [(ngModel)]="branchId" (ngModelChange)="onBranchChange()">
        @for (b of branches(); track b.id) {
          <option [value]="b.id">{{ b.name }}</option>
        }
      </select>
      <select [(ngModel)]="stationId" (ngModelChange)="reload()">
        <option value="">All stations</option>
        @for (s of branchStations(); track s.id) {
          <option [value]="s.id">{{ s.name }}</option>
        }
      </select>
      <span class="muted">{{ activeTickets().length }} active</span>
      <span class="connection" [class.connected]="connected()">{{ connected() ? '● live' : '○ offline' }}</span>
    </div>

    <div class="ticket-grid">
      @for (t of activeTickets(); track t.id) {
        <div class="ticket" [class.urgent]="t.minutesOpen >= 15"
                            [class.s-pending]="t.status === 0"
                            [class.s-preparing]="t.status === 1"
                            [class.s-ready]="t.status === 2">
          <div class="ticket-header">
            <div>
              <div class="ticket-table">{{ t.tableCode || t.orderTypeName }}</div>
              <div class="ticket-meta muted">
                @if (t.orderNumber) { <span class="order-no">{{ t.orderNumber }}</span> · }
                {{ t.openedAt | date:'shortTime' }} · {{ t.minutesOpen }}m
                @if (!stationId && t.involvedStationIds.length > 1) {
                  · <span class="station-progress">{{ t.bumpedStationIds.length }}/{{ t.involvedStationIds.length }} bumped</span>
                }
              </div>
            </div>
            <div class="status-pill">{{ t.statusName }}</div>
          </div>

          <ul class="ticket-lines">
            @for (line of t.lines; track $index) {
              <li>
                <strong>{{ line.quantity }}× {{ line.productName }}</strong>
                @if (line.kitchenStationName && !stationId) {
                  <span class="station-tag">{{ line.kitchenStationName }}</span>
                }
                @if (line.modifiers.length > 0) {
                  <div class="muted small">
                    @for (m of line.modifiers; track m) { <span>+ {{ m }}</span> }
                  </div>
                }
                @if (line.notes) { <div class="muted small italic">"{{ line.notes }}"</div> }
              </li>
            }
          </ul>

          <div class="ticket-actions">
            @if (stationId) {
              @if (isBumpedByThisStation(t)) {
                <button class="btn big" (click)="bump(t, true)">Un-bump</button>
              } @else {
                <button class="btn btn-primary big" (click)="bump(t, false)">✓ Bump (mark ready for this station)</button>
              }
            } @else {
              @if (t.status === 0) {
                <button class="btn btn-primary big" (click)="advance(t, 1)">Start preparing</button>
              } @else if (t.status === 1) {
                <button class="btn btn-primary big" (click)="advance(t, 2)">Mark ready</button>
              } @else if (t.status === 2) {
                <button class="btn big" (click)="advance(t, 3)">Mark served</button>
              }
            }
          </div>
        </div>
      }
      @if (activeTickets().length === 0 && !loading()) {
        <div class="empty">No active tickets. New orders will appear here in real time.</div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .kds-toolbar {
      display: flex; align-items: center; gap: 1rem;
      padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem;
    }
    .kds-toolbar h1 { margin: 0; }
    .kds-toolbar select { padding: 0.45rem 0.7rem; border: 1px solid #d1d5db; border-radius: 6px; }
    .kds-toolbar .muted { margin-left: auto; }
    .connection { font-size: 0.8rem; color: #9ca3af; }
    .connection.connected { color: #166534; }

    .ticket-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .ticket {
      background: #fff;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      padding: 1rem;
      display: flex; flex-direction: column; gap: 0.75rem;
      transition: border-color 0.2s;
    }
    .ticket.s-pending   { border-color: #d97706; }
    .ticket.s-preparing { border-color: #3b82f6; }
    .ticket.s-ready     { border-color: #166534; }
    .ticket.urgent      { border-color: #dc2626; box-shadow: 0 0 0 4px rgba(220,38,38,0.1); }

    .ticket-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .ticket-table { font-size: 1.4rem; font-weight: 800; }
    .ticket-meta { font-size: 0.85rem; }
    .status-pill {
      padding: 0.2rem 0.6rem; border-radius: 999px;
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
      background: #fef3c7; color: #92400e;
    }
    .s-preparing .status-pill { background: #dbeafe; color: #1e40af; }
    .s-ready .status-pill     { background: #dcfce7; color: #166534; }

    .ticket-lines { list-style: none; padding: 0; margin: 0; }
    .ticket-lines li {
      padding: 0.5rem 0; border-bottom: 1px solid #f3f4f6;
      &:last-child { border-bottom: none; }
    }
    .station-tag {
      display: inline-block; margin-left: 0.4rem;
      font-size: 0.7rem; padding: 0.05rem 0.4rem;
      background: #f3f4f6; color: #4b5563; border-radius: 4px;
      font-weight: 500;
    }
    .station-progress {
      font-weight: 600; color: #1e40af;
    }
    .order-no { font-family: ui-monospace, monospace; }
    .small { font-size: 0.8rem; }
    .italic { font-style: italic; }

    .ticket-actions { display: flex; gap: 0.5rem; }
    .btn.big { flex: 1; padding: 0.7rem 1rem; font-size: 1rem; }

    .empty { grid-column: 1 / -1; padding: 2rem; text-align: center; color: #9ca3af; }
  `]
})
export class KitchenDisplayComponent implements OnDestroy {
  private readonly api = inject(KitchenApi);
  private readonly branchesApi = inject(BranchesApi);
  private readonly stationsApi = inject(KitchenStationsApi);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  protected readonly branches = signal<BranchDto[]>([]);
  protected readonly stations = signal<KitchenStationDto[]>([]);
  protected readonly activeTickets = signal<KitchenTicketDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly connected = signal(false);
  protected branchId = '';
  protected stationId = '';

  protected branchStations = computed(() =>
    this.stations().filter(s => s.branchId === this.branchId));

  private hub: HubConnection | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.branchesApi.list().subscribe(list => {
      this.branches.set(list);
      if (list.length > 0) {
        this.branchId = list[0].id;
        this.onBranchChange();
      }
    });
    this.stationsApi.list().subscribe({
      next: list => this.stations.set(list),
      error: () => {}
    });

    // Polling fallback in case SignalR connection drops — refreshes "minutes open" too.
    this.pollTimer = setInterval(() => this.reload(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    void this.hub?.stop();
  }

  async onBranchChange(): Promise<void> {
    // Reset station selection when branch changes — stations are branch-scoped.
    this.stationId = '';
    if (this.hub) await this.hub.stop();
    this.reload();
    await this.connectHub();
  }

  private async connectHub(): Promise<void> {
    if (!this.branchId) return;

    const hubUrl = environment.apiBaseUrl.replace(/\/api\/v1$/, '') + '/hubs/kitchen';
    this.hub = new HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => this.auth.getAccessToken() ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.hub.on('TicketChanged', () => this.reload());
    this.hub.onreconnected(() => this.connected.set(true));
    this.hub.onreconnecting(() => this.connected.set(false));
    this.hub.onclose(() => this.connected.set(false));

    try {
      await this.hub.start();
      await this.hub.invoke('SubscribeToBranch', this.branchId);
      this.connected.set(true);
    } catch (e) {
      this.connected.set(false);
      console.warn('Kitchen hub connection failed; polling fallback active.', e);
    }
  }

  reload(): void {
    if (!this.branchId) return;
    this.loading.set(true);
    this.api.list({
      branchId: this.branchId,
      stationId: this.stationId || undefined
    }).subscribe({
      next: list => { this.activeTickets.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.notify.error(userMessage(err)); }
    });
  }

  advance(ticket: KitchenTicketDto, next: KitchenTicketStatus): void {
    this.api.advance(ticket.id, next).subscribe({
      next: () => this.reload(),
      error: err => this.notify.error(userMessage(err))
    });
  }

  isBumpedByThisStation(ticket: KitchenTicketDto): boolean {
    return !!this.stationId && ticket.bumpedStationIds.includes(this.stationId);
  }

  bump(ticket: KitchenTicketDto, unbump: boolean): void {
    if (!this.stationId) return;
    this.api.bump(ticket.id, this.stationId, unbump).subscribe({
      next: () => this.reload(),
      error: (err: unknown) => this.notify.error(userMessage(err))
    });
  }
}
