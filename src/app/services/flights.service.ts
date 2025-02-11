import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FlightsService {
  private apiUrl = 'http://localhost:3000/api'; // Backend URL

  constructor(private http: HttpClient) {}


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

  addTravel(travelData: any): Observable<any> {
    console.log("📡 Sending travel data to backend:", travelData);
    return this.http.post(`${this.apiUrl}/flights/travels/add-travel`, travelData);
  }

  addTravelFlight(joinData: { travel_id: number, flight_id: number }): Observable<any> {
    console.log("📡 Sending travel-flight join data to backend:", joinData);
    return this.http.post(`${this.apiUrl}/flights/travels/add-travel-flight`, joinData);
  }

  getLocationDetails(selection: string): Observable<{ name: string, country: string }> {
    console.log(`🔍 getLocationDetails() called for selection: ${selection}`);
    const url = `${this.apiUrl}/flights/locations/details?selection=${encodeURIComponent(selection)}`;
    return this.http.get<{ name: string, country: string }>(url);
  }

  getLocationByAirport(airportCode: string): Observable<{ name: string, country: string }> {
    console.log(`🔍 getLocationByAirport() called for airport: ${airportCode}`);
    const url = `${this.apiUrl}/flights/airports/location?code=${encodeURIComponent(airportCode)}`;
    return this.http.get<{ name: string, country: string }>(url);
  }

  getStoredTravels(from: string, to: string, periodStart: string, periodEnd: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/flights/travels/stored-travels`, { from, to, periodStart, periodEnd });
  }

  getTravelFlights(travelId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/flights/travels/${travelId}/flights`);
  }

  getSavedTravels(userId: number): Observable<any> {
    return this.http.post<{ success: boolean; travels: any[] }>(
      `${this.apiUrl}/flights/travels/saved-travels`,
      { user_id: userId }
    );
  }

  saveTravel(userId: number, travelId: number): Observable<any> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/flights/travels/save-travel`,
      { user_id: userId, travel_id: travelId }
    );
  }

  removeSavedTravel(user_id: number, travel_id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/flights/travels/remove-saved-travel`, { user_id, travel_id });
  }

  isTravelSaved(user_id: number, travel_id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/flights/travels/saved-travel`, { user_id, travel_id });
  }

  getBaggageByUser(userId: number): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/flights/baggage/by-user`, { userId });
  }

  addBaggage(baggageData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/flights/baggage/add`, baggageData);
  }

  updateBaggage(baggageData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/flights/baggage/update`, baggageData);
  }

  deleteBaggage(baggageId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/flights/baggage/delete`, { baggageId });
  }

  getFlightCategories(flightId: number): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/flights/flights/categories`, { flightId });
  }

  getAirplaneById(airplaneId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/flights/getAirplaneById`, { airplane_id: airplaneId });
  }

  getPopularLocation(type: string):  Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/flights/statistics/popular-location`, { type });
  }

  getFlightVsWaitTime(type: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/flights/statistics/flight-vs-wait`, { type });
  }

  getFlightAnalysis(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/flights/statistics/analyze-flights`);
  }

  getTopDestinationsByMonth(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/flights/statistics/top-destinations`);
  }

  getAllAirports(): Observable<any> {
    return this.http.get(`${this.apiUrl}/flights/all-airports`);
  }

  getAirportConnections(airportId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/flights/airport-connections`, { id: airportId }, { headers: { 'Content-Type': 'application/json' } });
  }
}
