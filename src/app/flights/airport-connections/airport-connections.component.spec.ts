import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AirportConnectionsComponent } from './airport-connections.component';

describe('AirportConnectionsComponent', () => {
  let component: AirportConnectionsComponent;
  let fixture: ComponentFixture<AirportConnectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AirportConnectionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AirportConnectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
