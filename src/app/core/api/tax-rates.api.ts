import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateTaxRateRequest,
  TaxRateDto,
  UpdateTaxRateRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class TaxRatesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/tax-rates`;

  list(includeInactive = false): Observable<TaxRateDto[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<TaxRateDto[]>(this.base, { params });
  }

  get(id: string): Observable<TaxRateDto> {
    return this.http.get<TaxRateDto>(`${this.base}/${id}`);
  }

  create(body: CreateTaxRateRequest): Observable<TaxRateDto> {
    return this.http.post<TaxRateDto>(this.base, body);
  }

  update(body: UpdateTaxRateRequest): Observable<TaxRateDto> {
    return this.http.put<TaxRateDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
