import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    CommonModule,
    AsyncPipe
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  currentUser$: Observable<User | null>;
  dropdownOpen: boolean = false;

  constructor(private authService: AuthService, private router: Router) {
    this.currentUser$ = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser$ = this.authService.getCurrentUser();
    });
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }


  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
    this.dropdownOpen = false;
  }

  setDefaultProfilePicture(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/images/default-profile.png';
  }
}
