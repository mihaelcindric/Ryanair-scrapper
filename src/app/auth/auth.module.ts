import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';


@NgModule({
  declarations: [

  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LoginComponent,
    RegisterComponent,
    RouterModule,
    RegisterComponent,
    LoginComponent
  ],
  exports: [
    LoginComponent,
    RegisterComponent,
  ],
})
export class AuthModule { }
