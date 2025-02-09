import {ChangeDetectorRef, Component} from '@angular/core';
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
import { MatDialog } from '@angular/material/dialog';
import {TravelDetailComponent, TravelDetailData} from '../travel-detail/travel-detail.component';
import {SpinnerComponent} from '../../shared/spinner/spinner.component';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    SpinnerComponent
  ],
  styleUrls: ['./search.component.css']
})
export class SearchComponent {
  searchForm: FormGroup;
  today: string;

  isLoading: boolean = false;

  searchResults: any[] = [];
  outboundTravels : any[] = [];
  returnTravels : any[] = [];
  outboundCheapest: any[] = [];
  outboundShortest: any[] = [];
  returnCheapest: any[] = [];
  returnShortest: any[] = [];

  locations: any[] = [];
  groupedLocations: { [country: string]: any[] } = {}; // Locations grouped by countries


  constructor(private fb: FormBuilder,
              private http: HttpClient,
              private flightsService: FlightsService,
              private dialog: MatDialog,
              private cdr: ChangeDetectorRef,
  ) {
    const now = new Date();
    this.today = now.toISOString().split('T')[0];

    this.searchForm = this.fb.group({
      from: ['', Validators.required],
      to: [''],
      period_start: ['', [Validators.required]],
      period_end: ['', [Validators.required]],
      duration: ['', [Validators.required, Validators.min(1)]],
      number_of_persons: ['', [Validators.required, Validators.min(1)]],
      return_flight: [false]
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

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const formValues = this.searchForm.value;
      console.log("✅ Valid form data:", formValues);

      const fromLocation = formValues.from;
      const toLocation = formValues.to;
      const periodStart = formValues.period_start;
      const periodEnd = formValues.period_end;
      const duration = formValues.duration;
      const returnFlight = formValues.return_flight;

      if (returnFlight && (!toLocation || toLocation.trim() === '')) {
        alert("Return flight is selected – please enter a destination.");
        return;
      }

      const travelInfo = {
        startCountry: '',
        destinationCountry: '',
        startCity: '',
        destinationCity: '',
        numberOfPersons: formValues.number_of_persons,
        periodStart: periodStart,
        periodEnd: periodEnd
      };

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

            // Finding the shortes routes
            let routes = await this.findShortestRoutes(fromAirport, toAirport);
            if (routes.length === 0) {
              console.warn(`⚠️ No valid route found between ${fromAirport} and ${toAirport}. Skipping.`);
              continue;
            }
            console.log(`🛫 Found ${routes.length} shortest route(s) between ${fromAirport} and ${toAirport}`);
            for (const route of routes) {
              console.log(`🛫 Processing route: ${route.join(" -> ")}`);
              if (route.length === 2) {
                // Direct flight
                await this.fetchFlightsBetweenAirports(fromAirport, toAirport, periodStart, periodEnd, duration, returnFlight, flightResults, travelInfo, true);
              } else {
                // Multi-leg route
                await this.processMultiLegRoute(route, periodStart, periodEnd, duration, returnFlight, travelInfo, flightResults);
              }
            }
          }
        } else {
          console.log(`🔹 Checking for direct flights for all possible destinations: ${fromAirport}`);
          await this.fetchFlightsWithoutDestination(fromAirport, periodStart, periodEnd, flightResults, travelInfo);
        }
      }

