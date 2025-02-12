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
  password?: string;
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
    const savedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(savedUser ? JSON.parse(savedUser) : null);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<{ success: boolean; user?: User; password?: string; message?: string }>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(
        tap(response => {
          if (response.success && response.user) {
            const userWithDecryptedPassword: User = {
              ...response.user,
              password: response.password,
            };
            this.setCurrentUser(userWithDecryptedPassword);
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

  updateProfile(updatedUser: User): Observable<{ success: boolean, message: string }> {
    return this.http.put<{ success: boolean, message: string }>(`${this.baseUrl}/auth/update-profile`, updatedUser).pipe(
      tap(response => {
        if (response.success) {
          this.setCurrentUser(updatedUser);
        }
      })
    );
  }

  setCurrentUser(user: User) {
    console.log("🔄 Setting new current user:", user);
    this.currentUserSubject.next(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
}
