import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'tenant',
        loadComponent: () =>
          import('./features/tenant/tenant-info.component').then(m => m.TenantInfoComponent)
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('./features/companies/companies-list.component').then(m => m.CompaniesListComponent)
      },
      {
        path: 'companies/:id',
        loadComponent: () =>
          import('./features/companies/company-edit.component').then(m => m.CompanyEditComponent)
      },
      {
        path: 'branches',
        loadComponent: () =>
          import('./features/branches/branches-list.component').then(m => m.BranchesListComponent)
      },
      {
        path: 'branches/:id',
        loadComponent: () =>
          import('./features/branches/branch-edit.component').then(m => m.BranchEditComponent)
      },
      {
        path: 'catalog',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'products' },
          {
            path: 'products',
            loadComponent: () =>
              import('./features/catalog/products/products-list.component').then(m => m.ProductsListComponent)
          },
          {
            path: 'products/:id',
            loadComponent: () =>
              import('./features/catalog/products/product-edit.component').then(m => m.ProductEditComponent)
          },
          {
            path: 'categories',
            loadComponent: () =>
              import('./features/catalog/categories/categories-list.component').then(m => m.CategoriesListComponent)
          },
          {
            path: 'categories/:id',
            loadComponent: () =>
              import('./features/catalog/categories/category-edit.component').then(m => m.CategoryEditComponent)
          },
          {
            path: 'unit-groups',
            loadComponent: () =>
              import('./features/catalog/unit-groups/unit-groups-list.component').then(m => m.UnitGroupsListComponent)
          },
          {
            path: 'unit-groups/:id',
            loadComponent: () =>
              import('./features/catalog/unit-groups/unit-group-edit.component').then(m => m.UnitGroupEditComponent)
          },
          {
            path: 'units',
            loadComponent: () =>
              import('./features/catalog/units/units-list.component').then(m => m.UnitsListComponent)
          },
          {
            path: 'units/:id',
            loadComponent: () =>
              import('./features/catalog/units/unit-edit.component').then(m => m.UnitEditComponent)
          }
        ]
      },
      {
        path: 'inventory',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'balances' },
          {
            path: 'balances',
            loadComponent: () =>
              import('./features/inventory/stock-balances.component').then(m => m.StockBalancesComponent)
          },
          {
            path: 'movements',
            loadComponent: () =>
              import('./features/inventory/stock-movements.component').then(m => m.StockMovementsComponent)
          },
          {
            path: 'movements/new',
            loadComponent: () =>
              import('./features/inventory/record-movement.component').then(m => m.RecordMovementComponent)
          }
        ]
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users-list.component').then(m => m.UsersListComponent)
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./features/users/user-edit.component').then(m => m.UserEditComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
