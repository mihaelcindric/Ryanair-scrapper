import { Component } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterLink
  ]
})
export class RegisterComponent {
  registerForm: FormGroup;

  constructor(private fb: FormBuilder,
              private http: HttpClient,
              private router: Router) {
    this.registerForm = this.fb.group(
      {
        first_name: ['', Validators.required],
        last_name: ['', Validators.required],
        date_of_birth: ['', Validators.required],
        username: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        repeat_password: ['', Validators.required],
        profile_picture_url: [''], // Optional field
      },
      {
        validators: [this.passwordMatchValidator],
      }
    );
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const repeatPassword = group.get('repeat_password')?.value;
    return password === repeatPassword ? null : { passwordMismatch: true };
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const {
        first_name,
        last_name,
        date_of_birth,
        username,
        email,
        password,
        profile_picture_url,
      } = this.registerForm.value;

      this.http.post('http://localhost:3000/api/auth/register', {
        first_name,
        last_name,
        date_of_birth,
        username,
        email,
        password,
        profile_picture_url,
      }).subscribe(
        (response: any) => {
          if (response.success) {
            alert('Registration successful!');
            this.router.navigate(['/auth/login']);
          }
        },
        (error) => {
          console.error('Error during registration:', error);
          if (error.status === 400) {
            alert('User with this email or username already exists.');
          } else {
            alert('An error occurred during registration.');
          }
        }
      );
    } else {
      alert('Please fill all the required fields correctly.');
    }
  }
}
