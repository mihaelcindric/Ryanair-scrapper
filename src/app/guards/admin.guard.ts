import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.getCurrentUser().pipe(
      map(user => {
        if (user && user.is_admin) {
          return true;
        }
        // If not admin, redirect to flights/search
        return this.router.createUrlTree(['/flights/search']);
      })
    );
  }
}
