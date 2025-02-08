import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FlightsService } from '../../services/flights.service';
import { AuthService, User } from '../../services/auth.service';
import {take} from 'rxjs';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {FlightCategoryDialogComponent} from '../flight-category-dialog/flight-category-dialog.component';


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
    MatButton,
    MatIcon
  ],
  styleUrls: ['./travel-detail.component.css']
})
export class TravelDetailComponent implements OnInit {
  selectedFlight: any = null;
  user: User | null = null;
  isSaved: Boolean = false;
  airplane: any = null;

  constructor(
    public dialogRef: MatDialogRef<TravelDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TravelDetailData,
    private flightsService: FlightsService,
    private authService: AuthService,
    private dialog: MatDialog
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

    if (flight.airplane_id) {
      this.loadAirplaneData(flight.airplane_id);
    } else {
      this.airplane = null;
    }
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

  loadAirplaneData(airplaneId: number) {
    if (!airplaneId) return;

    this.flightsService.getAirplaneById(airplaneId).subscribe({
      next: (res) => {
        if (res.success) {
          console.log(res)
          console.log("X12345X")
          this.airplane = res.airplane;
        } else {
          console.error("❌ Error fetching airplane data.");
        }
      },
      error: (err) => console.error("❌ Error fetching airplane:", err)
    });
  }


  openCategoryDialog(flight: any, event: MouseEvent): void {
    const dialogRef = this.dialog.open(FlightCategoryDialogComponent, {
      width: '296px',
      data: { flight: flight, userId: this.user?.id },
      hasBackdrop: false,  // ❌ Uklanjamo tamnu pozadinu
      panelClass: 'flight-category-popup'  // ✨ Dodajemo klasu za poziciju
    });

    // Close dialog when mouse exits dialog
    const target = event.target as HTMLElement;
    let isInsideDialog = false;

    dialogRef.afterOpened().subscribe(() => {
      const dialogElement = document.querySelector('.flight-category-popup') as HTMLElement;

      dialogElement?.addEventListener('mouseenter', () => (isInsideDialog = true));
      dialogElement?.addEventListener('mouseleave', () => {
        isInsideDialog = false;
        setTimeout(() => {
          if (!isInsideDialog) {
            dialogRef.close();
          }
        }, 200);
      });

      target.addEventListener('mouseleave', () => {
        setTimeout(() => {
          if (!isInsideDialog) {
            dialogRef.close();
          }
        }, 200);
      });
    });
  }
}
