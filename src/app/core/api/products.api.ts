import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateProductRequest, ProductDto, UpdateProductRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/products`;

  list(opts: { categoryId?: string; search?: string; includeInactive?: boolean } = {}): Observable<ProductDto[]> {
    let params = new HttpParams().set('includeInactive', opts.includeInactive ?? false);
    if (opts.categoryId) params = params.set('categoryId', opts.categoryId);
    if (opts.search) params = params.set('search', opts.search);
    return this.http.get<ProductDto[]>(this.base, { params });
  }

  get(id: string): Observable<ProductDto> {
    return this.http.get<ProductDto>(`${this.base}/${id}`);
  }

  create(body: CreateProductRequest): Observable<ProductDto> {
    return this.http.post<ProductDto>(this.base, body);
  }

  update(body: UpdateProductRequest): Observable<ProductDto> {
    return this.http.put<ProductDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  setAvailability(id: string, isAvailable: boolean): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/availability`, { isAvailable });
  }
}
