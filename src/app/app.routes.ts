// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { HomeAComponent } from './pages/admin/home-a/home-a.component';
import { HomeDComponent } from './pages/delivery/home-d/home-d.component';
import { MainLayoutComponent } from './shared/layouts/main-layout/main-layout.component'; 
// Exporta las rutas
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent }, 
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: 'admin/:id', component: HomeAComponent },
      { path: 'delivery/:id', component: HomeDComponent } 
    ]
  },
  { path: '**', redirectTo: 'login' }
];