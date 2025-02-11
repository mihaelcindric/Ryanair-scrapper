import {RouterModule, Routes} from '@angular/router';
import {LoginComponent} from './auth/login/login.component';
import {RegisterComponent} from './auth/register/register.component';
import {SearchComponent} from './flights/search/search.component';
import {TravelDetailComponent} from './flights/travel-detail/travel-detail.component';
import {DashboardComponent} from './admin/dashboard/dashboard.component';
import {NgModule} from '@angular/core';
import {AdminGuard} from './guards/admin.guard';
import {ProfileComponent} from './flights/profile/profile.component';
import {SavedTravelsComponent} from './flights/saved-travels/saved-travels.component';
import {GuestGuard} from './guards/guest.guard';
import {StatisticsComponent} from './flights/statistics/statistics.component';
import {AboutUsComponent} from './shared/about-us/about-us.component';
import {AirportConnectionsComponent} from './flights/airport-connections/airport-connections.component';

export const routes: Routes = [
  { path: '', redirectTo: '/flights/search', pathMatch: 'full' },
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register', component: RegisterComponent },
  { path: 'flights/search', component: SearchComponent },
  { path: 'flights/travel-detail', component: TravelDetailComponent },
  { path: 'flights/profile', component: ProfileComponent, canActivate: [GuestGuard] },
  { path: 'flights/saved-travels', component: SavedTravelsComponent, canActivate: [GuestGuard] },
  { path: 'flights/statistics', component: StatisticsComponent, canActivate: [GuestGuard] },
  { path: 'flights/airport-connections', component: AirportConnectionsComponent},
  { path: 'admin/dashboard', component: DashboardComponent, canActivate: [AdminGuard] },
  { path: 'shared/about-us', component: AboutUsComponent},
  { path: '**', redirectTo: 'flights/search' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
