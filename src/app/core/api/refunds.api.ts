import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RefundDto, RefundOrderRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class RefundsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/orders`;

  list(orderId: string): Observable<RefundDto[]> {
    return this.http.get<RefundDto[]>(`${this.base}/${orderId}/refunds`);
  }

  create(orderId: string, body: RefundOrderRequest): Observable<RefundDto> {
    return this.http.post<RefundDto>(`${this.base}/${orderId}/refunds`, body);
  }
}
