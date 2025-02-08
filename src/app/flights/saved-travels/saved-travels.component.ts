import { Component, OnInit } from "@angular/core";
import { FlightsService } from "../../services/flights.service";
import { AuthService, User } from "../../services/auth.service";
import { MatDialog } from "@angular/material/dialog";
import { TravelDetailComponent, TravelDetailData } from "../travel-detail/travel-detail.component";
import {CommonModule, CurrencyPipe, DatePipe, KeyValuePipe} from '@angular/common';

@Component({
  selector: "app-saved-travels",
  templateUrl: "./saved-travels.component.html",
  imports: [
    KeyValuePipe,
    CurrencyPipe,
    DatePipe,
    CommonModule
  ],
  styleUrls: ["./saved-travels.component.css"]
})
export class SavedTravelsComponent implements OnInit {
  savedTravels: any[] = [];
  groupedTravels: { [destination: string]: any[] } = {};
  user: User | null = null;

  constructor(
    private flightsService: FlightsService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
  }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe((user) => {
      if (user) {
        this.user = user;
        this.loadSavedTravels(user.id);
      }
    });
  }

  loadSavedTravels(userId: number): void {
    this.flightsService.getSavedTravels(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.savedTravels = response.travels;
          this.groupedTravels = this.groupByDestination(this.savedTravels);
        } else {
          console.error("Error fetching saved travels:", response.message);
        }
      },
      error: (err) => console.error("Error fetching saved travels:", err),
    });
  }

  groupByDestination(travels: any[]): { [destination: string]: any[] } {
    return travels.reduce((acc, travel) => {
      if (!acc[travel.destination_city]) {
        acc[travel.destination_city] = [];
      }
      acc[travel.destination_city].push(travel);
      return acc;
    }, {} as { [destination: string]: any[] });
  }

  openTravelDetail(travel: any): void {
    if (!travel.flights) {
      this.flightsService.getTravelFlights(travel.id).subscribe({
        next: (flights: any[]) => {
          console.log(`Retrieved ${flights.length} flights for travel id ${travel.id}`);
          travel.flights = flights;
          const dialogRef = this.dialog.open(TravelDetailComponent, {
            width: '600px',
            data: { travel: travel } as TravelDetailData
          });

          dialogRef.afterClosed().subscribe((travelId: number | undefined) => {
            if (travelId) {
              this.removeTravelFromList(travelId);
            }
          });
        },
        error: (err) => {
          console.error('Error fetching flights for travel:', err);
        }
      });
    } else {
      const dialogRef = this.dialog.open(TravelDetailComponent, {
        width: '600px',
        data: { travel: travel } as TravelDetailData
      });

      dialogRef.afterClosed().subscribe((travelId: number | undefined) => {
        if (travelId) {
          this.removeTravelFromList(travelId);
        }
      });
    }
  }

  removeTravelFromList(travelId: number): void {
    this.savedTravels = this.savedTravels.filter(travel => travel.id !== travelId);
    this.groupedTravels = this.groupByDestination(this.savedTravels);
  }


}
