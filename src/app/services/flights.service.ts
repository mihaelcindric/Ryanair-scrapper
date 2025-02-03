import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FlightsService {
  private apiUrl = 'http://localhost:3000/api'; // Backend URL

  constructor(private http: HttpClient) {}

  searchFlights(from: string, to: string, periodStart: string, periodEnd: string): Observable<any> {
    console.log(`🔍 searchFlights() called with: from=${from}, to=${to}, periodStart=${periodStart}, periodEnd=${periodEnd}`);

    if (!from || !to || !periodStart || !periodEnd) {
      console.warn("⚠️ searchFlights called with missing parameters!");
    }

    return this.http.get(`${this.apiUrl}/flights/search?from=${from}&to=${to}&periodStart=${periodStart}&periodEnd=${periodEnd}`);

  }

  getAirportCodes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/flights/airport-codes`);
  }

  getAllLocations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/flights/locations`);
  }

  addFlight(flightData: any): Observable<any> {
    console.log("📡 Sending flight data to backend:", flightData);
    return this.http.post(`${this.apiUrl}/flights/add-flight`, flightData);
  }

  getFilteredFlights(departure_time: string, arrival_time: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/flights/filtered-flights?departure_time=${departure_time}&arrival_time=${arrival_time}`);
  }

  getAirportsForLocation(location: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/flights/airports-for-location?location=${encodeURIComponent(location)}`);
  }

  getConnectedAirports(airportCode: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/flights/connected-airports/${airportCode}`);
  }

  getStoredFlights(fromAirports: string[], toAirports: string[], periodStart: string, periodEnd: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/flights/stored-flights`, { fromAirports, toAirports, periodStart, periodEnd });
  }
}
