import { Component } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {RouterLink} from '@angular/router';

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

  constructor(private fb: FormBuilder) {
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
        validators: [this.passwordMatchValidator], // Pass group-level validators here
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
      console.log('Registration successful', this.registerForm.value);
      alert('Registration successful!');
    } else {
      alert('Please fill all the required fields correctly.');
    }
  }
}
