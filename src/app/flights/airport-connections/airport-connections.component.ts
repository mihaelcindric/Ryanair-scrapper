import { Component, OnInit } from '@angular/core';
import { FlightsService } from '../../services/flights.service';
import "leaflet/dist/leaflet.css";

@Component({
  selector: 'app-airport-connections',
  templateUrl: './airport-connections.component.html',
  styleUrls: ['./airport-connections.component.css']
})
export class AirportConnectionsComponent implements OnInit {
  private map: any;
  private markers: any[] = [];
  private connections: any[] = [];
  private selectedAirport: number | null = null;
  private airports: any[] = []; // Sprema sve aerodrome
  private L: any; // Leaflet instance

  constructor(private flightsService: FlightsService) {}

  ngOnInit(): void {
    console.log('[AirportConnections] Komponenta inicijalizirana.');

    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        this.L = L;
        console.log('[AirportConnections] Leaflet uspješno učitan.');
        this.initMap();
        this.loadAirports();
      }).catch(error => {
        console.error('[AirportConnections] Pogreška prilikom učitavanja Leafleta:', error);
      });
    } else {
      console.error('[AirportConnections] Window nije definiran!');
    }
  }

  private initMap(): void {
    this.map = this.L.map('map', {
      center: [48.8566, 2.3522], // Centar (Pariz, možeš promijeniti)
      zoom: 4
    });

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    setTimeout(() => {
      this.map.invalidateSize(); // Refresh layouta kako bi se tiles pravilno složili
    }, 500);
  }


  private loadAirports(): void {
    console.log('[AirportConnections] Dohvaćam aerodrome...');

    this.flightsService.getAllAirports().subscribe(response => {
      console.log('[AirportConnections] Odgovor od API-ja:', response);

      if (response.success && response.airports.length > 0) {
        this.airports = response.airports; // Spremanje svih aerodroma

        response.airports.forEach((airport: { latitude: number; longitude: number; code: any; city: any; id: number; }) => {
          const marker = this.L.marker([airport.latitude, airport.longitude])
            .addTo(this.map)
            .bindTooltip(`${airport.code} - ${airport.city}`, { permanent: false, direction: 'top' });

          marker.on('mouseover', () => marker.openTooltip());
          marker.on('mouseout', () => marker.closeTooltip());

          marker.on('click', () => this.loadConnections(airport.id));

          this.markers.push({ marker, airport });
        });

        console.log('[AirportConnections] Svi aerodromi uspješno dodani.');
      } else {
        console.warn('[AirportConnections] Nema dostupnih aerodroma ili API nije vratio očekivani odgovor.');
      }
    }, error => {
      console.error('[AirportConnections] Pogreška prilikom dohvaćanja aerodroma:', error);
    });
  }

  private loadConnections(airportId: number): void {
    console.log(`[AirportConnections] Kliknut aerodrom ID: ${airportId}, dohvaćam veze...`);

    this.selectedAirport = airportId;

    // Brišemo sve prethodne linije
    this.connections.forEach(line => this.map.removeLayer(line));
    this.connections = [];

    this.flightsService.getAirportConnections(airportId).subscribe(response => {
      console.log(`[AirportConnections] Veze za aerodrom ID ${airportId}:`, response);

      if (response.success && response.connections.length > 0) {
        response.connections.forEach((conn: { latitude: number; longitude: number; }) => {
          const airport = this.getAirportById(airportId);
          if (!airport) {
            console.error(`[AirportConnections] Greška: Nije pronađen aerodrom s ID ${airportId}!`);
            return;
          }

          console.log(`[AirportConnections] Spajanje: ${airport.city} (${airport.code}) → ${conn.latitude}, ${conn.longitude}`);

          const line = this.L.polyline(
            [[airport.latitude, airport.longitude], [conn.latitude, conn.longitude]],
            { color: 'blue' }
          ).addTo(this.map);

          this.connections.push(line);
        });

        console.log(`[AirportConnections] Prikazane su veze za aerodrom ID ${airportId}.`);
      } else {
        console.warn(`[AirportConnections] Nema dostupnih veza za aerodrom ID ${airportId}.`);
      }
    }, error => {
      console.error(`[AirportConnections] Pogreška prilikom dohvaćanja veza za aerodrom ID ${airportId}:`, error);
    });
  }

  private getAirportById(id: number) {
    const found = this.airports.find(airport => airport.id === id);
    if (!found) {
      console.warn(`[AirportConnections] Nema aerodroma s ID ${id}!`);
    }
    return found;
  }
}
