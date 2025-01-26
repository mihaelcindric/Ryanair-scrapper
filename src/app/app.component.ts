import { Component } from '@angular/core';
import {Router, RouterOutlet} from '@angular/router';
import {FooterComponent} from './shared/footer/footer.component';
import {HeaderComponent} from './shared/header/header.component';
import {CommonModule, NgIf} from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [
    FooterComponent,
    HeaderComponent,
    RouterOutlet,
    CommonModule
  ]
})
export class AppComponent {
  constructor(private router: Router) {}

  isAuthPage(): boolean {
    // Provjeri URL za login i register rute
    return this.router.url === '/auth/login' || this.router.url === '/auth/register';
  }
}
