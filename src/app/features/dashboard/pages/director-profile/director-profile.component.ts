import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { EditProfileModalComponent } from '../../components/edit-profile-modal/edit-profile-modal.component';

@Component({
  selector: 'app-director-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0">
          <i class="bi bi-person-circle me-2"></i>Director Profile
        </h4>
        <button class="btn btn-outline-primary" (click)="editProfile()">
          <i class="bi bi-pencil"></i> Edit Profile
        </button>
      </div>
      <div class="row">
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm">
            <div class="card-body text-center py-4">
              <div class="avatar-placeholder bg-primary bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 100px; height: 100px;">
                <i class="bi bi-person-badge text-primary fs-1"></i>
              </div>
              <h5 class="fw-bold">{{ fullName() }}</h5>
              <p class="text-muted small mb-0">{{ position() || 'Executive Oversight' }}</p>
              <p class="text-muted small mb-0">{{ email() }}</p>
            </div>
          </div>
        </div>
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 class="fw-bold mb-0">Profile Information</h6>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label text-muted small">Full Name</label>
                <p class="fw-medium">{{ fullName() }}</p>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted small">Employee Code</label>
                <p class="fw-medium">{{ employeeCode() || 'N/A' }}</p>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted small">Email</label>
                <p class="fw-medium">{{ email() }}</p>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted small">Phone</label>
                <p class="fw-medium">{{ phone() || 'N/A' }}</p>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted small">Department</label>
                <p class="fw-medium">{{ department() || 'N/A' }}</p>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted small">Position</label>
                <p class="fw-medium">{{ position() || 'Director' }}</p>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted small">Dashboard Access</label>
                <p class="fw-medium">
                  <a routerLink="/director/dashboard" class="btn btn-sm btn-outline-primary me-2">
                    <i class="bi bi-speedometer2 me-1"></i>Dashboard
                  </a>
                  <a routerLink="/director/requisitions" class="btn btn-sm btn-outline-primary me-2">
                    <i class="bi bi-file-earmark-text me-1"></i>Requisitions
                  </a>
                  <a routerLink="/director/reports" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-bar-chart me-1"></i>Reports
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .avatar-placeholder { width: 100px; height: 100px; }
  `],
})
export class DirectorProfileComponent {
  private readonly modalService = inject(NgbModal);
  private readonly currentUserService = inject(CurrentUserService);

  protected readonly fullName = signal('Director');
  protected readonly employeeCode = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly department = signal('');
  protected readonly position = signal('Director');

  constructor() {
    const user = this.currentUserService.getCurrentUserValue();
    if (user) {
      this.fullName.set(user.fullName || 'Director');
      this.employeeCode.set(user.employeeCode || '');
      this.email.set(user.email || '');
      this.phone.set(user.phone || '');
      this.department.set(user.department || '');
      this.position.set(user.position || 'Director');
    }
  }

  editProfile(): void {
    const modalRef = this.modalService.open(EditProfileModalComponent, {
      fullscreen: true,
      backdrop: 'static',
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          const user = this.currentUserService.getCurrentUserValue();
          if (user) {
            this.fullName.set(user.fullName || 'Director');
            this.employeeCode.set(user.employeeCode || '');
            this.email.set(user.email || '');
            this.phone.set(user.phone || '');
            this.department.set(user.department || '');
            this.position.set(user.position || 'Director');
          }
        }
      },
      () => {},
    );
  }
}
