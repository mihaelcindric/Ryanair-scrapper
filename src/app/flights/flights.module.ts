import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SearchComponent } from './search/search.component';
import {TravelDetailComponent} from './travel-detail/travel-detail.component';
import {MatDialogModule} from '@angular/material/dialog';

@NgModule({
  declarations: [

  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SearchComponent,
    TravelDetailComponent,
    MatDialogModule
  ],
  exports: [
    SearchComponent,
  ],
})
export class FlightsModule {}
