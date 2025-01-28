import { Component } from '@angular/core';
import {Router, RouterOutlet} from '@angular/router';
import {FooterComponent} from './shared/footer/footer.component';
import {HeaderComponent} from './shared/header/header.component';
import {CommonModule, NgIf} from '@angular/common';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import {Title} from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [
    FooterComponent,
    HeaderComponent,
    RouterOutlet,
    CommonModule,
    HttpClientModule
  ]
})
export class AppComponent {
  title = 'ryanair-scrapper'
  constructor(private router: Router) {}

  isAuthPage(): boolean {
    return this.router.url === '/auth/login' || this.router.url === '/auth/register';
  }
}
