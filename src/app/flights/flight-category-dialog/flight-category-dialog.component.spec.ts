import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlightCategoryDialogComponent } from './flight-category-dialog.component';

describe('FlightCategoryDialogComponent', () => {
  let component: FlightCategoryDialogComponent;
  let fixture: ComponentFixture<FlightCategoryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightCategoryDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlightCategoryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
