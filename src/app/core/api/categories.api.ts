import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategoryDto, CreateCategoryRequest, UpdateCategoryRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class CategoriesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/categories`;

  list(includeInactive = false): Observable<CategoryDto[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<CategoryDto[]>(this.base, { params });
  }

  get(id: string): Observable<CategoryDto> {
    return this.http.get<CategoryDto>(`${this.base}/${id}`);
  }

  create(body: CreateCategoryRequest): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(this.base, body);
  }

  update(body: UpdateCategoryRequest): Observable<CategoryDto> {
    return this.http.put<CategoryDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
