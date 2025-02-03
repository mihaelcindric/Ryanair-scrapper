import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FlightsService} from '../../services/flights.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  imports: [
    ReactiveFormsModule,
    CommonModule
  ],
  styleUrls: ['./search.component.css']
})
export class SearchComponent {
  searchForm: FormGroup;
  today: string;
  searchResults: any[] = [];

  locations: any[] = [];
  groupedLocations: { [country: string]: any[] } = {}; // Locations grouped by countries

  constructor(private fb: FormBuilder, private http: HttpClient, private flightsService: FlightsService) {
    const now = new Date();
    this.today = now.toISOString().split('T')[0];

    this.searchForm = this.fb.group({
      from: ['', Validators.required],
      to: [''],
      period_start: ['', [Validators.required]],
      period_end: ['', [Validators.required]],
      duration: ['', [Validators.required, Validators.min(1)]],
      number_of_persons: ['', [Validators.required, Validators.min(1)]],
      return_flight: [false] // Checkbox za povratni let
    }, {
      validators: [this.dateRangeValidator]
    });

    this.loadLocations();
  }

  loadLocations() {
    this.flightsService.getAllLocations().subscribe({
      next: (response) => {
        if (!response) {
          console.error('No response received.');
          this.locations = [];
          this.groupedLocations = {};
          return;
        }

        this.locations = Array.isArray(response) ? response : response.data;

        this.groupedLocations = this.groupByCountry(this.locations);
        console.log('Grouped locations:', this.groupedLocations);
      },
      error: (err) => {
        console.error('Error fetching locations:', err);
        this.locations = [];
        this.groupedLocations = {};
      }
    });
  }

  private groupByCountry(locations: any[]): { [country: string]: any[] } {
    if (!locations || !Array.isArray(locations)) {
      console.error('Invalid locations data:', locations);
      return {};
    }

    return locations.reduce((acc, loc) => {
      if (!loc || !loc.country || !loc.name) {
        console.warn('Skipping invalid location:', loc);
        return acc;
      }

      if (!acc[loc.country]) {
        acc[loc.country] = [{ name: loc.country, country: loc.country }];
      }

      acc[loc.country].push(loc);
      return acc;
    }, {} as { [country: string]: any[] });
  }


  dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const periodStart = control.get('period_start')?.value;
    const periodEnd = control.get('period_end')?.value;

