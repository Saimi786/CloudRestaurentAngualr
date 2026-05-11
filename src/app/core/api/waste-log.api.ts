import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LogWasteRequest, WasteLogDto, WasteReason } from '../models';

@Injectable({ providedIn: 'root' })
export class WasteLogApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/stock/waste-logs`;

  list(opts: { branchId?: string; reason?: WasteReason; from?: string; to?: string; take?: number } = {})
    : Observable<WasteLogDto[]> {
    const params: Record<string, string | number> = {};
    if (opts.branchId) params['branchId'] = opts.branchId;
    if (opts.reason !== undefined) params['reason'] = opts.reason;
    if (opts.from) params['from'] = opts.from;
    if (opts.to) params['to'] = opts.to;
    if (opts.take) params['take'] = opts.take;
    return this.http.get<WasteLogDto[]>(this.base, { params });
  }

  log(body: LogWasteRequest): Observable<WasteLogDto> {
    return this.http.post<WasteLogDto>(this.base, body);
  }
}
