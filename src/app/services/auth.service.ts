import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  username: string;
  email: string;
  profile_picture_url: string;
  is_admin: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = 'http://localhost:3000/api'; // Backend URL
  private currentUserSubject: BehaviorSubject<User | null>;

  public currentUser$: Observable<User | null>;

  constructor(private http: HttpClient) {
    // Pokupi korisnika iz localStorage-a ako postoji
    const savedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(savedUser ? JSON.parse(savedUser) : null);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<{ success: boolean; user?: User; message?: string }>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(
        tap(response => {
          if (response.success && response.user) {
            // Spremi korisnika u BehaviorSubject i localStorage
            this.currentUserSubject.next(response.user);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
          }
        })
      );
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUser$;
  }

  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
  }

  loadUserFromStorage(): void {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  updateProfile(updatedUser: User): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/auth/update-profile`, updatedUser);
  }

  refreshUser(): void {
    this.getCurrentUser().subscribe(user => {
      this.currentUserSubject.next(user);
    });
  }

}
