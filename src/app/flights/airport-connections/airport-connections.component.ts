import { Component, OnInit } from '@angular/core';
import { FlightsService } from '../../services/flights.service';
import "leaflet/dist/leaflet.css";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-airport-connections',
  templateUrl: './airport-connections.component.html',
  imports: [
    CommonModule
  ],
  styleUrls: ['./airport-connections.component.css']
})
export class AirportConnectionsComponent implements OnInit {
  private map: any;
  private markers: Map<number, any> = new Map();
  private connections: any[] = [];
  protected selectedAirport: number | null = null;
  protected selectedConnection: number | null = null;
  private airports: any[] = [];
  protected connectedAirports: any[] = [];
  private L: any;

  constructor(private flightsService: FlightsService) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        this.L = L;
        this.initMap();
        this.loadAirports();
      });
    }
  }

  private initMap(): void {
    this.map = this.L.map('map', {
      center: [48.8566, 2.3522],
      zoom: 4,
    });
    this.map.setMinZoom(2);

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    setTimeout(() => {
      this.map.invalidateSize();
    }, 500);
  }

  private loadAirports(): void {
    this.flightsService.getAllAirports().subscribe(response => {
      if (response.success && response.airports.length > 0) {
        this.airports = response.airports;

        response.airports.forEach((airport: { latitude: any; longitude: any; code: any; city: any; id: number; }) => {
          const marker = this.L.marker([airport.latitude, airport.longitude], { opacity: 1.0 })
            .addTo(this.map)
            .bindTooltip(`${airport.code} - ${airport.city}`, { permanent: false, direction: 'top' });

          marker.on('click', () => this.loadConnections(airport.id));

          this.markers.set(airport.id, marker);

          // make all markers gray
          setTimeout(() => {
            console.log("Marker", marker);
            if (marker._icon) {
              marker._icon.style.filter = "grayscale(100%)";
            }
          }, 100);
        });
      }
    });
  }

  private loadConnections(airportId: number): void {
    this.selectedAirport = airportId;
    this.selectedConnection = null;

    // Reset all markers and make them transparent
    this.markers.forEach((marker, id) => {
      if (marker._icon) {
        marker._icon.style.filter = "grayscale(100%) opacity(25%)";
      }
    });

    // Set pink/red color for the selected airport
    if (this.markers.has(airportId) && this.markers.get(airportId)._icon) {
      this.markers.get(airportId)._icon.style.filter = "hue-rotate(120deg)";
    }

    // Delete all lines before adding new ones
    this.connections.forEach(conn => this.map.removeLayer(conn.line));
    this.connections = [];

    this.flightsService.getAirportConnections(airportId).subscribe(response => {
      if (response.success && response.connections.length > 0) {
        this.connectedAirports = response.connections;

        response.connections.forEach((conn: { latitude: any; longitude: any; id: number; }) => {
          const line = this.L.polyline(
            [[this.getAirportById(airportId).latitude, this.getAirportById(airportId).longitude], [conn.latitude, conn.longitude]],
            { color: 'blue' }
          ).addTo(this.map);

          this.connections.push({ line, destinationId: conn.id });

          // Set yellow color for the selected airports
          if (this.markers.has(conn.id) && this.markers.get(conn.id)._icon) {
            this.markers.get(conn.id)._icon.style.filter = "hue-rotate(210deg) saturate(200%) brightness(120%)";
          }
        });
      }
    });
  }



  highlightConnection(destinationId: number) {
    this.selectedConnection = destinationId;

    // Reset all lines to blue
    this.connections.forEach(conn => conn.line.setStyle({ color: 'blue' }));

    // Make the selected route red
    const selectedLine = this.connections.find(conn => conn.destinationId === destinationId);
    if (selectedLine) {
      selectedLine.line.setStyle({ color: 'red' });
    }
  }

  protected getAirportById(id: number) {
    return this.airports.find(airport => airport.id === id);
  }
}