      console.log("🚀 Fetching stored travels...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.searchResults = await this.getStoredTravels(fromLocation, toLocation, periodStart, periodEnd, returnFlight);

      if (returnFlight && toLocation) {
        this.outboundTravels = this.searchResults.filter(travel => travel.start_city === fromLocation);
        this.returnTravels = this.searchResults.filter(travel => travel.start_city === toLocation);
        if (this.outboundTravels.length === 0) {
          this.outboundTravels = this.searchResults.filter(travel => travel.start_country === fromLocation);
        }
        if (this.returnTravels.length === 0) {
          this.returnTravels = this.searchResults.filter(travel => travel.start_country === toLocation);
        }
      } else {
        this.outboundTravels = this.searchResults;
        this.returnTravels = [];
      }

      // outbound travels - sorted by price and duration
      this.outboundCheapest = [...this.outboundTravels]
        .sort((a, b) => a.total_price - b.total_price)
//      .slice(0, 5);
      this.outboundShortest = [...this.outboundTravels]
        .sort((a, b) => a.total_duration.localeCompare(b.total_duration))
//      .slice(0, 5);

      // return travels (if exist) - sorted by price and duration
      this.returnCheapest = [...this.returnTravels]
        .sort((a, b) => a.total_price - b.total_price)
//      .slice(0, 5);
      this.returnShortest = [...this.returnTravels]
        .sort((a, b) => a.total_duration.localeCompare(b.total_duration))
//      .slice(0, 5);

      console.log('✅ Final Outbound Travels:', this.outboundTravels);
      console.log('✅ Final Return Travels:', this.returnTravels);

    } catch (error) {
      console.error("❌ Error during search:", error);
    } finally {
      this.isLoading = false;  // ⬅️ Zaustavlja spinner nakon pretrage
      this.cdr.detectChanges();
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



  async fetchFlightsBetweenAirports(fromAirport: string, toAirport: string, periodStart: string, periodEnd: string, duration: number, returnFlight: boolean, flightResults: any[],
                                    travelInfo: { startCountry: string, destinationCountry: string, startCity: string, destinationCity: string, numberOfPersons: number, periodStart: string, periodEnd: string }, isDirect?: boolean) {
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
        if (isDirect) {
          // For each direct flight - create a separate Travel entry
          for (const flight of flightData.outbound) {
            const singleFlightData = {
              total_price: flightData.total_price,
              total_duration: this.calculateTotalDuration({ dates: [{ flights: [flight] }] }, null),
              outbound: [flight],
              return: []
            };
            console.log("ℹ️ [fetchFlightsBetweenAirports] Direct flight - processing single flight:", JSON.stringify(flight, null, 2));
            await this.storeFlightsAndTravel(singleFlightData, fromAirport, toAirport, travelInfo);
          }
          if (returnFlight) {
            // Fore each direct return flight - create a separate Travel entry
            const returnTravelInfo = {
              ...travelInfo,
              startCity: travelInfo.destinationCity,
              startCountry: travelInfo.destinationCountry,
              destinationCity: travelInfo.startCity,
              destinationCountry: travelInfo.startCountry
            };
            for (const flight of flightData.return) {
              const singleReturnFlightData = {
                total_price: flightData.total_price,
                total_duration: this.calculateTotalDuration({ dates: [{ flights: [flight] }] }, null),
                outbound: [flight],
                return: []
              };
              console.log("ℹ️ [fetchFlightsBetweenAirports] Processing direct return flight:", JSON.stringify(flight, null, 2));
              await this.storeFlightsAndTravel(singleReturnFlightData, toAirport, fromAirport, returnTravelInfo);
            }
          }
        } else {
          // For multi leg routes, group all flights in a single Travel
          await this.storeFlightsAndTravel(flightData, fromAirport, toAirport, travelInfo);
        }
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
    flightResults: any[],
    travelInfo: { startCountry: string, destinationCountry: string, startCity: string, destinationCity: string, numberOfPersons: number, periodStart: string, periodEnd: string }
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

      // Fetch unique destination airport codes
      const destinationCodes = formattedFlights.map((f: { to: any; }) => f.to);
      const uniqueDestinations: string[] = Array.from(new Set(destinationCodes));
      console.log("✅ [fetchFlightsWithoutDestination] Unique destination codes found:", uniqueDestinations);

      // Fetch additional data for each airport
      for (const airportCode of uniqueDestinations) {
        this.flightsService.getLocationByAirport(airportCode).subscribe({
          next: async (data: { name: string; country: string }) => {
            console.log(`✅ [fetchFlightsWithoutDestination] Retrieved destination details for airport ${airportCode}:`, data);
            const travelInfoForFlight = {
              startCountry: travelInfo.startCountry,
              startCity: travelInfo.startCity,
              destinationCountry: data.country,
              destinationCity: data.name,
              numberOfPersons: travelInfo.numberOfPersons,
              periodStart: travelInfo.periodStart,
              periodEnd: travelInfo.periodEnd
            };
            await this.completeTravelInfoData(fromAirport, airportCode, travelInfoForFlight);
            const filteredFlights = formattedFlights.filter((flight: { to: string; }) => flight.to === airportCode);
            for (const flight of filteredFlights) {
              const singleFlightData = {
                total_price: this.calculateTotalPrice(response, null),
                total_duration: this.calculateTotalDuration(response, null),
                outbound: [flight],
                return: []
              };
              console.log("ℹ️ [fetchFlightsWithoutDestination] Processing direct flight (no destination) individually:", JSON.stringify(flight, null, 2));
              try {
                await this.storeFlightsAndTravel(singleFlightData, fromAirport, flight.to, travelInfoForFlight);
                console.log(`✅ [fetchFlightsWithoutDestination] Successfully stored flight from ${flight.from} to ${flight.to}`);
              } catch (error) {
                console.error(`❌ [fetchFlightsWithoutDestination] Error storing flight from ${flight.from} to ${flight.to}:`, error);
              }
            }
          },
          error: (err: any) => {
            console.error(`❌ [fetchFlightsWithoutDestination] Error fetching destination details for airport ${airportCode}:`, err);
          }
        });
      }

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

  async storeFlightsAndTravel(
    flightData: any,
    fromAirport: string,
    toAirport: string,
    travelInfo: {
      startCountry: string,
      destinationCountry: string,
      startCity: string,
      destinationCity: string,
      numberOfPersons: number,
      periodStart: string,
      periodEnd: string
    }
  ): Promise<void> {
    console.log("🔄 [storeFlightsAndTravel] Storing flights and creating travel record");
    console.log("🔍 [storeFlightsAndTravel] Received flightData:", JSON.stringify(flightData, null, 2));
    console.log("🔍 [storeFlightsAndTravel] Received travelInfo:", JSON.stringify(travelInfo, null, 2));

    const insertedFlightIds: number[] = [];

    // Processing outbound flights
    if (flightData.outbound && flightData.outbound.length > 0) {
      console.log("✈️ [storeFlightsAndTravel] Processing outbound flights:", flightData.outbound.length);
      for (const flight of flightData.outbound) {
        console.log("🔍 [storeFlightsAndTravel] Outbound flight object:", JSON.stringify(flight, null, 2));

        let computedDuration = flight.duration;
        if (!computedDuration) {
          const departure = new Date(flight.departure_time);
          const arrival = new Date(flight.arrival_time);
          const durationMilliseconds = arrival.getTime() - departure.getTime();
          const durationHours = Math.floor(durationMilliseconds / 3600000);
          const durationMinutes = Math.floor((durationMilliseconds % 3600000) / 60000);
          computedDuration = `${String(durationHours).padStart(2, "0")}:${String(durationMinutes).padStart(2, "0")}:00`;
          console.log("🔍 [storeFlightsAndTravel] Computed duration:", computedDuration);
        }

        const flightRecord = {
          flight_number: flight.flight_number,
          from: flight.from,
          to: flight.to,
          departure_time: flight.departure_time,
          arrival_time: flight.arrival_time,
          duration: computedDuration,
          aircompany: flight.aircompany || "Ryanair",
          price: flight.price,
          sold_out: flight.sold_out,
          unavailable: flight.unavailable,
          airplane_id: null,
          inserted_on: new Date().toISOString().slice(0, 19).replace("T", " ")
        };

        console.log("🔹 [storeFlightsAndTravel] Inserting outbound flight record:", JSON.stringify(flightRecord, null, 2));

        try {
          const result = await this.flightsService.addFlight(flightRecord).toPromise();
          console.log("✅ [storeFlightsAndTravel] Outbound flight inserted. Result:", JSON.stringify(result, null, 2));
          if (result.flightId === undefined) {
            console.error("❌ [storeFlightsAndTravel] ERROR: flightId missing in result. Full result:", JSON.stringify(result, null, 2));
          }
          insertedFlightIds.push(result.flightId);
        } catch (err) {
          console.error("❌ [storeFlightsAndTravel] Error inserting outbound flight:", err, "Flight record:", JSON.stringify(flightRecord, null, 2));
        }
      }
    } else {
      console.warn("⚠️ [storeFlightsAndTravel] No outbound flights available in flightData.outbound");
    }

    // Processing return flights (if exist)
    if (flightData.return && flightData.return.length > 0) {
      console.log("🔄 [storeFlightsAndTravel] Processing return flights:", flightData.return.length);
      for (const flight of flightData.return) {
        console.log("🔍 [storeFlightsAndTravel] Return flight object:", JSON.stringify(flight, null, 2));

        let computedDuration = flight.duration;
        if (!computedDuration) {
          const departure = new Date(flight.departure_time);
          const arrival = new Date(flight.arrival_time);
          const durationMilliseconds = arrival.getTime() - departure.getTime();
          const durationHours = Math.floor(durationMilliseconds / 3600000);
          const durationMinutes = Math.floor((durationMilliseconds % 3600000) / 60000);
          computedDuration = `${String(durationHours).padStart(2, "0")}:${String(durationMinutes).padStart(2, "0")}:00`;
          console.log("🔍 [storeFlightsAndTravel] Computed duration for return flight:", computedDuration);
        }

        const flightRecord = {
          flight_number: flight.flight_number,
          from: flight.from,
          to: flight.to,
          departure_time: flight.departure_time,
          arrival_time: flight.arrival_time,
          duration: computedDuration,
          aircompany: flight.aircompany || "Ryanair",
          price: flight.price,
          sold_out: flight.sold_out,
          unavailable: flight.unavailable,
          airplane_id: null,
          inserted_on: new Date().toISOString().slice(0, 19).replace("T", " ")
        };

        console.log("🔹 [storeFlightsAndTravel] Inserting return flight record:", JSON.stringify(flightRecord, null, 2));

        try {
          const result = await this.flightsService.addFlight(flightRecord).toPromise();
          console.log("✅ [storeFlightsAndTravel] Return flight inserted. Result:", JSON.stringify(result, null, 2));
          if (result.flightId === undefined) {
            console.error("❌ [storeFlightsAndTravel] ERROR: flightId missing in result. Full result:", JSON.stringify(result, null, 2));
          }
          insertedFlightIds.push(result.flightId);
        } catch (err) {
          console.error("❌ [storeFlightsAndTravel] Error inserting return flight:", err, "Flight record:", JSON.stringify(flightRecord, null, 2));
        }
      }
    } else {
      console.warn("⚠️ [storeFlightsAndTravel] No return flights available in flightData.return");
    }

    console.log("🔍 [storeFlightsAndTravel] Inserted flight IDs:", insertedFlightIds);

    // Checking waiting time limits for multi leg travels
    if (flightData.outbound && flightData.outbound.length > 1) {
      let validConnection = true;
      for (let i = 0; i < flightData.outbound.length - 1; i++) {
        const arrival = new Date(flightData.outbound[i].arrival_time);
        const nextDeparture = new Date(flightData.outbound[i + 1].departure_time);
        const diffMs = nextDeparture.getTime() - arrival.getTime();
        console.log(`🔍 [storeFlightsAndTravel] Connection time between flight ${i} and ${i + 1}: ${diffMs} ms`);
        if (diffMs < 1.25 * 3600000 || diffMs > 8 * 3600000) {
          console.warn(`⚠️ [storeFlightsAndTravel] Connection time between flight ${i} and ${i + 1} is invalid (${diffMs} ms).`);
          validConnection = false;
          break;
        }
      }
      if (!validConnection) {
        console.warn("⚠️ [storeFlightsAndTravel] Skipping travel creation due to invalid connection times.");
        return;
      }
    }

    let travelDuration: string;
    let computedStartDate: Date | null = null;
    let computedEndDate: Date | null = null;
    if (flightData.outbound && flightData.outbound.length > 0) {
      computedStartDate = new Date(flightData.outbound[0].departure_time);
      computedEndDate = new Date(flightData.outbound[flightData.outbound.length - 1].arrival_time);
      const durationMs = computedEndDate.getTime() - computedStartDate.getTime();
      const durationHours = Math.floor(durationMs / 3600000);
      const durationMinutes = Math.floor((durationMs % 3600000) / 60000);
      travelDuration = `${String(durationHours).padStart(2, "0")}:${String(durationMinutes).padStart(2, "0")}:00`;
    } else {
      travelDuration = "00:00:00";
    }

    const numberOfFlights = flightData.outbound ? flightData.outbound.length : 0;
    console.log("🔍 [storeFlightsAndTravel] Calculated travelDuration:", travelDuration, "Number of flights (route length):", numberOfFlights);

    try {
      await this.completeTravelInfoData(fromAirport, toAirport, travelInfo);
      console.log(`✅ [storeFlightsAndTravel] Updated travelInfo with destination details from airport ${toAirport}:`);
    } catch (error) {
      console.error(`❌ [storeFlightsAndTravel] Error fetching destination details for airport ${toAirport}:`, error);
    }

    const travelRecord = {
      total_duration: travelDuration,
      number_of_flights: numberOfFlights,
      start_country: travelInfo.startCountry,
      destination_country: travelInfo.destinationCountry,
      start_airport: fromAirport,
      destination_airport: toAirport,
      start_city: travelInfo.startCity,
      destination_city: travelInfo.destinationCity,
      number_of_persons: travelInfo.numberOfPersons,
      period_start: computedStartDate ? computedStartDate.toISOString().split('T')[0] : travelInfo.periodStart,
      period_end: computedEndDate ? computedEndDate.toISOString().split('T')[0] : travelInfo.periodEnd
    };


    console.log("🔹 [storeFlightsAndTravel] Inserting travel record:", JSON.stringify(travelRecord, null, 2));
    try {
      const travelResult = await this.flightsService.addTravel(travelRecord).toPromise();
      console.log("✅ [storeFlightsAndTravel] Travel insert result:", JSON.stringify(travelResult, null, 2));
      const travelId = travelResult.travelId;
      if (!travelId) {
        console.error("❌ [storeFlightsAndTravel] ERROR: Travel record insertion did not return travelId. Full result:", JSON.stringify(travelResult, null, 2));
      } else {
        console.log("✅ [storeFlightsAndTravel] Travel inserted with ID:", travelId);
      }

      for (const flightId of insertedFlightIds) {
        const joinRecord = { travel_id: travelId, flight_id: flightId };
        console.log("🔹 [storeFlightsAndTravel] Inserting travel-flight join record:", JSON.stringify(joinRecord, null, 2));
        try {
          const joinResult = await this.flightsService.addTravelFlight(joinRecord).toPromise();
          console.log("✅ [storeFlightsAndTravel] Travel-flight record inserted for flight ID:", flightId, "Result:", JSON.stringify(joinResult, null, 2));
        } catch (err) {
          console.error("❌ [storeFlightsAndTravel] Error inserting travel-flight record for flight ID:", flightId, err);
        }
      }
    } catch (err) {
      console.error("❌ [storeFlightsAndTravel] Error inserting travel record:", err);
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


  async completeTravelInfoData(fromAirport: string, toAirport: string, travelInfo: any): Promise<void> {
    try {
      console.log("🔄 [completeTravelInfoData] Fetching location details...");

      const origin = await this.flightsService.getLocationByAirport(fromAirport).toPromise();
      const destination = await this.flightsService.getLocationByAirport(toAirport).toPromise();

      if (origin) {
        const originDetails = await this.flightsService.getLocationDetails(origin.name).toPromise();
        // @ts-ignore
        travelInfo.startCity = originDetails.name;
        // @ts-ignore
        travelInfo.startCountry = originDetails.country;
        console.log("✅ [completeTravelInfoData] Retrieved start location details:", originDetails);
      }

      if (destination) {
        const destinationDetails = await this.flightsService.getLocationDetails(destination.name).toPromise();
        // @ts-ignore
        travelInfo.destinationCity = destinationDetails.name;
        // @ts-ignore
        travelInfo.destinationCountry = destinationDetails.country;
        console.log("✅ [completeTravelInfoData] Retrieved destination location details:", destinationDetails);
      }
    } catch (error) {
      console.error("❌ [completeTravelInfoData] Error fetching location details:", error);
    }
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

  private isValidItinerary(itinerary: any[]): boolean {
    for (let i = 0; i < itinerary.length - 1; i++) {
      const arrival = new Date(itinerary[i].arrival_time);
      const nextDeparture = new Date(itinerary[i + 1].departure_time);
      const diffMs = nextDeparture.getTime() - arrival.getTime();
      if (diffMs < 1.25 * 3600000 || diffMs > 8 * 3600000) {
        return false;
      }
    }
    return true;
  }

  private generateItineraries(segments: any[][]): any[][] {
    if (segments.length === 0) return [];

    let itineraries = segments[0].map(flight => [flight]);

    for (let i = 1; i < segments.length; i++) {
      let newItineraries = [];
      for (const itinerary of itineraries) {
        for (const flight of segments[i]) {
          newItineraries.push([...itinerary, flight]);
        }
      }
      itineraries = newItineraries;
    }
    return itineraries;
  }

  async fetchSegmentFlights(fromAirport: string, toAirport: string, periodStart: string, periodEnd: string, duration: number): Promise<any[]> {
    const outboundDateTo = new Date(periodEnd);
    outboundDateTo.setDate(outboundDateTo.getDate() - duration);
    const outboundDateToStr = outboundDateTo.toISOString().split('T')[0];
    const outboundApiUrl = `https://www.ryanair.com/api/farfnd/3/oneWayFares/${fromAirport}/${toAirport}/cheapestPerDay?outboundDateFrom=${periodStart}&outboundDateTo=${outboundDateToStr}`;
    console.log(`🔹 [fetchSegmentFlights] API call for segment ${fromAirport} -> ${toAirport}: ${outboundApiUrl}`);
    try {
      const outboundFlights = await this.http.get(outboundApiUrl).toPromise();
      const flights = this.formatFlightData(outboundFlights, fromAirport, toAirport);
      return flights;
    } catch (error) {
      console.error(`❌ [fetchSegmentFlights] Error fetching segment flights from ${fromAirport} to ${toAirport}:`, error);
      return [];
    }
  }

  async processMultiLegRoute(
    route: string[],
    periodStart: string,
    periodEnd: string,
    duration: number,
    returnFlight: boolean,
    travelInfo: any,
    flightResults: any[]
  ) {
    console.log(`🔹 [processMultiLegRoute] Processing multi-leg route: ${route.join(" -> ")}`);
    let segmentsOptions: any[][] = [];
    // Fore each route segment fetch flight options
    for (let i = 0; i < route.length - 1; i++) {
      const fromSegment = route[i];
      const toSegment = route[i + 1];
      const options = await this.fetchSegmentFlights(fromSegment, toSegment, periodStart, periodEnd, duration);
      if (!options || options.length === 0) {
        console.warn(`⚠️ [processMultiLegRoute] No options for segment ${fromSegment} -> ${toSegment}. Skipping this route.`);
        return;
      }
      segmentsOptions.push(options);
    }
    // Generate all possible itineraries
    const itineraries = this.generateItineraries(segmentsOptions);
    console.log(`🔹 [processMultiLegRoute] Generating combination: ${itineraries.length}`);

    // Processing outbound itineraries
    for (const itinerary of itineraries) {
      if (this.isValidItinerary(itinerary)) {
        const computedStartDate = new Date(itinerary[0].departure_time);
        const computedEndDate = new Date(itinerary[itinerary.length - 1].arrival_time);
        const durationMs = computedEndDate.getTime() - computedStartDate.getTime();
        const durationHours = Math.floor(durationMs / 3600000);
        const durationMinutes = Math.floor((durationMs % 3600000) / 60000);
        const travelDuration = `${String(durationHours).padStart(2, "0")}:${String(durationMinutes).padStart(2, "0")}:00`;
        const totalPrice = itinerary.reduce((acc, flight) => acc + flight.price, 0);
        const flightData = {
          total_price: totalPrice,
          total_duration: travelDuration,
          outbound: itinerary,
          return: []
        };
        console.log(`🔹 [processMultiLegRoute] Valid outbound itinerary found: ${itinerary.map(f => f.flight_number).join(" | ")}`);
        await this.storeFlightsAndTravel(flightData, itinerary[0].from, itinerary[itinerary.length - 1].to, travelInfo);
        flightResults.push(flightData);
      } else {
      }
    }

    // Processing return itineraries
    if (returnFlight) {
      // reverse the route
      const reversedRoute = [...route].reverse();
      let returnSegmentsOptions: any[][] = [];
      for (let i = 0; i < reversedRoute.length - 1; i++) {
        const fromSegment = reversedRoute[i];
        const toSegment = reversedRoute[i + 1];
        const options = await this.fetchSegmentFlights(fromSegment, toSegment, periodStart, periodEnd, duration);
        if (!options || options.length === 0) {
          console.warn(`⚠️ [processMultiLegRoute] No options for return segment ${fromSegment} -> ${toSegment}. Skipping this route.`);
          return;
        }
        returnSegmentsOptions.push(options);
      }
      const returnItineraries = this.generateItineraries(returnSegmentsOptions);
      console.log(`🔹 [processMultiLegRoute] Generating return combination: ${returnItineraries.length}`);
      for (const itinerary of returnItineraries) {
        if (this.isValidItinerary(itinerary)) {
          const computedStartDate = new Date(itinerary[0].departure_time);
          const computedEndDate = new Date(itinerary[itinerary.length - 1].arrival_time);
          const durationMs = computedEndDate.getTime() - computedStartDate.getTime();
          const durationHours = Math.floor(durationMs / 3600000);
          const durationMinutes = Math.floor((durationMs % 3600000) / 60000);
          const travelDuration = `${String(durationHours).padStart(2, "0")}:${String(durationMinutes).padStart(2, "0")}:00`;
          const totalPrice = itinerary.reduce((acc, flight) => acc + flight.price, 0);
          const flightData = {
            total_price: totalPrice,
            total_duration: travelDuration,
            outbound: itinerary,
            return: []
          };
          console.log(`🔹 [processMultiLegRoute] Valid return itinerary found: ${itinerary.map(f => f.flight_number).join(" | ")}`);
          // switch destination and origin
          const returnTravelInfo = {
            ...travelInfo,
            startCity: travelInfo.destinationCity,
            startCountry: travelInfo.destinationCountry,
            destinationCity: travelInfo.startCity,
            destinationCountry: travelInfo.startCountry
          };
          await this.storeFlightsAndTravel(flightData, reversedRoute[0], reversedRoute[reversedRoute.length - 1], returnTravelInfo);
          flightResults.push(flightData);
        } else {
          console.warn("⚠️ [processMultiLegRoute] Return itinerary not meeting the expected waiting limits.");
        }
      }
    }
  }


  async getStoredTravels(from: string, to: string, periodStart: string, periodEnd: string, returnFlight: boolean): Promise<any[]> {
    try {
      console.log(`🔍 [getStoredTravels] Fetching airports for location: ${from}`);
      const fromAirports = await this.getAirportsForLocation(from);

      if (!fromAirports || fromAirports.length === 0) {
        console.warn(`⚠️ No airports found for location: ${from}`);
        return [];
      }

      console.log(`✅ [getStoredTravels] Found ${fromAirports.length} airports for location: ${from}`);

      let toAirports: string[] = [];
      if (to) {
        console.log(`🔍 [getStoredTravels] Fetching airports for location: ${to}`);
        toAirports = await this.getAirportsForLocation(to);

        if (!toAirports || toAirports.length === 0) {
          console.warn(`⚠️ No airports found for location: ${to}`);
        } else {
          console.log(`✅ [getStoredTravels] Found ${toAirports.length} airports for location: ${to}`);
        }
      }

      let combinedTravels: any[] = [];

      // Fetch Travels for each airport
      for (const fromAirport of fromAirports) {
        console.log(`🔍 [getStoredTravels] Fetching location for airport: ${fromAirport}`);
        const fromLocation = await this.flightsService.getLocationByAirport(fromAirport).toPromise();

        if (!fromLocation || !fromLocation.name) {
          console.warn(`⚠️ No valid location found for airport: ${fromAirport}, skipping.`);
          continue;
        }

        console.log(`✅ [getStoredTravels] Found location for airport ${fromAirport}: ${fromLocation.name}`);

        if (toAirports.length > 0) {
          // If the destination is entered, check for each airport at that destination
          for (const toAirport of toAirports) {
            console.log(`🔍 [getStoredTravels] Fetching location for destination airport: ${toAirport}`);
            const toLocation = await this.flightsService.getLocationByAirport(toAirport).toPromise();

            if (!toLocation || !toLocation.name) {
              console.warn(`⚠️ No valid location found for destination airport: ${toAirport}, skipping.`);
              continue;
            }

            console.log(`✅ [getStoredTravels] Found location for destination airport ${toAirport}: ${toLocation.name}`);

            const outboundTravels = await this.flightsService.getStoredTravels(fromLocation.name, toLocation.name, periodStart, periodEnd).toPromise();
            if (outboundTravels && outboundTravels.length > 0) {
              combinedTravels = combinedTravels.concat(outboundTravels);
            }
          }
        } else {
          // If there is no destination entered, just send the origin info
          const outboundTravels = await this.flightsService.getStoredTravels(fromLocation.name, "", periodStart, periodEnd).toPromise();
          if (outboundTravels && outboundTravels.length > 0) {
            combinedTravels = combinedTravels.concat(outboundTravels);
          }
        }
      }

      // Do the same as for the outbound Travels, but switch "to" and "from"
      if (returnFlight && toAirports.length > 0) {
        console.log(`🔍 [getStoredTravels] Fetching return flights`);

        for (const toAirport of toAirports) {
          console.log(`🔍 [getStoredTravels] Fetching location for return airport: ${toAirport}`);
          const toLocation = await this.flightsService.getLocationByAirport(toAirport).toPromise();

          if (!toLocation || !toLocation.name) {
            console.warn(`⚠️ No valid location found for return airport: ${toAirport}, skipping.`);
            continue;
          }

          console.log(`✅ [getStoredTravels] Found location for return airport ${toAirport}: ${toLocation.name}`);

          for (const fromAirport of fromAirports) {
            console.log(`🔍 [getStoredTravels] Fetching location for original departure airport (return leg): ${fromAirport}`);
            const fromLocation = await this.flightsService.getLocationByAirport(fromAirport).toPromise();

            if (!fromLocation || !fromLocation.name) {
              console.warn(`⚠️ No valid location found for original departure airport: ${fromAirport}, skipping.`);
              continue;
            }

            console.log(`✅ [getStoredTravels] Found location for original departure airport ${fromAirport}: ${fromLocation.name}`);

            const inboundTravels = await this.flightsService.getStoredTravels(toLocation.name, fromLocation.name, periodStart, periodEnd).toPromise();
            if (inboundTravels && inboundTravels.length > 0) {
              combinedTravels = combinedTravels.concat(inboundTravels);
            }
          }
        }
      }

      if (combinedTravels.length === 0) {
        console.warn("⚠️ No travels found for the given criteria.");
        return [];
      }

      console.log("✅ [getStoredTravels] Stored travels found:", combinedTravels);
      return combinedTravels;
    } catch (error) {
      console.error("❌ [getStoredTravels] Error fetching stored travels:", error);
      return [];
    }
  }


  formatMinutesToTime(minutes: number): string {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  }

  formatDuration(durationStr: string): string {
    return durationStr.substring(11, 19);
  }


  openTravelDetail(travel: any): void {
    if (!travel.flights) {
      this.flightsService.getTravelFlights(travel.id).subscribe({
        next: (flights: any[]) => {
          console.log(`Retrieved ${flights.length} flights for travel id ${travel.id}`);
          travel.flights = flights;
          this.dialog.open(TravelDetailComponent, {
            width: '600px',
            data: { travel: travel } as TravelDetailData
          }).afterClosed().subscribe(() => {
            console.log('Travel detail dialog closed');
          });
        },
        error: (err) => {
          console.error('Error fetching flights for travel:', err);
        }
      });
    } else {
      this.dialog.open(TravelDetailComponent, {
        width: '600px',
        data: { travel: travel } as TravelDetailData
      }).afterClosed().subscribe(() => {
        console.log('Travel detail dialog closed');
      });
    }
  }


}
