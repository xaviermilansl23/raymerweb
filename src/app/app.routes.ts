import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'productos' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'productos',
        loadComponent: () => import('./features/products/products.component').then((m) => m.ProductsComponent),
      },
{
          path: 'productos/:id',
          loadComponent: () => import('./features/products/product-detail.component').then((m) => m.ProductDetailComponent),
        },
        {
          path: 'combos',
          loadComponent: () => import('./features/combos/combos.component').then((m) => m.CombosComponent),
        },
      {
        path: 'perfil',
        canActivate: [authGuard],
        loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'nosotros',
        loadComponent: () => import('./features/nosotros/nosotros.component').then((m) => m.NosotrosComponent),
      },
      {
        path: 'favoritos',
        canActivate: [authGuard],
        loadComponent: () => import('./features/favoritos/favoritos.component').then((m) => m.FavoritosComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'productos' },
];
