import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedTravelsComponent } from './saved-travels.component';

describe('SavedTravelsComponent', () => {
  let component: SavedTravelsComponent;
  let fixture: ComponentFixture<SavedTravelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavedTravelsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SavedTravelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
