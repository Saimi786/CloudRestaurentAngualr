import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePriceRuleRequest, PriceRuleDto, ResolvedPriceDto, UpdatePriceRuleRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class PriceRulesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/price-rules`;

  list(opts: { productId?: string; branchId?: string; includeInactive?: boolean } = {}): Observable<PriceRuleDto[]> {
    let params = new HttpParams().set('includeInactive', opts.includeInactive ?? false);
    if (opts.productId) params = params.set('productId', opts.productId);
    if (opts.branchId) params = params.set('branchId', opts.branchId);
    return this.http.get<PriceRuleDto[]>(this.base, { params });
  }

  get(id: string): Observable<PriceRuleDto> {
    return this.http.get<PriceRuleDto>(`${this.base}/${id}`);
  }

  resolve(productId: string, branchId?: string, at?: Date): Observable<ResolvedPriceDto> {
    let params = new HttpParams().set('productId', productId);
    if (branchId) params = params.set('branchId', branchId);
    if (at) params = params.set('at', at.toISOString());
    return this.http.get<ResolvedPriceDto>(`${this.base}/resolve`, { params });
  }

  create(body: CreatePriceRuleRequest): Observable<PriceRuleDto> {
    return this.http.post<PriceRuleDto>(this.base, body);
  }

  update(body: UpdatePriceRuleRequest): Observable<PriceRuleDto> {
    return this.http.put<PriceRuleDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
