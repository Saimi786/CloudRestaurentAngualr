import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ContactType,
  CreateCustomerRequest, CustomerDto, LoyaltyPointsRequest, UpdateCustomerRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class CustomersApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/customers`;

  list(opts: { search?: string; includeInactive?: boolean; type?: ContactType } = {})
    : Observable<CustomerDto[]> {
    let params = new HttpParams().set('includeInactive', opts.includeInactive ?? false);
    if (opts.search) params = params.set('search', opts.search);
    if (opts.type !== undefined) params = params.set('type', opts.type);
    return this.http.get<CustomerDto[]>(this.base, { params });
  }

  get(id: string): Observable<CustomerDto> {
    return this.http.get<CustomerDto>(`${this.base}/${id}`);
  }

  /** Phone is URL-encoded by HttpParams — handles "+" correctly. */
  getByPhone(phone: string): Observable<CustomerDto> {
    const params = new HttpParams().set('phone', phone);
    return this.http.get<CustomerDto>(`${this.base}/by-phone`, { params });
  }

  create(body: CreateCustomerRequest): Observable<CustomerDto> {
    return this.http.post<CustomerDto>(this.base, body);
  }

  update(body: UpdateCustomerRequest): Observable<CustomerDto> {
    return this.http.put<CustomerDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  earnPoints(id: string, body: LoyaltyPointsRequest): Observable<CustomerDto> {
    return this.http.post<CustomerDto>(`${this.base}/${id}/loyalty/earn`, body);
  }

  redeemPoints(id: string, body: LoyaltyPointsRequest): Observable<CustomerDto> {
    return this.http.post<CustomerDto>(`${this.base}/${id}/loyalty/redeem`, body);
  }
}
