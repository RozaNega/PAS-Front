import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UserProfile } from '../../../../types/dashboard.types';

@Component({
  selector: 'app-edit-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-profile-modal.component.html',
  styleUrl: './edit-profile-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditProfileModalComponent {
  readonly modal = inject(NgbActiveModal);

  profile: UserProfile = {
    fullName: 'John Doe',
    employeeCode: 'EMP-001',
    department: 'IT Department',
    position: 'Senior Developer',
    email: 'john.doe@afrocom.com',
    phone: '+251-911-234567',
    joinDate: 'Jan 15, 2020',
    manager: 'Sarah Smith',
  };

  save(): void {
    console.log('Saving profile:', this.profile);
    this.modal.close(this.profile);
  }

  cancel(): void {
    this.modal.dismiss();
  }
}
