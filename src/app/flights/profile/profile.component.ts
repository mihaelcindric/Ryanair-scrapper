import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

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

  constructor(private authService: AuthService, private fb: FormBuilder, private router: Router) {
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
  }

  ngOnInit(): void {
    console.log("🔄 ProfileComponent initialized - Fetching user...");
    this.authService.getCurrentUser().subscribe((user) => {
      console.log("📥 Current user received in ProfileComponent:", user);
      if (user) {
        this.user = user;
        this.profileForm.patchValue(user);
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


  logout(): void {
    console.log("🚪 Logging out user...");
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
