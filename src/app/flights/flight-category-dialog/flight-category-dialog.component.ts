import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FlightsService } from '../../services/flights.service';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-flight-category-dialog',
  templateUrl: './flight-category-dialog.component.html',
  imports: [
    CommonModule
  ],
  styleUrls: ['./flight-category-dialog.component.css']
})
export class FlightCategoryDialogComponent implements OnInit {
  flightCategories: any[] = [];
  userBaggage: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<FlightCategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { flight: any, userId: number },
    private flightsService: FlightsService
  ) {}

  ngOnInit(): void {
    this.loadFlightCategories();
    this.loadUserBaggage();
  }

  loadFlightCategories() {
    this.flightsService.getFlightCategories(this.data.flight.id).subscribe((res: any) => {
      if (res.success) {
        const uniqueCategories = new Map();
        res.categories.forEach((category: any) => {
          if (!uniqueCategories.has(category.category)) {
            uniqueCategories.set(category.category, category);
          }
        });
        this.flightCategories = Array.from(uniqueCategories.values());
      } else {
        console.error("❌ Error fetching flight categories.");
      }
    });
  }


  loadUserBaggage(): void {
    this.flightsService.getBaggageByUser(this.data.userId).subscribe((res: any) => {
      this.userBaggage = res.baggage;
    }, (error) => {
      console.error("❌ Error fetching baggage:", error);
    });
  }

  calculatePrice(basePrice: number, increasePercentage: number): number {
    return basePrice + (basePrice * (increasePercentage / 100));
  }

  getAllowedBaggage(category: any, type: string): any[] {
    const dimensions = {
      personalBag: { w: 40, h: 25, d: 20 },
      cabinBag: { w: 55, h: 40, d: 20 },
      checkInBag: { w: 119, h: 119, d: 81 }
    };

    let allowedBaggage: any[] = [];
    this.userBaggage.forEach((baggage) => {
      const { width, height, depth } = baggage;

      if ((type === 'personalBag' && category) ||
        (type === 'cabinBag' && category.cabin_baggage) ||
        (type === 'checkInBag' && category.check_in_baggage)) {

        // Checking the minimal and maximal allowed dimensions
        const fitsMax = (width <= dimensions[type].w && height <= dimensions[type].h && depth <= dimensions[type].d) ||
          (width <= dimensions[type].h && height <= dimensions[type].w && depth <= dimensions[type].d);

        const fitsMin = type === 'cabinBag' ?
          (width > dimensions.personalBag.w || height > dimensions.personalBag.h || depth > dimensions.personalBag.d) :
          type === 'checkInBag' ?
            (width > dimensions.cabinBag.w || height > dimensions.cabinBag.h || depth > dimensions.cabinBag.d) :
            true;

        if (fitsMax && fitsMin) {
          allowedBaggage.push(baggage);
        }
      }
    });

    return allowedBaggage;
  }
}
