import {RouterModule, Routes} from '@angular/router';
import {LoginComponent} from './auth/login/login.component';
import {RegisterComponent} from './auth/register/register.component';
import {SearchComponent} from './flights/search/search.component';
import {ResultsComponent} from './flights/results/results.component';
import {DashboardComponent} from './admin/dashboard/dashboard.component';
import {NgModule} from '@angular/core';

export const routes: Routes = [
  { path: '', redirectTo: '/flights/search', pathMatch: 'full' },
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register', component: RegisterComponent },
  { path: 'flights/search', component: SearchComponent },
  { path: 'flights/results', component: ResultsComponent },
  { path: 'admin/dashboard', component: DashboardComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
