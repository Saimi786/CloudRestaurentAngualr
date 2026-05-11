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
    path: 'receipt/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/orders/receipt.component').then(m => m.ReceiptComponent)
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
          },
          {
            path: 'recipes',
            loadComponent: () =>
              import('./features/catalog/recipes/recipes-list.component').then(m => m.RecipesListComponent)
          },
          {
            path: 'recipes/:id',
            loadComponent: () =>
              import('./features/catalog/recipes/recipe-edit.component').then(m => m.RecipeEditComponent)
          },
          {
            path: 'price-rules',
            loadComponent: () =>
              import('./features/catalog/price-rules/price-rules-list.component').then(m => m.PriceRulesListComponent)
          },
          {
            path: 'price-rules/:id',
            loadComponent: () =>
              import('./features/catalog/price-rules/price-rule-edit.component').then(m => m.PriceRuleEditComponent)
          },
          {
            path: 'mix-match',
            loadComponent: () =>
              import('./features/catalog/mix-match/mix-match-list.component').then(m => m.MixMatchListComponent)
          },
          {
            path: 'mix-match/:id',
            loadComponent: () =>
              import('./features/catalog/mix-match/mix-match-edit.component').then(m => m.MixMatchEditComponent)
          },
          {
            path: '86-list',
            loadComponent: () =>
              import('./features/catalog/products/eighty-six-list.component').then(m => m.EightySixListComponent)
          },
          {
            path: 'modifier-groups',
            loadComponent: () =>
              import('./features/catalog/modifier-groups/modifier-groups-list.component').then(m => m.ModifierGroupsListComponent)
          },
          {
            path: 'modifier-groups/:id',
            loadComponent: () =>
              import('./features/catalog/modifier-groups/modifier-group-edit.component').then(m => m.ModifierGroupEditComponent)
          },
          {
            path: 'brands',
            loadComponent: () =>
              import('./features/catalog/brands/brands-list.component').then(m => m.BrandsListComponent)
          },
          {
            path: 'brands/:id',
            loadComponent: () =>
              import('./features/catalog/brands/brand-edit.component').then(m => m.BrandEditComponent)
          }
        ]
      },
      {
        path: 'pos',
        loadComponent: () =>
          import('./features/pos/pos.component').then(m => m.PosComponent)
      },
      {
        path: 'kitchen',
        loadComponent: () =>
          import('./features/kitchen/kitchen-display.component').then(m => m.KitchenDisplayComponent)
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
        path: 'restaurant',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'tables' },
          {
            path: 'floor-plans',
            loadComponent: () =>
              import('./features/restaurants/floor-plans/floor-plans-list.component').then(m => m.FloorPlansListComponent)
          },
          {
            path: 'floor-plans/:id',
            loadComponent: () =>
              import('./features/restaurants/floor-plans/floor-plan-edit.component').then(m => m.FloorPlanEditComponent)
          },
          {
            path: 'tables',
            loadComponent: () =>
              import('./features/restaurants/tables/tables-list.component').then(m => m.TablesListComponent)
          },
          {
            path: 'tables/:id',
            loadComponent: () =>
              import('./features/restaurants/tables/table-edit.component').then(m => m.TableEditComponent)
          },
          {
            path: 'kitchen-stations',
            loadComponent: () =>
              import('./features/restaurants/kitchen-stations/kitchen-stations-list.component').then(m => m.KitchenStationsListComponent)
          },
          {
            path: 'kitchen-stations/:id',
            loadComponent: () =>
              import('./features/restaurants/kitchen-stations/kitchen-station-edit.component').then(m => m.KitchenStationEditComponent)
          }
        ]
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/customers/customers-list.component').then(m => m.CustomersListComponent)
      },
      {
        path: 'customers/:id',
        loadComponent: () =>
          import('./features/customers/customer-edit.component').then(m => m.CustomerEditComponent)
      },
      {
        path: 'customer-groups',
        loadComponent: () =>
          import('./features/customers/customer-groups/customer-groups-list.component').then(m => m.CustomerGroupsListComponent)
      },
      {
        path: 'customer-groups/:id',
        loadComponent: () =>
          import('./features/customers/customer-groups/customer-group-edit.component').then(m => m.CustomerGroupEditComponent)
      },
      {
        path: 'tax-rates',
        loadComponent: () =>
          import('./features/tax/tax-rates-list.component').then(m => m.TaxRatesListComponent)
      },
      {
        path: 'tax-rates/:id',
        loadComponent: () =>
          import('./features/tax/tax-rate-edit.component').then(m => m.TaxRateEditComponent)
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./features/suppliers/suppliers-list.component').then(m => m.SuppliersListComponent)
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./features/expenses/expenses-list.component').then(m => m.ExpensesListComponent)
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports-page.component').then(m => m.ReportsPageComponent)
      },
      {
        path: 'inventory/transfer',
        loadComponent: () =>
          import('./features/inventory/stock-transfer.component').then(m => m.StockTransferComponent)
      },
      {
        path: 'inventory/waste',
        loadComponent: () =>
          import('./features/inventory/waste-log.component').then(m => m.WasteLogComponent)
      },
      {
        path: 'purchase-orders',
        loadComponent: () =>
          import('./features/purchase-orders/purchase-orders-list.component').then(m => m.PurchaseOrdersListComponent)
      },
      {
        path: 'purchase-orders/:id',
        loadComponent: () =>
          import('./features/purchase-orders/purchase-order-edit.component').then(m => m.PurchaseOrderEditComponent)
      },
      {
        path: 'supplier-bills',
        loadComponent: () =>
          import('./features/purchase-orders/supplier-bills-list.component').then(m => m.SupplierBillsListComponent)
      },
      {
        path: 'cash-registers',
        loadComponent: () =>
          import('./features/cash-registers/cash-registers-list.component').then(m => m.CashRegistersListComponent)
      },
      {
        path: 'cash-registers/shifts',
        loadComponent: () =>
          import('./features/cash-registers/shifts-list.component').then(m => m.ShiftsListComponent)
      },
      {
        path: 'cash-registers/shifts/:id',
        loadComponent: () =>
          import('./features/cash-registers/shift-detail.component').then(m => m.ShiftDetailComponent)
      },
      {
        path: 'imports',
        loadComponent: () =>
          import('./features/imports/csv-import.component').then(m => m.CsvImportComponent)
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
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./features/roles/roles-admin.component').then(m => m.RolesAdminComponent)
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/business-settings.component').then(m => m.BusinessSettingsComponent)
      },
      {
        path: 'platform',
        loadComponent: () =>
          import('./features/platform/platform-shell.component').then(m => m.PlatformShellComponent),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./features/platform/platform-dashboard.component').then(m => m.PlatformDashboardComponent)
          },
          {
            path: 'tenants',
            loadComponent: () =>
              import('./features/platform/platform-tenants-list.component').then(m => m.PlatformTenantsListComponent)
          },
          {
            path: 'tenants/:id/manage',
            loadComponent: () =>
              import('./features/platform/manage-business.component').then(m => m.ManageBusinessComponent)
          },
          {
            path: 'tenants/:tenantId/branches/:branchId',
            loadComponent: () =>
              import('./features/platform/manage-location.component').then(m => m.ManageLocationComponent)
          },
          {
            path: 'tenants/:id',
            loadComponent: () =>
              import('./features/platform/platform-tenant-edit.component').then(m => m.PlatformTenantEditComponent)
          }
        ]
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
