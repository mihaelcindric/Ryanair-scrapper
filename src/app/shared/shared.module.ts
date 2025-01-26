import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { SpinnerComponent } from './spinner/spinner.component';

@NgModule({
  declarations: [

  ],
  imports: [
    CommonModule,
    HeaderComponent,
    SpinnerComponent,
    FooterComponent,
  ],
  exports: [
    HeaderComponent,
    FooterComponent,
    SpinnerComponent,
  ],
})
export class SharedModule {}
