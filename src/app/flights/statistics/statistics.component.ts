import { Component, OnInit } from '@angular/core';
import { FlightsService } from '../../services/flights.service';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  imports: [
    CommonModule
  ],
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit {
  popularStartLocation: string = '';
  popularDestLocation: string = '';
  avgFlightTime: number | null = null;
  avgWaitTime: number | null = null;
  avgFlightPrice: number | null = null;
  lowCostFlights: number | null = null;
  highCostFlights: number | null = null;
  topDestinations: any[] = [];

  constructor(private flightsService: FlightsService) {}

  ngOnInit() {
    this.getPopularLocation("start");
    this.getPopularLocation("dest");
    this.getFlightVsWaitTime("flight_time");
    this.getFlightVsWaitTime("wait_time");
    this.getFlightAnalysis();
    this.getTopDestinationsByMonth();
  }

  getPopularLocation(type: 'start' | 'dest') {
    this.flightsService.getPopularLocation(type).subscribe(response => {
      if (type === 'start') {
        this.popularStartLocation = response.city;
      } else {
        this.popularDestLocation = response.city;
      }
    });
  }

  getFlightVsWaitTime(type: 'flight_time' | 'wait_time') {
    this.flightsService.getFlightVsWaitTime(type).subscribe(response => {
      console.log('Flight vs Wait Time Response:', response);
      if (type === 'flight_time') {
        this.avgFlightTime = response.avg_time;
      } else {
        this.avgWaitTime = response.avg_time;
      }
    });
  }

  getFlightAnalysis() {
    this.flightsService.getFlightAnalysis().subscribe(response => {
      console.log('Flight Analysis Response:', response);
      this.avgFlightPrice = response.avg_price;
      this.lowCostFlights = response.low_cost;
      this.highCostFlights = response.high_cost;
    });
  }

  getTopDestinationsByMonth() {
    this.flightsService.getTopDestinationsByMonth().subscribe(response => {
      console.log('Top Destinations Response:', response);
      this.topDestinations = response;
    });
  }
}
