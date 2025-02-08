import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {FlightsService} from '../../services/flights.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  imports: [
    ReactiveFormsModule,
    CommonModule
  ],
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  profileForm: FormGroup;
  isEditing = false;

  // Baggage
  baggageList: any[] = [];
  baggageForm: FormGroup;
  isAddingBaggage = false;
  editingBaggageId: number | null = null;

  constructor(private authService: AuthService,
              private fb: FormBuilder,
              private router: Router,
              private flightsService: FlightsService
  ) {
    this.profileForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      profile_picture_url: [''],
      date_of_birth: ['', Validators.required],
      current_password: ['', Validators.required],
      new_password: ['']
    });

    // Baggage form
    this.baggageForm = this.fb.group({
      brand: [''],
      color: ['', Validators.required],
      width: ['', Validators.required],
      height: ['', Validators.required],
      depth: ['', Validators.required],
      wheels_count: [''],
      has_tracker: [false] // Default value false
    });
  }

  ngOnInit(): void {
    console.log("🔄 ProfileComponent initialized - Fetching user...");
    this.authService.getCurrentUser().subscribe((user) => {
      console.log("📥 Current user received in ProfileComponent:", user);
      if (user) {
        this.user = user;
        this.profileForm.patchValue(user);
        this.loadBaggage();
      }
    }, (error) => {
      console.error("❌ Error fetching current user:", error);
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    console.log(this.isEditing ? "✏️ Editing mode enabled" : "📄 Editing mode disabled");

    if (this.isEditing && this.user) {
      this.profileForm.patchValue({
        ...this.user,
        date_of_birth: this.formatDate(this.user.date_of_birth)
      });
    } else {
      this.profileForm.patchValue({
        current_password: '',
        new_password: ''
      });
    }
  }

  saveChanges(): void {
    if (this.profileForm.valid) {
      const updatedUser = {
        ...this.user,
        ...this.profileForm.value
      };

      console.log("🚀 Sending update request with:", updatedUser);
      this.authService.updateProfile(updatedUser).subscribe((res) => {
        console.log("✅ Update response:", res);
        if (res.success) {
          alert('Profile updated successfully!');
          this.authService.setCurrentUser(updatedUser);  // Set updated user
          this.isEditing = false;
        } else {
          alert(res.message || 'Error updating profile.');
          console.error("❌ Error updating profile:", res.message);
        }
      }, (error) => {
        console.error("❌ Update request failed:", error);
      });
    } else {
      console.warn("⚠️ Form is invalid, update request not sent.");
    }
  }

  private formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Only "YYYY-MM-DD" part
  }

  setDefaultProfilePicture(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/images/default-profile.png';
  }

  loadBaggage(): void {
    if (!this.user) return;
    this.flightsService.getBaggageByUser(this.user.id).subscribe((res: any) => {
      this.baggageList = res.baggage;
      console.log(this.baggageList);
    }, (error) => {
      console.error("❌ Error fetching baggage:", error);
    });
  }

  startAddingBaggage(): void {
    this.isAddingBaggage = true;
    this.editingBaggageId = null;
    this.baggageForm.reset({ has_tracker: false });
  }


  addOrUpdateBaggage(): void {
    if (!this.user || this.baggageForm.invalid) return;

    const baggageData = { ...this.baggageForm.value, user_id: this.user.id };

    if (this.editingBaggageId) {
      baggageData.id = this.editingBaggageId;
      this.flightsService.updateBaggage(baggageData).subscribe(() => {
        this.loadBaggage();
        this.cancelBaggageForm();
      });
    } else {
      this.flightsService.addBaggage(baggageData).subscribe(() => {
        this.loadBaggage();
        this.cancelBaggageForm();
      });
    }
  }

  editBaggage(baggage: any): void {
    this.isAddingBaggage = true;
    this.editingBaggageId = baggage.id;
    this.baggageForm.patchValue(baggage);
  }

  deleteBaggage(id: number): void {
    if (confirm('Are you sure you want to delete this baggage item?')) {
      this.flightsService.deleteBaggage(id).subscribe(() => {
        this.loadBaggage();
      });
    }
  }

  cancelBaggageForm(): void {
    this.isAddingBaggage = false;
    this.editingBaggageId = null;
    this.baggageForm.reset({ has_tracker: false }); // Reset form
  }

  logout(): void {
    console.log("🚪 Logging out user...");
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
