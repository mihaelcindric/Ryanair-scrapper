import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import {HttpClient} from '@angular/common/http';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatDividerModule} from '@angular/material/divider';
import {MatListModule} from '@angular/material/list';
import {MatIconModule} from '@angular/material/icon';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatTabsModule} from '@angular/material/tabs';
import {MatTableModule} from '@angular/material/table';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatCheckboxModule} from '@angular/material/checkbox';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [
    FormsModule,
    CommonModule,
    MatSidenavModule,
    MatDividerModule,
    MatListModule,
    MatIconModule,
    MatToolbarModule,
    MatTabsModule,
    MatTableModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  tables = ['Airplane', 'Airport', 'Baggage', 'Flight', 'Flight_category', 'Location', 'Travel', 'User'];
  selectedTable: string = this.tables[0];
  currentActionIndex = 0;

  tableSchema: any[] = [];
  tableColumns: any[] = [];
  tableData: any[] = [];
  newRow: any = {};
  loading: boolean = false;
  displayedColumns: string[] = [];

  constructor(private adminService: AdminService, private http: HttpClient) {
    this.loadTable();
  }

  loadTable() {
    this.loading = true;
    this.adminService.getTableSchema(this.selectedTable).subscribe({
      next: (response) => {
        this.tableColumns = response.schema.map((col: any) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.nullable === 'YES',
        }));
        this.displayedColumns = [...this.tableColumns.map(col => col.name), 'actions'];

        this.adminService.getTableData(this.selectedTable).subscribe({
          next: (res) => {
            this.tableData = Array.isArray(res.data) ? res.data : [];
            console.log("✅ Table Data:", this.tableData);
            this.loading = false;
          },
          error: (err) => this.handleError(err, 'Error fetching table data')
        });
      },
      error: (err) => this.handleError(err, 'Error fetching table schema')
    });
  }


  selectTable(table: string) {
    this.selectedTable = table;
    this.newRow = {};

    if (this.selectedTable === 'Flight' || this.selectedTable === 'Travel') {
      this.newRow['inserted_on'] = this.getCurrentDateTime();
    }

    this.loadTable();
  }


  deleteRow(id: number) {
    if (confirm(`Are you sure you want to delete record (ID: ${id})?`)) {
      this.adminService.deleteRecord(this.selectedTable, id).subscribe({
        next: () => {
          this.tableData = this.tableData.filter(row => row.id !== id);
          this.showPopupMessage(`Record deleted successfully!`, 'success');
        },
        error: (err: any) => this.handleError(err, 'Error deleting record')
      });
    }
  }

  insertRow() {
    if (this.isFormValid(this.newRow)) {
      this.tableColumns.forEach(column => {
        const colType = this.getInputType(column.type);

        if (colType === 'checkbox') {
          this.newRow[column.name] = this.newRow[column.name] ?? (column.nullable ? null : false);
        }

        if (colType === 'date' || colType === 'datetime-local' || colType === 'time') {
          this.newRow[column.name] = this.formatDateForSQL(this.newRow[column.name], column.type);
        }

        if (column.name.toLowerCase().includes('duration') || column.name.toLowerCase().includes('time')) {
          this.newRow[column.name] = this.formatDateForSQL(this.newRow[column.name], 'duration');
        }
      });

      this.adminService.insertRecord(this.selectedTable, this.newRow).subscribe({
        next: () => {
          this.loadTable();
          this.newRow = {};
          this.showPopupMessage('Inserted successfully!', 'success');
        },
        error: (err: any) => this.handleError(err, 'Error inserting record')
      });
    } else {
      alert('Please fill in all required fields.');
    }
  }

  editRow(row: any) {
    if (row.isEditing) {
      if (this.isFormValid(row)) {
        const updatedRow = { ...row };
        delete updatedRow.isEditing;

        this.adminService.updateRecord(this.selectedTable, updatedRow).subscribe({
          next: () => {
            row.isEditing = false;
            this.showPopupMessage(`Updated successfully!`, 'success');
          },
          error: (err) => this.handleError(err, 'Error updating record')
        });
      } else {
        alert('Please fill in all required fields.');
      }
    } else {
      row.isEditing = true;
    }
  }

  // ToDo: ako zapis postoji u tablici, a vise se ne dohvaca iz API-ja, trebalo bi ga ukloniti iz tablice!!! (sada se samo dodaju novi ako vec nisu u njoj)
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

  /** Insert locations only if they don’t already exist */
  async insertLocations(airportData: any[]) {
    let errorCount = 0;

    for (const item of airportData) {
      const cityName    = item.city.name;
      const countryName = item.country.name;
      try {
        const existing = await this.adminService
          .getLocationByName(cityName, countryName).toPromise();

        if (existing?.id) {
          // already present → skip
          continue;
        }

        await this.adminService.insertRecord('Location', {
          name: cityName,
          country: countryName,
          timezone: item.timeZone
        }).toPromise();
      } catch (err) {
        console.error(`Error inserting location ${cityName}, ${countryName}:`, err);
        errorCount++;
      }
    }

    this.showPopupMessage(
      errorCount === 0
        ? 'Locations refreshed successfully!'
        : `Locations refreshed with ${errorCount} errors. Check console.`,
      errorCount === 0 ? 'success' : 'error'
    );
  }

  /** Insert airports only if they don’t already exist */
  async insertAirports(airportData: any[]) {
    let successCount = 0;
    let errorCount   = 0;

    for (const airport of airportData) {
      try {
        // 1) skip if already in DB
        const existing = await this.adminService
          .getAirportByCode(airport.code).toPromise();

        if (existing?.id) {
          successCount++;
          continue;
        }

        // 2) find or insert its location first
        const loc = await this.adminService
          .getLocationByName(airport.city.name, airport.country.name).toPromise();

        const locationId = loc?.id || null;

        // 3) now insert the airport
        await this.adminService.insertRecord('Airport', {
          code:      airport.code,
          name:      airport.name,
          url:       null,
          location_id: locationId,
          latitude:  airport.coordinates.latitude,
          longitude: airport.coordinates.longitude
        }).toPromise();

        successCount++;
      } catch (err) {
        console.error(`Error inserting airport ${airport.code}:`, err);
        errorCount++;
      }
    }

    this.showPopupMessage(
      errorCount === 0
        ? `Airports refreshed (${successCount} new).`
        : `Airports refreshed with ${errorCount} errors.`,
      errorCount === 0 ? 'success' : 'error'
    );
  }

  /** Insert airport relationships only if they don’t already exist */
  async insertAirportRelationships(airports: any[]) {
    let errorCount = 0;

    for (const airport of airports) {
      const originCode = airport.code;
      const routesUrl  = `https://www.ryanair.com/api/views/locate/searchWidget/routes/en/airport/${originCode}`;

      try {
        const response = await this.http.get<any[]>(routesUrl).toPromise();

        // @ts-ignore
        for (const route of response) {
          const destCode = route.arrivalAirport?.code;
          if (!destCode) continue;

          try {
            // skip if relationship already exists
            const exists = await this.adminService
              .getAirportRelationship(originCode, destCode).toPromise();

            if (exists) continue;

            await this.adminService
              .insertAirportRelationship(originCode, destCode).toPromise();

          } catch (relErr) {
            console.error(`Error inserting relation ${originCode}→${destCode}:`, relErr);
            errorCount++;
          }
        }
      } catch (err) {
        console.error(`Error fetching routes for ${originCode}:`, err);
        errorCount++;
      }
    }

    this.showPopupMessage(
      errorCount === 0
        ? 'Airport routes refreshed successfully!'
        : `Routes refreshed with ${errorCount} errors.`,
      errorCount === 0 ? 'success' : 'error'
    );
  }



  isFormValid(row: any): boolean {
    return this.tableColumns.every(column => {
      const value = row[column.name];

      // If checkbox, skip the check
      if (this.getInputType(column.type) === 'checkbox') {
        return true;
      }

      // If nullable, skip the check
      return column.nullable || (value !== undefined && value !== null && value !== '');
    });
  }

  popupMessage: string | null = null;
  popupType: string = 'success';

  showPopupMessage(message: string, type: 'success' | 'error') {
    this.popupMessage = message;
    this.popupType = type;
    setTimeout(() => { this.popupMessage = null; }, 3000);
  }

  private handleError(error: any, message: string) {
    console.error(message, error);
    this.showPopupMessage(message, 'error');
    this.loading = false;
  }

  getCurrentDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  formatDateForSQL(value: string | Date, type: string): string {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) {
      console.error('❌ Invalid date passed to formatDateForSQL:', value);
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

    if (type === 'time' || type === 'duration') {
      return `${hours}:${minutes}:${seconds}`;
    }

    console.error('Unsupported SQL date type:', type);
    return '';
  }

  formatDurationInput(value: string, columnName: string) {
    if (!value) return;

    let formattedValue = value.replace(/\D/g, '');

    if (formattedValue.length > 2 && formattedValue.length <= 4) {
      formattedValue = `${formattedValue.substring(0, 2)}:${formattedValue.substring(2)}`;
    } else if (formattedValue.length > 4) {
      formattedValue = `${formattedValue.substring(0, 2)}:${formattedValue.substring(2, 4)}:${formattedValue.substring(4, 6)}`;
    }

    if (formattedValue.length > 8) {
      formattedValue = formattedValue.substring(0, 8);
    }

    const [hh, mm, ss] = formattedValue.split(':').map(v => parseInt(v, 10));
    if (hh > 99 || mm > 59 || (ss !== undefined && ss > 59)) return;

    this.newRow[columnName] = formattedValue;
  }



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
        return 'text';
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

  protected readonly name = name;
}
