import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RecordStockMovementRequest, StockBalanceDto, StockMovementDto, StockMovementType,
  StockTransferResultDto, TransferStockRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class StockApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/stock`;

  balances(opts: { branchId?: string; productId?: string; search?: string } = {}): Observable<StockBalanceDto[]> {
    let params = new HttpParams();
    if (opts.branchId) params = params.set('branchId', opts.branchId);
    if (opts.productId) params = params.set('productId', opts.productId);
    if (opts.search) params = params.set('search', opts.search);
    return this.http.get<StockBalanceDto[]>(`${this.base}/balances`, { params });
  }

  movements(opts: {
    branchId?: string;
    productId?: string;
    type?: StockMovementType;
    from?: string;
    to?: string;
    limit?: number;
  } = {}): Observable<StockMovementDto[]> {
    let params = new HttpParams();
    if (opts.branchId) params = params.set('branchId', opts.branchId);
    if (opts.productId) params = params.set('productId', opts.productId);
    if (opts.type !== undefined) params = params.set('type', opts.type);
    if (opts.from) params = params.set('from', opts.from);
    if (opts.to) params = params.set('to', opts.to);
    if (opts.limit) params = params.set('limit', opts.limit);
    return this.http.get<StockMovementDto[]>(`${this.base}/movements`, { params });
  }

  recordMovement(body: RecordStockMovementRequest): Observable<StockMovementDto> {
    return this.http.post<StockMovementDto>(`${this.base}/movements`, body);
  }

  transfer(body: TransferStockRequest): Observable<StockTransferResultDto> {
    return this.http.post<StockTransferResultDto>(`${this.base}/transfers`, body);
  }
}
