import type { EmployeeRole } from '../../shared/utilities/employee-role';

export type { EmployeeRole } from '../../shared/utilities/employee-role';

export interface ApiResponse<T = undefined> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
}
export interface ApiError {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
}
export interface Address {
  street: string;
  city: string;
  state: string;
  stateCode: string;
  country: string;
  countryCode: string;
}
export type AccountStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE' | 'REJECTED';
export type RegistrationStage = 'PROFILE' | 'VERIFICATION' | 'BRANCH';
export type BusinessType = 'TRANSPORTATION' | 'CAR_HIRE';
export type DocumentKey = 'certificateOfIncorporation' | 'formCAC' | 'memorandumAndArticle';
export interface BusinessSettings {
  allowStaffBooking?: boolean;
  allowCashPayment?: boolean;
  allowTransferPayment?: boolean;
  allowPosPayment?: boolean;
}
export interface Business {
  _id: string;
  name: string;
  slug: string;
  email: string;
  contactPhoneNumber: string;
  supportPhoneNumber?: string;
  businessType: BusinessType;
  address?: Address;
  logo?: string;
  accountStatus: AccountStatus;
  registrationComplete: boolean;
  registrationStage: RegistrationStage[];
  rcNumber?: string;
  documents?: Partial<Record<DocumentKey, string>>;
  settings?: BusinessSettings;
}
export interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: EmployeeRole;
  accountStatus: AccountStatus;
  signupVerified: boolean;
  branch?: string;
  business: Pick<Business, '_id' | 'name' | 'slug' | 'logo' | 'accountStatus'>;
}
export interface BusinessChoice {
  businessName: string;
  slug: string;
  logo?: string;
}
export interface LoginChoice extends BusinessChoice {
  employee: string;
  business: string;
  businessAccountStatus: AccountStatus;
  registrationComplete: boolean;
  registrationStage?: RegistrationStage[];
  role: EmployeeRole;
}
export interface LoginSelection {
  requiresAccountSelection: true;
  token: string;
  expiresAt: string;
  businesses: LoginChoice[];
}
export interface LoginSuccess {
  requiresAccountSelection: false;
  token: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: EmployeeRole;
    signupVerified: boolean;
  };
  business: { id: string; name: string; slug: string; role: EmployeeRole };
}
export type LoginResult = LoginSuccess | LoginSelection;
export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  businessName: string;
}
export interface SignupResult {
  business: { id: string; name: string; slug: string };
  employee: { id: string; email: string; role: EmployeeRole };
}
export interface EmailRecipient {
  email: string;
  slug?: string;
}
export interface EmailResult {
  requiresAccountSelection?: boolean;
  businesses?: BusinessChoice[];
  verificationEmailSent?: boolean;
}
