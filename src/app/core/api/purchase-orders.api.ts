import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BillMatchStatus,
  CreatePurchaseOrderRequest,
  PurchaseOrderDto,
  PurchaseOrderStatus,
  PurchaseOrderSummaryDto,
  ReceivePurchaseOrderRequest,
  SupplierBillDto,
  SupplierBillPaymentMethod,
  SupplierBillStatus,
  UpdateSupplierBillRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/purchase-orders`;
  private billsBase = `${environment.apiBaseUrl}/supplier-bills`;

  list(opts: { branchId?: string; supplierId?: string; status?: PurchaseOrderStatus } = {})
    : Observable<PurchaseOrderSummaryDto[]> {
    const params: Record<string, string | number> = {};
    if (opts.branchId) params['branchId'] = opts.branchId;
    if (opts.supplierId) params['supplierId'] = opts.supplierId;
    if (opts.status !== undefined) params['status'] = opts.status;
    return this.http.get<PurchaseOrderSummaryDto[]>(this.base, { params });
  }

  get(id: string): Observable<PurchaseOrderDto> {
    return this.http.get<PurchaseOrderDto>(`${this.base}/${id}`);
  }

  create(body: CreatePurchaseOrderRequest): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(this.base, body);
  }

  send(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/send`, null);
  }

  cancel(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/cancel`, null);
  }

  receive(id: string, body: ReceivePurchaseOrderRequest): Observable<PurchaseOrderDto> {
    return this.http.post<PurchaseOrderDto>(`${this.base}/${id}/receive`, body);
  }

  // Supplier bills -------------------------------------------------
  listBills(opts: { supplierId?: string; status?: SupplierBillStatus } = {}): Observable<SupplierBillDto[]> {
    const params: Record<string, string | number> = {};
    if (opts.supplierId) params['supplierId'] = opts.supplierId;
    if (opts.status !== undefined) params['status'] = opts.status;
    return this.http.get<SupplierBillDto[]>(this.billsBase, { params });
  }

  payBill(id: string, amount: number, method: SupplierBillPaymentMethod, reference: string | null): Observable<string> {
    return this.http.post<string>(`${this.billsBase}/${id}/payments`, { amount, method, reference });
  }

  updateBill(id: string, body: UpdateSupplierBillRequest): Observable<void> {
    return this.http.put<void>(`${this.billsBase}/${id}`, body);
  }

  matchBill(id: string, tolerance = 0.01, overrideReason: string | null = null): Observable<BillMatchStatus> {
    return this.http.post<BillMatchStatus>(`${this.billsBase}/${id}/match`, { tolerance, overrideReason });
  }

  disputeBill(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.billsBase}/${id}/dispute`, { reason });
  }
}
