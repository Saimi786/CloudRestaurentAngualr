import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BrandDto, CreateBrandRequest, UpdateBrandRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class BrandsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/brands`;

  list(includeInactive = false): Observable<BrandDto[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<BrandDto[]>(this.base, { params });
  }

  get(id: string): Observable<BrandDto> {
    return this.http.get<BrandDto>(`${this.base}/${id}`);
  }

  create(body: CreateBrandRequest): Observable<BrandDto> {
    return this.http.post<BrandDto>(this.base, body);
  }

  update(body: UpdateBrandRequest): Observable<BrandDto> {
    return this.http.put<BrandDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
