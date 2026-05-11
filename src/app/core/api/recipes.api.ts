import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateRecipeRequest, RecipeDto, RecipeSummaryDto, UpdateRecipeRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class RecipesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/recipes`;

  list(includeInactive = false): Observable<RecipeSummaryDto[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<RecipeSummaryDto[]>(this.base, { params });
  }

  get(id: string): Observable<RecipeDto> {
    return this.http.get<RecipeDto>(`${this.base}/${id}`);
  }

  getByProduct(productId: string): Observable<RecipeDto> {
    return this.http.get<RecipeDto>(`${this.base}/by-product/${productId}`);
  }

  create(body: CreateRecipeRequest): Observable<RecipeDto> {
    return this.http.post<RecipeDto>(this.base, body);
  }

  update(body: UpdateRecipeRequest): Observable<RecipeDto> {
    return this.http.put<RecipeDto>(`${this.base}/${body.id}`, body);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
