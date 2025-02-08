import {Component, Inject, OnInit, Output} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FlightsService } from '../../services/flights.service'; // Provjerite putanju!
import { AuthService, User } from '../../services/auth.service';
import {take} from 'rxjs';
import EventEmitter from 'node:events';
import {MatButton} from '@angular/material/button';


export interface TravelDetailData {
  travel: any;
}

@Component({
  selector: 'app-travel-detail',
  templateUrl: './travel-detail.component.html',
  imports: [
    DatePipe,
    CurrencyPipe,
    DecimalPipe,
    CommonModule,
    MatButton
  ],
  styleUrls: ['./travel-detail.component.css']
})
export class TravelDetailComponent implements OnInit {
  selectedFlight: any = null;
  user: User | null = null;
  isSaved: Boolean = false;

  constructor(
    public dialogRef: MatDialogRef<TravelDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TravelDetailData,
    private flightsService: FlightsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe((user) => {
      this.user = user;
      if (user) {
        this.checkIfSaved()
      }
    });

    // For every flight of travel.flights fetch cities
    if (this.data.travel.flights && this.data.travel.flights.length > 0) {
      this.data.travel.flights.forEach((flight: { departure_city: string; from_airport: string; arrival_city: string; to_airport: string; }) => {
        if (!flight.departure_city) {
          this.flightsService.getLocationByAirport(flight.from_airport)
            .subscribe(loc => {
              flight.departure_city = loc.name;
            }, err => {
              console.error(`Error fetching departure location for airport ${flight.from_airport}`, err);
            });
        }
        if (!flight.arrival_city) {
          this.flightsService.getLocationByAirport(flight.to_airport)
            .subscribe(loc => {
              flight.arrival_city = loc.name;
            }, err => {
              console.error(`Error fetching arrival location for airport ${flight.to_airport}`, err);
            });
        }
      });
    }

    this.checkIfSaved();
  }

  onClose(): void {
    this.dialogRef.close();
  }

  selectFlight(flight: any) {
    this.selectedFlight = flight;
  }

  checkIfSaved(): void {
    if (!this.user) return;
    this.flightsService.isTravelSaved(this.user.id, this.data.travel.id).subscribe(res => {
      this.isSaved = res.success;
    });
  }

  toggleSaveTravel(): void {
    if (!this.user) {
      alert('You must be logged in to save a travel.');
      return;
    }

    if (this.isSaved) {
      this.removeSavedTravel();
    } else {
      this.saveTravel();
    }
  }


  saveTravel(): void {
    if (!this.user) return;

    this.flightsService.saveTravel(this.user.id, this.data.travel.id)
      .pipe(take(1))
      .subscribe(res => {
        if (res.success) {
          this.isSaved = true;
        } else {
          alert('Error saving travel.');
        }
      });
  }

  removeSavedTravel() {
    if (!this.user) return;

    this.flightsService.removeSavedTravel(this.user.id, this.data.travel.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.isSaved = false;
          this.dialogRef.close(this.data.travel.id);
        } else {
          alert('Error removing travel.');
        }
      },
      error: (err) => console.error("❌ Error removing saved travel:", err),
    });
  }


}
