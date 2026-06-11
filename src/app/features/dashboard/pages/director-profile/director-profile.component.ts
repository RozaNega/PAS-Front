import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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
      </div>
      <div class="row">
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm">
            <div class="card-body text-center py-4">
              <div class="avatar-placeholder bg-primary bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 100px; height: 100px;">
                <i class="bi bi-person-badge text-primary fs-1"></i>
              </div>
              <h5 class="fw-bold">Director</h5>
              <p class="text-muted small mb-0">Executive Oversight</p>
              <p class="text-muted small mb-0">High-Value Approval Authority</p>
            </div>
          </div>
        </div>
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white py-3">
              <h6 class="fw-bold mb-0">Profile Information</h6>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label text-muted small">Full Name</label>
                <p class="fw-medium">Director</p>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted small">Role</label>
                <p class="fw-medium">Director</p>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted small">Approval Authority</label>
                <p class="fw-medium">Purchase Orders > $2,000 · New Items > $500 · Stock Adjustments > $500</p>
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
export class DirectorProfileComponent {}
