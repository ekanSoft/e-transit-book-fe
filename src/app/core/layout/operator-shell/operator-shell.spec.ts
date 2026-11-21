import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Session } from '../../auth/session';
import type { Business, Employee } from '../../http/api.models';
import { OperatorShell } from './operator-shell';

describe('Operator shell business mark', () => {
  const business = signal<Business>({
    _id: 'test-business',
    name: 'Acemett',
    slug: 'acemett',
    email: 'test@example.test',
    contactPhoneNumber: '+2348012345678',
    businessType: 'TRANSPORTATION',
    accountStatus: 'ACTIVE',
    registrationComplete: true,
    registrationStage: [],
  });
  const employee: Employee = {
    _id: 'test-employee',
    firstName: 'Ada',
    lastName: 'Operator',
    email: 'test@example.test',
    phoneNumber: '+2348012345678',
    role: 'ADMIN',
    accountStatus: 'ACTIVE',
    signupVerified: true,
    business: {
      _id: 'test-business',
      name: 'Acemett',
      slug: 'acemett',
      logo: undefined,
      accountStatus: 'ACTIVE',
    },
  };
  let fixture: ComponentFixture<OperatorShell>;

  beforeEach(async () => {
    business.update((item) => ({ ...item, logo: undefined }));
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: Session,
          useValue: {
            destination: signal('/app/dashboard'),
            authenticated: signal(true),
            token: signal('test-session'),
            switchEmail: signal(''),
            employee: signal(employee),
            business,
            selection: signal(null),
            storageWarning: signal(false),
            contextError: signal([]),
            contextStatus: signal(0),
            logout: vi.fn(),
            switchBusiness: vi.fn(),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OperatorShell);
    await fixture.whenStable();
  });
  afterEach(() => TestBed.resetTestingModule());

  it('shows the business initial when the business has no logo', () => {
    const marks = [...fixture.nativeElement.querySelectorAll('.workspace-initial')];
    expect(marks.length).toBeGreaterThan(0);
    for (const mark of marks) {
      expect(mark.querySelector('img')).toBeNull();
      expect(mark.textContent.trim()).toBe('A');
    }
  });

  it('shows the business logo when one is saved', async () => {
    business.update((item) => ({ ...item, logo: 'https://cdn.example/logo.png' }));
    fixture.detectChanges();
    await fixture.whenStable();
    const images = [...fixture.nativeElement.querySelectorAll('.workspace-initial img')];
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) expect(image.getAttribute('src')).toBe('https://cdn.example/logo.png');
    for (const mark of fixture.nativeElement.querySelectorAll('.workspace-initial'))
      expect(mark.textContent.trim()).toBe('');
  });
});
