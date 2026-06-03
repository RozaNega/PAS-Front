import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UsersService } from '../../../../core/services/users.service';
import { RolesService } from '../../../../core/services/roles.service';

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly router = inject(Router);

  currentStep = signal(1);
  totalSteps = 3;
  loading = signal(false);
  error = signal<string | null>(null);
  roles = signal<any[]>([]);

  steps = [
    { number: 1, title: 'Basic Information' },
    { number: 2, title: 'Permissions & Notifications' },
    { number: 3, title: 'Review & Submit' }
  ];

  formData = {
    fullName: '',
    employeeCode: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    username: '',
    role: '',
    password: '',
    confirmPassword: '',
    autoGeneratePassword: false,
    sendWelcomeEmail: true,
    sendApprovalEmails: true,
    sendLowStockAlerts: false,
    sendSystemAnnouncements: true
  };

  departments = ['IT', 'HR', 'Finance', 'Operations', 'Warehouse', 'Sales', 'Marketing'];

  permissions = [
    { category: 'Dashboard', items: [
      { name: 'View Dashboard', checked: true },
      { name: 'Export Dashboard', checked: false }
    ]},
    { category: 'Property Management', items: [
      { name: 'View Properties', checked: true },
      { name: 'Create Properties', checked: false },
      { name: 'Edit Properties', checked: false },
      { name: 'Delete Properties', checked: false }
    ]},
    { category: 'Inventory', items: [
      { name: 'View Stock', checked: true },
      { name: 'Adjust Stock', checked: false },
      { name: 'Transfer Stock', checked: false },
      { name: 'Export Inventory', checked: false }
    ]},
    { category: 'User Management', items: [
      { name: 'View Users', checked: false },
      { name: 'Create Users', checked: false },
      { name: 'Edit Users', checked: false },
      { name: 'Delete Users', checked: false }
    ]}
  ];

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.rolesService.getRoles().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.roles.set((response.data as any[]).map((role: any) => ({
            value: (role.roleName || '').toLowerCase().replace(/\s+/g, '-'),
            label: role.roleName || 'Role',
            permissions: role.permissions || []
          })));
        }
      },
      error: (err: any) => {
        console.error('Error loading roles:', err);
      }
    });
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
    }
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  validateStep(): boolean {
    const step = this.currentStep();
    
    if (step === 1) {
      if (!this.formData.fullName || !this.formData.email || !this.formData.username || !this.formData.department) {
        alert('Please fill in all required fields: Full Name, Email, Username, and Department');
        return false;
      }
      
      if (!this.isValidEmail(this.formData.email)) {
        alert('Please enter a valid email address');
        return false;
      }

      if (this.formData.username.length < 3 || this.formData.username.length > 50) {
        alert('Username must be between 3 and 50 characters');
        return false;
      }
    }
    
    if (step === 2) {
      if (!this.formData.role) {
        alert('Please select a role');
        return false;
      }
      
      if (!this.formData.autoGeneratePassword) {
        if (!this.formData.password || !this.formData.confirmPassword) {
          alert('Please enter and confirm password');
          return false;
        }
        
        if (this.formData.password !== this.formData.confirmPassword) {
          alert('Passwords do not match');
          return false;
        }
        
        if (this.formData.password.length < 8) {
          alert('Password must be at least 8 characters long');
          return false;
        }

        if (this.formData.password.length > 100) {
          alert('Password must be less than 100 characters');
          return false;
        }
      }
    }
    
    return true;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  submitForm(): void {
    if (!this.validateStep()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Find the selected role to get the actual role name
    const selectedRole = this.roles().find(r => r.value === this.formData.role);
    const roleName = selectedRole ? selectedRole.label : this.formData.role;

    const password = this.formData.autoGeneratePassword ? this.generatePassword() : this.formData.password;

    // Ensure all required fields are properly formatted
    const userData: any = {
      username: this.formData.username.trim(),
      password,
      email: this.formData.email.trim(),
      fullName: this.formData.fullName.trim(),
      department: this.formData.department.trim(),
      employeeCode: this.formData.employeeCode.trim() || undefined,
      phoneNumber: this.formData.phone.trim() || undefined,
      roleName: roleName || undefined,
    };

    console.log('=== USER REGISTRATION DEBUG ===');
    console.log('Submitting user data:', JSON.stringify(userData, null, 2));
    console.log('Field validation:');
    console.log('- Username length:', userData.username.length, '(required: 3-50)');
    console.log('- Password length:', userData.password.length, '(required: 8-100)');
    console.log('- Email format:', this.isValidEmail(userData.email));
    console.log('- Department:', userData.department || '(EMPTY!)');
    console.log('- Role name:', userData.roleName || '(EMPTY!)');
    console.log('===============================');

    this.usersService.createUser(userData).subscribe({
      next: (response: any) => {
        console.log('=== REGISTRATION SUCCESS ===');
        console.log('Response:', JSON.stringify(response, null, 2));
        console.log('============================');
        
        if (response.success) {
          alert('User created successfully!');
          this.router.navigate(['/admin/users']);
        } else {
          this.error.set(response.message || 'Failed to create user');
          alert(this.error());
        }
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('=== REGISTRATION ERROR ===');
        console.error('Full error object:', err);
        console.error('Error status:', err.status);
        console.error('Error statusText:', err.statusText);
        console.error('Error error:', err.error);
        console.error('==========================');
        
        // Handle validation errors with detailed parsing
        let errorMessage = 'Failed to create user. Please try again.';
        let errorDetails: string[] = [];
        
        if (err.error) {
          // .NET Core validation errors format
          if (err.error.errors && typeof err.error.errors === 'object') {
            const validationErrors = err.error.errors;
            errorDetails = Object.keys(validationErrors).map(key => {
              const messages = Array.isArray(validationErrors[key]) 
                ? validationErrors[key].join(', ') 
                : validationErrors[key];
              return `• ${key}: ${messages}`;
            });
            errorMessage = 'Validation errors:\n' + errorDetails.join('\n');
          } 
          // Single error message
          else if (err.error.message) {
            errorMessage = err.error.message;
          }
          // Title field (common in .NET validation responses)
          else if (err.error.title) {
            errorMessage = err.error.title;
            // If there's a title but also errors, append them
            if (err.error.errors) {
              errorMessage += '\n\nDetails:\n' + JSON.stringify(err.error.errors, null, 2);
            }
          }
          // Generic error object
          else if (typeof err.error === 'string') {
            errorMessage = err.error;
          }
        }
        
        // Add HTTP status info
        if (err.status) {
          errorMessage = `[${err.status} ${err.statusText}]\n${errorMessage}`;
        }
        
        console.error('Parsed error message:', errorMessage);
        
        this.error.set(errorMessage);
        alert(this.error());
        this.loading.set(false);
      }
    });
  }

  generatePassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  saveDraft(): void {
    localStorage.setItem('userDraft', JSON.stringify(this.formData));
    alert('Draft saved!');
  }

  loadDraft(): void {
    const draft = localStorage.getItem('userDraft');
    if (draft) {
      this.formData = JSON.parse(draft);
    }
  }
}
