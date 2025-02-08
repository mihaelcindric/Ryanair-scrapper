import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getTableSchema(tableName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/table-schema`, { tableName });
  }

  getTableData(tableName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/table-data`, { tableName });
  }

  insertRecord(tableName: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/insert-record`, { tableName, data });
  }

  deleteRecord(tableName: string, id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/delete-record`, { tableName, id });
  }


  getLocationByName(cityName: string, countryName: string): Observable<any> {
    const encodedCity = encodeURIComponent(cityName);
    const encodedCountry = encodeURIComponent(countryName);

    return this.http.get(`${this.apiUrl}/admin/location/by-name?city=${encodedCity}&country=${encodedCountry}`);
  }

  insertAirportRelationship(originIata: string, destinationIata: string): Observable<any> {
    const requestBody = { originIata, destinationIata };
    return this.http.post(`${this.apiUrl}/admin/airport-relationships`, requestBody);
  }

  updateRecord(tableName: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/update-record`, { tableName, data });
  }


}

