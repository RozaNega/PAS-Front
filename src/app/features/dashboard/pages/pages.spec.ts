import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { Pages } from './pages';
import { AuthService, DashboardRole } from '../../../core/services/auth.service';
import { ActivatedRoute } from '@angular/router';

describe('Pages', () => {
  let component: Pages;
  let fixture: ComponentFixture<Pages>;

  beforeEach(async () => {
    const authServiceMock: Pick<
      AuthService,
      'currentUser$' | 'getCurrentUser' | 'mapUserToDashboardRole'
    > = {
      currentUser$: of(null),
      getCurrentUser: () => null,
      mapUserToDashboardRole: () => 'employee' as DashboardRole,
    };

    await TestBed.configureTestingModule({
      imports: [Pages],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ role: 'employee' })),
            snapshot: { paramMap: convertToParamMap({ role: 'employee' }) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Pages);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
