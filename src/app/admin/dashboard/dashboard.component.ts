import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [
    FormsModule,
    CommonModule
  ],
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  tables = ['Airplane', 'Airport', 'Baggage', 'Flight', 'Flight_category', 'Location', 'Travel', 'User'];
  selectedTable: string = this.tables[0];
  currentAction: string = 'examine';

  tableSchema: any[] = [];
  tableColumns: any[] = [];
  tableData: any[] = [];
  newRow: any = {};
  loading: boolean = false;

  constructor(private adminService: AdminService, private http: HttpClient) {
    this.loadTableSchema();
    this.loadTableData();
  }

  /** Postavlja trenutno odabranu tablicu i dohvaća njenu strukturu i podatke **/
  selectTable(table: string) {
    this.selectedTable = table;
    this.loadTableSchema();
    this.loadTableData();
    this.newRow = {};
  }

  /** Postavlja način rada (Examine ili Insert) **/
  setAction(action: string) {
    this.currentAction = action;
    this.newRow = {};

  }

  /** Dohvaća strukturu tablice iz baze **/
  loadTableSchema() {
    this.loading = true;
    this.adminService.getTableSchema(this.selectedTable).subscribe({
      next: (response) => {
        this.tableSchema = response.schema;
        this.tableColumns = response.schema.map((col: { column_name: any; data_type: any; is_nullable: string; }) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES'
        }));
        console.log(this.tableColumns);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching table schema:', err);
        this.loading = false;
      }
    });
  }

  /** Dohvaća podatke iz baze na temelju odabrane tablice **/
  loadTableData() {
    this.loading = true;
    let dataObservable;

    switch (this.selectedTable) {
      case 'Airplane': dataObservable = this.adminService.getAllAirplanes(); break;
      case 'Airport': dataObservable = this.adminService.getAllAirports(); break;
      case 'Baggage': dataObservable = this.adminService.getAllBaggage(); break;
      case 'Flight': dataObservable = this.adminService.getAllFlights(); break;
      case 'Flight_category': dataObservable = this.adminService.getAllFlightCategories(); break;
      case 'Location': dataObservable = this.adminService.getAllLocations(); break;
      case 'Travel': dataObservable = this.adminService.getAllTravels(); break;
      case 'User': dataObservable = this.adminService.getAllUsers(); break;
      default: this.loading = false; return;
    }

    dataObservable.subscribe({
      next: (response) => {
        this.tableData = response.data.map((row: { [x: string]: string; }) => {
          let newRow = { ...row };
          this.tableColumns.forEach(col => {
            // Ako je password polje, prikazujemo ******** umjesto stvarne vrijednosti
            if (col.type === 'varbinary') {
              newRow[col.name] = '********';
            }

            // Ako je datum, formatiramo ga ispravno
            if (col.type === 'datetime' || col.type === 'datetime2' || col.type === 'date') {
              newRow[col.name] = this.formatDateForInput(row[col.name], col.type === 'date' ? 'date' : 'datetime-local');
            }
            else if (col.type === 'time') {
              newRow[col.name] = this.formatDateForInput(row[col.name], col.type);
            }
          });
          return newRow;
        });

        console.log(`Data for ${this.selectedTable}:`, this.tableData);
        this.loading = false;
      },
      error: (err) => {
        console.error(`Error fetching data for ${this.selectedTable}:`, err);
        this.loading = false;
      }
    });
  }

  /** Ispravlja format datuma za datetime-local input **/
  formatDateForInput(value: string, type: string): string {
    if (!value) return '';
    const date = new Date(value);

    console.log(value)
    console.log(type)

    if (type === 'time') {
      return value.substring(0, 8);
    }

    if (type === 'date') {
      // Format za <input type="date">: "YYYY-MM-DD"
      return date.toISOString().split('T')[0];
    }

    if (type === 'datetime-local') {
      // Format za <input type="datetime-local">: "YYYY-MM-DDTHH:mm"
      return date.toISOString().slice(0, 16);
    }

    return ''
  }

  /** Omogućuje uređivanje retka u tablici **/
  editRow(row: any) {
    row.isEditing = true;
  }

  /** Sprema promjene u retku ako su sva obavezna polja popunjena **/
  saveRow(row: any) {
    if (this.isFormValid(row)) {
      row.isEditing = false;
      console.log('Updated row:', row);
    } else {
      alert('Please fill in all required fields.');
    }
  }

  /** Briše redak iz baze i ažurira prikaz tablice **/
  deleteRow(id: number) {
    if (!confirm(`Are you sure you want to delete this record (ID: ${id})?`)) {
      return; // Ako korisnik odustane, ne brišemo
    }

    let deleteObservable;

    switch (this.selectedTable) {
      case 'Airplane': deleteObservable = this.adminService.deleteAirplane(id); break;
      case 'Airport': deleteObservable = this.adminService.deleteAirport(id); break;
      case 'Baggage': deleteObservable = this.adminService.deleteBaggage(id); break;
      case 'Flight': deleteObservable = this.adminService.deleteFlight(id); break;
      case 'Flight_category': deleteObservable = this.adminService.deleteFlightCategory(id); break;
      case 'Location': deleteObservable = this.adminService.deleteLocation(id); break;
      case 'Travel': deleteObservable = this.adminService.deleteTravel(id); break;
      case 'User': deleteObservable = this.adminService.deleteUser(id); break;
      default: return;
    }

    deleteObservable.subscribe({
      next: () => {
        this.tableData = this.tableData.filter(row => row.id !== id); // Ažuriraj prikaz tablice
        this.showPopupMessage(`Record deleted successfully!`, 'success');
      },
      error: (err) => {
        console.error('Error deleting record:', err);
        this.showPopupMessage('Error deleting record. Check logs.', 'error');
      }
    });
  }


  /** Dodaje novi redak u tablicu ako su sva obavezna polja popunjena **/
  insertRow() {
    if (this.isFormValid(this.newRow)) {
      let insertObservable;

      // Prije slanja, formatiramo sve datetime vrijednosti
      this.tableColumns.forEach(column => {
        if (column.type === 'datetime' || column.type === 'datetime2' || column.type === 'date') {
          if (this.newRow[column.name]) {
            this.newRow[column.name] = this.formatDateForSQL(this.newRow[column.name], column.type);
          }
        }
      });

      switch (this.selectedTable) {
        case 'Airplane': insertObservable = this.adminService.insertAirplane(this.newRow); break;
        case 'Airport': insertObservable = this.adminService.insertAirport(this.newRow); break;
        case 'Baggage': insertObservable = this.adminService.insertBaggage(this.newRow); break;
        case 'Flight': insertObservable = this.adminService.insertFlight(this.newRow); break;
        case 'Flight_category': insertObservable = this.adminService.insertFlightCategory(this.newRow); break;
        case 'Location': insertObservable = this.adminService.insertLocation(this.newRow); break;
        case 'Travel': insertObservable = this.adminService.insertTravel(this.newRow); break;
        case 'User': insertObservable = this.adminService.insertUser(this.newRow); break;
        default: return;
      }

      insertObservable.subscribe({
        next: (response) => {
          console.log('Inserted successfully:', response);
          this.loadTableData();
          this.newRow = {};
        },
        error: (err) => {
          console.error('Error inserting data:', err);
        }
      });
    } else {
      alert('Please fill in all required fields.');
    }
  }

  /** Formatira datum za SQL Server format (YYYY-MM-DD HH:MM:SS za DATETIME i DATETIME2) **/
  formatDateForSQL(value: string | Date, type: string): string {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) {
      console.error('Invalid date passed to formatDateForSQL:', value);
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    if (type === 'date') {
      return `${year}-${month}-${day}`;
    }

    if (type === 'datetime' || type === 'datetime2') {
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    console.error('Unsupported SQL date type:', type);
    return '';
  }

  /** Forsira unos vremena u formatu hh:mm:ss */
  formatTimeInput(columnName: string) {
    let value = this.newRow[columnName];

    value = value.replace(/\D/g, '');

    if (value.length > 6) {
      value = value.substring(0, 6);
    }

    if (value.length > 4) {
      value = `${value.substring(0, 2)}:${value.substring(2, 4)}:${value.substring(4)}`;
    } else if (value.length > 2) {
      value = `${value.substring(0, 2)}:${value.substring(2)}`;
    }

    this.newRow[columnName] = value;
  }

  /** Osvježava podatke o aerodromima i lokacijama **/
  refreshAirportsAndLocations() {
    const apiUrl = 'https://www.ryanair.com/api/views/locate/5/airports/en/active';

    this.http.get<any[]>(apiUrl).subscribe({
      next: async (response) => {
        console.log('Fetched airport data:', response);

        await this.insertLocations(response);
        await this.insertAirports(response);

        await this.insertAirportRelationships(response);

        alert('Airports, locations, and routes refreshed successfully.');
      },
      error: (err) => {
        console.error('Error fetching airport data:', err);
        alert('Failed to refresh airports and locations.');
      }
    });
  }

  /** Dohvaća i zapisuje aktivne aerodromske rute **/
  async insertAirportRelationships(airports: any[]) {
    console.log("🔄 Fetching and inserting airport relationships...");

    for (const airport of airports) {
      const originCode = airport.code;
      const apiUrl = `https://www.ryanair.com/api/views/locate/searchWidget/routes/en/airport/${originCode}`;

      try {
        const response: any = await this.http.get(apiUrl).toPromise();
        console.log(`📊 Routes for ${originCode}:`, response);

        if (!response || !Array.isArray(response)) {
          console.warn(`⚠️ No valid routes for ${originCode}. Skipping.`);
          continue;
        }

        for (const route of response) {
          if (!route.arrivalAirport || !route.arrivalAirport.code) {
            console.warn("⚠️ Skipping route due to missing destination data:", route);
            continue;
          }

          const destinationCode = route.arrivalAirport.code;

          try {
            await this.adminService.insertAirportRelationship(originCode, destinationCode).toPromise();
            console.log(`✅ Inserted airport relationship: ${originCode} -> ${destinationCode}`);
          } catch (err) {
            console.error(`❌ Error inserting airport relationship for ${originCode} -> ${destinationCode}:`, err);
          }
        }
      } catch (error) {
        console.error(`❌ Error fetching routes for airport ${originCode}:`, error);
      }
    }
  }


  /** Unosi lokacije u bazu **/
  async insertLocations(airportData: any[]) {
    const locations = airportData.map(item => ({
      name: item.city.name,
      country: item.country.name,
      timezone: item.timeZone
    }));

    for (const location of locations) {
      await this.adminService.insertLocation(location).toPromise();
    }

    console.log('Locations inserted successfully.');
  }

  popupMessage: string | null = null;
  popupType: string = 'success';

  /** Prikazuje poruku i automatski je skriva nakon 3 sekunde **/
  showPopupMessage(message: string, type: 'success' | 'error') {
    this.popupMessage = message;
    this.popupType = type;

    setTimeout(() => {
      this.popupMessage = null;
    }, 3000);
  }

  /** Unosi aerodrome u bazu, povezuje ih s lokacijama **/
  async insertAirports(airportData: any[]) {
    let successCount = 0;
    let errorCount = 0;

    for (const airport of airportData) {
      try {
        const locationResponse = await this.adminService.getLocationByName(airport.city.name, airport.country.name).toPromise();
        const locationId = locationResponse?.id || null;

        const airportData = {
          code: airport.code,
          name: airport.name,
          url: null,
          location_id: locationId
        };

        await this.adminService.insertAirport(airportData).toPromise();
        successCount++;
      } catch (err) {
        console.error(`Error inserting airport ${airport.code}:`, err);
        errorCount++;
      }
    }

    console.log('Airports inserted successfully.');

    if (errorCount === 0) {
      this.showPopupMessage('Airports inserted successfully!', 'success');
    } else {
      this.showPopupMessage(`Inserted with ${errorCount} errors. Check logs.`, 'error');
    }
  }


  /** Provjerava jesu li sva obavezna polja popunjena **/
  isFormValid(row: any): boolean {
    return this.tableColumns.every(column => {
      if (this.getInputType(column.type) === 'checkbox') {
        return true;
      }
      return column.nullable || (row[column.name] !== undefined && row[column.name] !== '');
    });
  }

  /** Vraća tip input polja na temelju tipa iz baze **/
  getInputType(dataType: string): string {
    switch (dataType) {
      case 'int':
      case 'smallint':
      case 'tinyint':
      case 'bigint':
        return 'number';
      case 'decimal':
      case 'numeric':
      case 'float':
      case 'real':
        return 'number';
      case 'time':
        return 'time';
      case 'date':
        return 'date';
      case 'datetime':
      case 'datetime2':
        return 'datetime-local';
      case 'bit':
        return 'checkbox';
      case 'varbinary':
        return 'password';
      default:
        return 'text';
    }
  }
}
