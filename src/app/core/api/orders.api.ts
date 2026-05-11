import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AddOrderLineRequest, AddPaymentRequest, OpenOrderRequest, OrderDto, OrderStatus, OrderSummaryDto
} from '../models';

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/orders`;

  list(opts: { branchId?: string; status?: OrderStatus; customerId?: string; limit?: number } = {}): Observable<OrderSummaryDto[]> {
    let params = new HttpParams();
    if (opts.branchId) params = params.set('branchId', opts.branchId);
    if (opts.status !== undefined) params = params.set('status', opts.status);
    if (opts.customerId) params = params.set('customerId', opts.customerId);
    if (opts.limit) params = params.set('limit', opts.limit);
    return this.http.get<OrderSummaryDto[]>(this.base, { params });
  }

  get(id: string): Observable<OrderDto> {
    return this.http.get<OrderDto>(`${this.base}/${id}`);
  }

  open(body: OpenOrderRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(this.base, body);
  }

  addLine(orderId: string, body: AddOrderLineRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.base}/${orderId}/lines`, body);
  }

  removeLine(orderId: string, lineId: string): Observable<OrderDto> {
    return this.http.delete<OrderDto>(`${this.base}/${orderId}/lines/${lineId}`);
  }

  addPayment(orderId: string, body: AddPaymentRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.base}/${orderId}/payments`, body);
  }

  setDiscount(orderId: string, discountAmount: number): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.base}/${orderId}/discount`, { discountAmount });
  }

  overrideLinePrice(orderId: string, lineId: string, unitPrice: number): Observable<OrderDto> {
    return this.http.put<OrderDto>(`${this.base}/${orderId}/lines/${lineId}/price`, { unitPrice });
  }

  redeemPoints(orderId: string, points: number): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.base}/${orderId}/redeem-points`, { points });
  }

  redeemPreview(orderId: string): Observable<RewardRedemptionPreviewDto> {
    return this.http.get<RewardRedemptionPreviewDto>(`${this.base}/${orderId}/redeem-preview`);
  }

  close(orderId: string): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.base}/${orderId}/close`, {});
  }

  voidOrder(orderId: string): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.base}/${orderId}/void`, {});
  }
}

export interface RewardRedemptionPreviewDto {
  enabled: boolean;
  name: string;
  customerBalance: number;
  maxRedeemable: number;
  redeemValuePerPoint: number;
  maxRedemptionAmount: number;
  minRedeemPoints: number | null;
  minOrderForRedeem: number | null;
  orderEligible: boolean;
  ineligibleReason: string | null;
}