    if (periodStart && periodEnd && periodEnd < periodStart) {
      return { invalidDateRange: true };
    }
    return null;
  }

  async onSearch() {
    console.log("\n🔍 onSearch() function called");
    console.log("➡️ Form values:", this.searchForm.value);

    if (!this.searchForm.valid) {
      console.warn("⚠️ Form is invalid. Please check input fields.");
      return;
    }

    const formValues = this.searchForm.value;
    console.log("✅ Valid form data:", formValues);

    const fromLocation = formValues.from;
    const toLocation = formValues.to;
    const periodStart = formValues.period_start;
    const periodEnd = formValues.period_end;
    const duration = formValues.duration;
    const returnFlight = formValues.return_flight;

    console.log("🔄 Fetching airports for locations...");
    const fromAirports = await this.getAirportsForLocation(fromLocation);
    let toAirports = toLocation ? await this.getAirportsForLocation(toLocation) : [];

    console.log("📍 Airports for FROM location:", fromAirports);
    console.log("📍 Airports for TO location:", toAirports);

    if (fromAirports.length === 0) {
      console.error("❌ No departure airports found.");
      alert("No departure airports found.");
      return;
    }

    console.log("🚀 Preparing API calls...");
    const flightResults: any[] = [];

    for (const fromAirport of fromAirports) {
      if (toAirports.length > 0) {
        for (const toAirport of toAirports) {
          console.log(`🔹 Checking for direct flights: ${fromAirport} -> ${toAirport}`);

          // Finding the shortest routes
          let routes = await this.findShortestRoutes(fromAirport, toAirport);

          if (routes.length === 0) {
            console.warn(`⚠️ No valid route found between ${fromAirport} and ${toAirport}. Skipping.`);
            continue;
          }

          console.log(`🛫 Found ${routes.length} shortest route(s) between ${fromAirport} and ${toAirport}`);

          for (const route of routes) {
            console.log(`🛫 Processing route: ${route.join(" -> ")}`);

            if (route.length === 2) {
              // Direct flight exists
              await this.fetchFlightsBetweenAirports(fromAirport, toAirport, periodStart, periodEnd, duration, returnFlight, flightResults);
            } else {
              // There is no direct flight available - use the shortest routes
              for (let i = 0; i < route.length - 1; i++) {
                await this.fetchFlightsBetweenAirports(route[i], route[i + 1], periodStart, periodEnd, duration, returnFlight, flightResults);
              }
            }
          }
        }
      } else {
        // If the destination wasn't entered, we fetch all possible direct flights from the origin airport
        console.log(`🔹 Checking for direct flights for all possible destinations: ${fromAirport}`);
        toAirports = await this.fetchFlightsWithoutDestination(fromAirport, periodStart, periodEnd, flightResults);
      }
    }

    console.log("✅ Flight results after fetching flights without destination: ", flightResults);

    this.searchResults = await this.fetchStoredFlights(fromAirports, toAirports, periodStart, periodEnd);;
    console.log('✅ Final Search Results:', this.searchResults);
  }


  async fetchStoredFlights(fromAirports: string[], toAirports: string[], periodStart: string, periodEnd: string): Promise<any[]> {
    console.log("🔍 [fetchStoredFlights] Start fetching stored flights from DB");
    console.log("🔍 [fetchStoredFlights] fromAirports:", JSON.stringify(fromAirports));
    console.log("🔍 [fetchStoredFlights] toAirports:", JSON.stringify(toAirports));
    console.log("🔍 [fetchStoredFlights] periodStart:", periodStart);
    console.log("🔍 [fetchStoredFlights] periodEnd:", periodEnd);

    let flightResults: any[] = [];

    try {
      // Fetching direct flights
      console.log("🔍 [fetchStoredFlights] Fetching direct flights with parameters:");
      console.log("  fromAirports:", fromAirports);
      console.log("  toAirports:", toAirports);
      console.log("  periodStart:", periodStart);
      console.log("  periodEnd:", periodEnd);
      const directFlights = await this.flightsService.getStoredFlights(fromAirports, toAirports, periodStart, periodEnd).toPromise();
      console.log("🔍 [fetchStoredFlights] Received directFlights response:", JSON.stringify(directFlights));

      if (directFlights && directFlights.length > 0) {
        console.log("✅ [fetchStoredFlights] Found direct flights:", directFlights);
        flightResults.push(...directFlights);
      } else {
        console.warn("⚠️ [fetchStoredFlights] No direct flights found with initial parameters");
      }

      // If there are no direct flights, find the shortest routes between the two airports
      for (const fromAirport of fromAirports) {
        for (const toAirport of toAirports) {
          console.log(`🔍 [fetchStoredFlights] Searching routes for ${fromAirport} -> ${toAirport}`);
          let routes = await this.findShortestRoutes(fromAirport, toAirport);
          console.log(`🔍 [fetchStoredFlights] Routes found for ${fromAirport} -> ${toAirport}:`, JSON.stringify(routes));

          if (routes.length === 0) {
            console.warn(`⚠️ [fetchStoredFlights] No valid route found between ${fromAirport} and ${toAirport}`);
            continue;
          }

          console.log(`🛫 [fetchStoredFlights] Processing ${routes.length} route(s) for ${fromAirport} -> ${toAirport}`);
          for (const route of routes) {
            console.log(`🛫 [fetchStoredFlights] Processing route: ${route.join(" -> ")}`);
            if (route.length > 2) {
              let combinedRouteFlights: any[] = [];
              for (let i = 0; i < route.length - 1; i++) {
                console.log(`🔍 [fetchStoredFlights] Fetching flights for segment: ${route[i]} -> ${route[i + 1]}`);
                let segmentFlights = await this.flightsService.getStoredFlights(
                  [route[i]], [route[i + 1]], periodStart, periodEnd
                ).toPromise();
                console.log(`🔍 [fetchStoredFlights] Received segment flights for ${route[i]} -> ${route[i + 1]}:`, JSON.stringify(segmentFlights));
                if (segmentFlights && segmentFlights.length > 0) {
                  combinedRouteFlights.push(segmentFlights);
                } else {
                  console.warn(`⚠️ [fetchStoredFlights] No flights found for segment ${route[i]} -> ${route[i + 1]}`);
                  combinedRouteFlights = [];
                  break;
                }
              }
              if (combinedRouteFlights.length === route.length - 1) {
                console.log(`✅ [fetchStoredFlights] Combined flights found for route ${route.join(" -> ")}`);
                flightResults.push({
                  route: route,
                  segments: combinedRouteFlights
                });
              } else {
                console.warn(`⚠️ [fetchStoredFlights] Incomplete segment flights for route ${route.join(" -> ")}`);
              }
            }
          }
        }
      }

      console.log("✅ [fetchStoredFlights] Final stored flight results:", JSON.stringify(flightResults));
      return flightResults;
    } catch (error) {
      console.error("❌ [fetchStoredFlights] Error fetching stored flights from DB:", error);
      return [];
    }
  }



  async findShortestRoutes(fromAirport: string, toAirport: string): Promise<string[][]> {
    console.log(`🔍 Finding all shortest routes from ${fromAirport} to ${toAirport}`);

    if (fromAirport === toAirport) {
      return [[fromAirport]];
    }

    let queue: { path: string[], lastAirport: string }[] = [{ path: [fromAirport], lastAirport: fromAirport }];
    let visited: Set<string> = new Set();
    visited.add(fromAirport);
    let foundRoutes: string[][] = [];
    let shortestLength: number | null = null;

    while (queue.length > 0) {
      let { path, lastAirport } = queue.shift()!;

      console.log(`➡️ Checking routes from ${lastAirport}`);

      try {
        let connectedAirports = await this.flightsService.getConnectedAirports(lastAirport).toPromise();

        if (!connectedAirports || connectedAirports.length === 0) {
          console.warn(`⚠️ No connections found for ${lastAirport}`);
          continue;
        }

        for (let airport of connectedAirports) {
          if (path.includes(airport)) continue; // Disabling circular routes

          let newPath = [...path, airport];

          if (airport === toAirport) {
            console.log(`✅ Found route: ${newPath.join(" -> ")}`);

            if (shortestLength === null) {
              shortestLength = newPath.length; // Determining the length of the shortest routes
            }

            if (newPath.length > shortestLength) {
              return foundRoutes; // All shortest routes have been found
            }

            foundRoutes.push(newPath); // Store the shortest route
          } else {
            queue.push({ path: newPath, lastAirport: airport });
          }
        }
      } catch (error) {
        console.error(`❌ Error fetching connections for ${lastAirport}:`, error);
      }
    }

    if (foundRoutes.length === 0) {
      console.warn(`⚠️ No route found from ${fromAirport} to ${toAirport}`);
    }

    return foundRoutes;
  }



  async fetchFlightsBetweenAirports(fromAirport: string, toAirport: string, periodStart: string, periodEnd: string, duration: number, returnFlight: boolean, flightResults: any[]) {
    const outboundDateTo = new Date(periodEnd);
    outboundDateTo.setDate(outboundDateTo.getDate() - duration);
    const outboundDateToStr = outboundDateTo.toISOString().split('T')[0];

    const returnDateFrom = new Date(periodStart);
    returnDateFrom.setDate(returnDateFrom.getDate() + duration);
    const returnDateFromStr = returnDateFrom.toISOString().split('T')[0];

    console.log(`🔹 Calling API for flights: ${fromAirport} -> ${toAirport}`);

    const outboundApiUrl = `https://www.ryanair.com/api/farfnd/3/oneWayFares/${fromAirport}/${toAirport}/cheapestPerDay?outboundDateFrom=${periodStart}&outboundDateTo=${outboundDateToStr}`;
    console.log(`🔹 Outbound flights API call: ${outboundApiUrl}`);

    try {
      const outboundFlights = await this.http.get(outboundApiUrl).toPromise();
      console.log("📊 Outbound flights response:", outboundFlights);

      let returnFlights = null;
      if (returnFlight) {
        const returnApiUrl = `https://www.ryanair.com/api/farfnd/3/oneWayFares/${toAirport}/${fromAirport}/cheapestPerDay?outboundDateFrom=${returnDateFromStr}&outboundDateTo=${periodEnd}`;
        console.log(`🔹 Return flights API call: ${returnApiUrl}`);
        returnFlights = await this.http.get(returnApiUrl).toPromise();
        console.log("📊 Return flights response:", returnFlights);
      }

      const flightData = {
        total_price: this.calculateTotalPrice(outboundFlights, returnFlights),
        total_duration: this.calculateTotalDuration(outboundFlights, returnFlights),
        outbound: this.formatFlightData(outboundFlights, fromAirport, toAirport),
        return: returnFlight ? this.formatFlightData(returnFlights, toAirport, fromAirport) : []
      };

      console.log("📦 Processed flight data:", flightData);

      if (flightData.outbound.length > 0 || flightData.return.length > 0) {
        flightResults.push(flightData);
        await this.storeFlightsInDatabase(flightData, fromAirport, toAirport);
      } else {
        console.warn("⚠️ No valid flight data found. Skipping database insert.");
      }

    } catch (error) {
      console.error(`❌ Error fetching flights from ${fromAirport} to ${toAirport}:`, error);
    }
  }

  async fetchFlightsWithoutDestination(
    fromAirport: string,
    periodStart: string,
    periodEnd: string,
    flightResults: any[]
  ): Promise<string[]> {
    console.log(`🔹 [fetchFlightsWithoutDestination] Fetching flights from ${fromAirport} without a specified destination`);

    const apiUrl = `https://services-api.ryanair.com/farfnd/3/oneWayFares?&departureAirportIataCode=${fromAirport}&language=en&limit=10000&market=en-gb&offset=0&outboundDepartureDateFrom=${periodStart}&outboundDepartureDateTo=${periodEnd}&priceValueTo=2000`;

    try {
      const response: any = await this.http.get(apiUrl).toPromise();
      console.log("📊 [fetchFlightsWithoutDestination] API response:", response);

      if (!response || !response.fares || !Array.isArray(response.fares)) {
        console.warn("⚠️ [fetchFlightsWithoutDestination] No valid fares data in API response:", response);
        return [];
      }

      const formattedFlights = response.fares.map((fare: any) => {
        if (!fare.outbound || !fare.outbound.arrivalAirport || !fare.outbound.departureDate || !fare.outbound.arrivalDate || !fare.outbound.price) {
          console.warn("⚠️ [fetchFlightsWithoutDestination] Skipping flight due to missing required fields:", fare);
          return null;
        }

        return {
          from: fromAirport,
          to: fare.outbound.arrivalAirport.iataCode,
          departure_time: fare.outbound.departureDate,
          arrival_time: fare.outbound.arrivalDate,
          flight_number: fare.outbound.flightNumber || null,
          price: fare.outbound.price?.value || null,
          sold_out: fare.outbound.soldOut ? 1 : 0,
          unavailable: fare.outbound.unavailable ? 1 : 0,
        };
      }).filter((flight: any) => flight !== null);

      if (formattedFlights.length === 0) {
        console.warn("⚠️ [fetchFlightsWithoutDestination] No valid flights after filtering.");
        return [];
      }

      const flightData = {
        total_price: this.calculateTotalPrice(response, null),
        total_duration: this.calculateTotalDuration(response, null),
        outbound: formattedFlights,
        return: []
      };

      flightResults.push(flightData);
      console.log("✅ [fetchFlightsWithoutDestination] Processed flight data:", flightData);

      // Pohrana svakog leta u bazu
      for (const flight of formattedFlights) {
        console.log("🔹 [fetchFlightsWithoutDestination] Attempting to store flight in database:", flight);
        try {
          await this.storeFlightsInDatabase(flightData, fromAirport, flight.to);
          console.log(`✅ [fetchFlightsWithoutDestination] Successfully stored flight from ${flight.from} to ${flight.to}`);
        } catch (error) {
          console.error(`❌ [fetchFlightsWithoutDestination] Error storing flight from ${flight.from} to ${flight.to}:`, error);
        }
      }

      const destinationCodes = formattedFlights.map((f: { to: any; }) => f.to);
      const uniqueDestinations: string[] = Array.from(new Set(destinationCodes));
      console.log("✅ [fetchFlightsWithoutDestination] Unique destination codes found:", uniqueDestinations);

      return uniqueDestinations;
    } catch (error) {
      console.error(`❌ [fetchFlightsWithoutDestination] Error fetching one-way flights from ${fromAirport}:`, error);
      return [];
    }
  }




  async getAirportsForLocation(location: string): Promise<string[]> {
    return new Promise((resolve) => {
      this.flightsService.getAirportsForLocation(location).subscribe({
        next: (response) => {
          if (!response || response.length === 0) {
            console.warn(`No airports found for ${location}`);
            resolve([]);
          } else {
            resolve(response.map((airport: any) => airport.code));
          }
        },
        error: (err) => {
          console.error(`Error fetching airports for ${location}:`, err);
          resolve([]);
        }
      });
    });
  }

  async storeFlightsInDatabase(flightData: any, fromAirport: string, toAirport: string) {
    console.log("🛬 Storing flights in database...");

    const insertDateTime = new Date().toISOString().slice(0, 19).replace("T", " ");

    if (!flightData || typeof flightData !== "object") {
      console.error("❌ Invalid flight data structure:", flightData);
      return;
    }

    const processFlights = async (flights: any[], fromAirport: string, toAirport: string, isReturn: boolean) => {
      console.log(`📩 Processing ${isReturn ? "return" : "outbound"} flights...`);
      console.log("📌 Flights received:", flights);

      if (!flights || flights.length === 0) {
        console.warn(`⚠️ No flights to process for ${isReturn ? "return" : "outbound"}.`);
        return;
      }

      const insertDateTime = new Date().toISOString().slice(0, 19).replace("T", " ");

      for (const flight of flights) {
        if (!flight.arrival_time || !flight.departure_time || !flight.price) {
          console.warn("⚠️ Skipping flight due to missing required fields:", flight);
          continue;
        }

        const departure = new Date(flight.departure_time);
        const arrival = new Date(flight.arrival_time);
        const durationMilliseconds = arrival.getTime() - departure.getTime();
        const durationHours = Math.floor(durationMilliseconds / 3600000);
        const durationMinutes = Math.floor((durationMilliseconds % 3600000) / 60000);
        const duration = `${String(durationHours).padStart(2, "0")}:${String(durationMinutes).padStart(2, "0")}:00`;

        const flightRecord = {
          flight_number: flight.flight_number || null,
          from: fromAirport,  // ✅ Kôd polaznog aerodroma
          to: toAirport,      // ✅ Kôd odredišnog aerodroma
          departure_time: flight.departure_time,
          arrival_time: flight.arrival_time,
          duration: duration,
          aircompany: "Ryanair",
          price: flight.price || null,
          sold_out: flight.sold_out ? 1 : 0,
          unavailable: flight.unavailable ? 1 : 0,
          airplane_id: null, // Nema u odgovoru, postavljamo na NULL
          inserted_on: insertDateTime,
        };

        console.log("✅ Inserting specific flight:", flightRecord);

        try {
          await this.flightsService.addFlight(flightRecord).toPromise();
          console.log(`✅ Flight ${isReturn ? "return" : "outbound"} from ${flight.departure_time} added to database.`);
        } catch (err) {
          console.error(`❌ Error saving ${isReturn ? "return" : "outbound"} flight to database:`, err);
        }
      }
    };

    if (flightData.outbound) {
      console.log("✈️ Processing outbound flights...");
      await processFlights(flightData.outbound, fromAirport, toAirport, false);
    }

    if (flightData.return) {
      console.log("🔄 Processing return flights...");
      await processFlights(flightData.return, toAirport, fromAirport, true);
    }
  }


  private formatFlightData(apiResponse: any, fromAirport: string, toAirport: string): any[] {
    console.log("🔍 formatFlightData() called");

    if (!apiResponse || typeof apiResponse !== "object") {
      console.warn("⚠️ Invalid API response:", apiResponse);
      return [];
    }

    const fares = apiResponse.outbound?.fares || apiResponse.fares;

    if (!Array.isArray(fares) || fares.length === 0) {
      console.warn("⚠️ API response does not contain valid 'fares' field:", apiResponse);
      return [];
    }

    let flights: any[] = [];

    fares.forEach((fare: any, index: number) => {
      console.log(`✈️ Processing flight index ${index}:`, fare);

      if (!fare.arrivalDate || !fare.departureDate || !fare.price?.value) {
        console.warn(`⚠️ Flight index ${index} missing required data. Skipping.`);
        return;
      }

      const processedFlight = {
        from: fromAirport,
        to: toAirport,
        departure_time: fare.departureDate,
        arrival_time: fare.arrivalDate,
        flight_number: fare.flightNumber || null,
        price: fare.price?.value || 0,
        sold_out: fare.soldOut ? 1 : 0,
        unavailable: fare.unavailable ? 1 : 0
      };

      console.log("✅ Processed flight data:", processedFlight);
      flights.push(processedFlight);
    });

    // Sort by price - ascending
    flights.sort((a, b) => a.price - b.price);

    console.log("🚀 Final sorted flights:", flights);
    return flights;
  }



  private calculateTotalPrice(outboundFlights: any, returnFlights: any): number {
    let total = 0;
    total += outboundFlights?.dates?.reduce((acc: number, date: any) => {
      return acc + (date.flights[0]?.regularFare?.fares[0]?.amount || 0);
    }, 0) || 0;

    if (returnFlights) {
      total += returnFlights?.dates?.reduce((acc: number, date: any) => {
        return acc + (date.flights[0]?.regularFare?.fares[0]?.amount || 0);
      }, 0) || 0;
    }

    return total;
  }

  private calculateTotalDuration(outboundFlights: any, returnFlights: any): number {
    let totalDuration = 0;
    outboundFlights?.dates?.forEach((date: any) => {
      date.flights.forEach((flight: any) => {
        totalDuration += this.parseDuration(flight.duration);
      });
    });

    if (returnFlights) {
      returnFlights?.dates?.forEach((date: any) => {
        date.flights.forEach((flight: any) => {
          totalDuration += this.parseDuration(flight.duration);
        });
      });
    }

    return totalDuration;
  }

  private parseDuration(duration: string): number {
    if (!duration) return 0;
    const match = duration.match(/(\d+)H(\d+)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;

    return hours + minutes / 60;
  }
}
