// User types
export interface UserRole {
  id: string;
  name: string;
  level: number;
}

export interface Facility {
  id: number;
  name: string;
  address?: string;
  phone?: string | null;
  email?: string | null;
  lga?: string | null;
  status?: 'active' | 'inactive';
  isActive?: boolean;
  createdAt?: string;
}

export interface CreateFacilityDto {
  centerName: string;
  address: string;
  phone?: string;
  email?: string;
  lga?: string;
}

export interface UpdateFacilityDto {
  centerName?: string;
  address?: string;
  phone?: string;
  email?: string;
  lga?: string;
  status?: 'active' | 'inactive';
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  facility: Facility | null;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

// Registration types
export type UserRoleType =
  | 'admin'
  | 'him_officer'
  | 'nurse'
  | 'doctor'
  | 'mls'
  | 'cho';

export interface RegisterDto {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRoleType;
  phcCenterId?: number;
  staffId?: string;
}

export interface RegisterResponse {
  message: string;
  token?: string;
  user: User | {
    id: number;
    email: string;
    fullName: string;
    role: UserRoleType;
    status: string;
  };
}

// Patient/Client types
export interface Patient {
  id: number;
  client_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  age: number;
  date_of_birth: string | null;
  gender: string;
  phone: string;
  address: string;
  next_of_kin: string;
  next_of_kin_phone: string;
  facility_id: number;
  facility_name: string | null;
  facility_address: string | null;
  lga: string | null;
  created_at: string;
}

export interface CreatePatientDto {
  fullName: string;
  phone: string;
  age: number;
  gender: string;
  phcCenterId: number;
  address: string;
  screeningTypeId: number;
  nextOfKin: string;
  nextOfKinPhone: string;
  email?: string;
  altPhone?: string;
  lga?: string;
}

export interface CreatePatientResponse {
  message: string;
  client: Patient;
  screening: {
    id: number;
    sessionId: string;
    status: string;
  };
}

// Screening types
export type ScreeningStatus = 'pending' | 'in_progress' | 'completed' | 'follow_up';

export interface ScreeningClient {
  id: number;
  clientId: string;
  firstName: string;
  lastName: string;
}

export interface NotificationType {
  id: number;
  name: string;
  pathway: string;
  gender: 'all' | 'male' | 'female';
}

export interface ScreeningVitals {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  temperature?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  weight?: number;
  height?: number;
  bmi?: number;
}

export interface Screening {
  id: number;
  sessionId: string;
  status: ScreeningStatus;
  createdAt: string;
  client: ScreeningClient;
  notificationType: NotificationType;
  facility: {
    name: string;
  };
  conductedBy?: string;
  vitals?: ScreeningVitals;
  results?: {
    diagnosis?: string;
    prescription?: string;
    recommendations?: string;
    nextAppointment?: string;
  };
}

export interface CreateScreeningDto {
  clientId: number;
  notificationTypeId: number;
}

export interface UpdateVitalsDto {
  systolicBp: number;
  diastolicBp: number;
  weight?: number;
  pulseRate?: number;
  temperature?: number;
}

export interface CompleteScreeningDto {
  pathway: string;
  data?: {
    result?: string;
    notes?: string;
    bloodSugar?: number;
    systolic?: number;
    diastolic?: number;
    testType?: string;
  };
}

// Dashboard types
export interface DashboardStats {
  totalClients: number;
  todayScreenings: number;
  pendingScreenings: number;
  completedToday: number;
}

// Appointment types
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface AppointmentClient {
  id: number;
  clientId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface Appointment {
  id: number;
  appointmentId: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  reason: string | null;
  status: AppointmentStatus;
  reminderSent: boolean;
  createdAt: string;
  client: AppointmentClient;
  facility: {
    id: number;
    name: string;
  };
  createdBy: string | null;
}

export interface CreateAppointmentDto {
  clientId: number;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  reason?: string;
}

export interface UpdateAppointmentDto {
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentType?: string;
  reason?: string;
  status?: AppointmentStatus;
}

// API Response types
export interface ApiError {
  message: string;
  statusCode?: number;
}

// ==================== PATHWAY SCREENING TYPES ====================

// Hypertension Screening
export type HypertensionResult = 'normal' | 'elevated' | 'high_stage1' | 'high_stage2' | 'crisis';
export type BpPosition = 'sitting' | 'standing' | 'lying';
export type ArmUsed = 'left' | 'right';

export interface HypertensionScreeningData {
  id: number;
  screeningId: number;
  systolicBp1: number;
  diastolicBp1: number;
  position1: BpPosition;
  armUsed1: ArmUsed;
  systolicBp2?: number | null;
  diastolicBp2?: number | null;
  position2?: BpPosition | null;
  armUsed2?: ArmUsed | null;
  systolicBp3?: number | null;
  diastolicBp3?: number | null;
  position3?: BpPosition | null;
  armUsed3?: ArmUsed | null;
  screeningResult: HypertensionResult;
  clinicalObservations?: string | null;
  recommendations?: string | null;
  referToDoctor: boolean;
  referralReason?: string | null;
  createdAt: string;
}

export interface CreateHypertensionScreeningDto {
  systolicBp1: number;
  diastolicBp1: number;
  position1: BpPosition;
  armUsed1: ArmUsed;
  systolicBp2?: number;
  diastolicBp2?: number;
  position2?: BpPosition;
  armUsed2?: ArmUsed;
  systolicBp3?: number;
  diastolicBp3?: number;
  position3?: BpPosition;
  armUsed3?: ArmUsed;
  clinicalObservations?: string;
  recommendations?: string;
  referToDoctor?: boolean;
  referralReason?: string;
}

// Diabetes Screening
export type DiabetesTestType = 'random' | 'fasting';
export type DiabetesResult = 'normal' | 'prediabetes' | 'diabetes';

export interface DiabetesScreeningData {
  id: number;
  screeningId: number;
  testType: DiabetesTestType;
  bloodSugarLevel: number;
  unit: string;
  fastingDurationHours?: number | null;
  testTime: string;
  screeningResult: DiabetesResult;
  clinicalObservations?: string | null;
  referToDoctor: boolean;
  referralReason?: string | null;
  createdAt: string;
}

export interface CreateDiabetesScreeningDto {
  testType: DiabetesTestType;
  bloodSugarLevel: number;
  unit?: string;
  fastingDurationHours?: number;
  testTime: string;
  clinicalObservations?: string;
  referToDoctor?: boolean;
  referralReason?: string;
}

// Cervical Cancer Screening
export type CervicalScreeningMethod = 'via' | 'vili' | 'pap_smear' | 'hpv_test' | 'other';
export type CervicalResult = 'negative' | 'positive' | 'suspicious' | 'inconclusive';

export interface CervicalScreeningData {
  id: number;
  screeningId: number;
  screeningPerformed: boolean;
  screeningMethod: CervicalScreeningMethod;
  otherMethodDetails?: string | null;
  visualInspectionFindings?: string | null;
  specimenCollected: boolean;
  specimenType?: string | null;
  screeningResult: CervicalResult;
  clinicalObservations?: string | null;
  remarks?: string | null;
  followUpRequired: boolean;
  followUpDate?: string | null;
  followUpNotes?: string | null;
  createdAt: string;
}

export interface CreateCervicalScreeningDto {
  screeningPerformed?: boolean;
  screeningMethod: CervicalScreeningMethod;
  otherMethodDetails?: string;
  visualInspectionFindings?: string;
  specimenCollected?: boolean;
  specimenType?: string;
  screeningResult: CervicalResult;
  clinicalObservations?: string;
  remarks?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  followUpNotes?: string;
}

// Breast Cancer Screening
export type BreastRiskLevel = 'low' | 'moderate' | 'high';
export type LymphNodeStatus = 'normal' | 'enlarged';
export type Laterality = 'left' | 'right' | 'bilateral' | 'none';

export interface BreastScreeningData {
  id: number;
  screeningId: number;
  lumpPresent: boolean;
  lumpLocation?: string | null;
  lumpSize?: string | null;
  lumpCharacteristics?: string | null;
  dischargePresent: boolean;
  dischargeType?: string | null;
  dischargeLocation?: Laterality | null;
  nippleInversion: boolean;
  nippleInversionLaterality?: Laterality | null;
  lymphNodeStatus: LymphNodeStatus;
  lymphNodeLocation?: string | null;
  skinChanges?: string | null;
  breastSymmetry?: string | null;
  summaryFindings: string;
  riskAssessment: BreastRiskLevel;
  recommendations?: string | null;
  referralRequired: boolean;
  referralFacility?: string | null;
  referralReason?: string | null;
  createdAt: string;
}

export interface CreateBreastScreeningDto {
  lumpPresent: boolean;
  lumpLocation?: string;
  lumpSize?: string;
  lumpCharacteristics?: string;
  dischargePresent: boolean;
  dischargeType?: string;
  dischargeLocation?: Laterality;
  nippleInversion: boolean;
  nippleInversionLaterality?: Laterality;
  lymphNodeStatus: LymphNodeStatus;
  lymphNodeLocation?: string;
  skinChanges?: string;
  breastSymmetry?: string;
  summaryFindings: string;
  riskAssessment: BreastRiskLevel;
  recommendations?: string;
  referralRequired?: boolean;
  referralFacility?: string;
  referralReason?: string;
}

// PSA Screening
export type PsaResult = 'normal' | 'borderline' | 'elevated';

export interface PsaScreeningData {
  id: number;
  screeningId: number;
  psaLevel: number;
  unit: string;
  testMethod?: string | null;
  testKit?: string | null;
  collectionTime: string;
  sampleQuality: string;
  sampleQualityNotes?: string | null;
  patientAge: number;
  normalRangeMin: number;
  normalRangeMax: number;
  screeningResult: PsaResult;
  resultInterpretation?: string | null;
  clinicalObservations?: string | null;
  referToDoctor: boolean;
  referralReason?: string | null;
  createdAt: string;
}

export interface CreatePsaScreeningDto {
  psaLevel: number;
  unit?: string;
  testMethod?: string;
  testKit?: string;
  collectionTime: string;
  sampleQuality?: string;
  sampleQualityNotes?: string;
  patientAge: number;
  normalRangeMin?: number;
  normalRangeMax: number;
  resultInterpretation?: string;
  clinicalObservations?: string;
  referToDoctor?: boolean;
  referralReason?: string;
}

// Pathway data response
export interface PathwayDataResponse {
  pathway: 'hypertension' | 'diabetes' | 'cervical' | 'breast' | 'psa' | null;
  data: HypertensionScreeningData | DiabetesScreeningData | CervicalScreeningData | BreastScreeningData | PsaScreeningData | null;
}

// Staff/User management types
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface StaffUser {
  id: number;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  staffId: string | null;
  status: UserStatus;
  isActive: boolean;
  role: UserRoleType;
  facilityId: number | null;
  facility: string | null;
  createdAt: string;
  approvedAt: string | null;
}

export interface UserActionResponse {
  message: string;
  user: StaffUser;
}

// Vital Records types (for multiple vitals recordings)
export interface VitalRecord {
  id: number;
  patientId: number;
  screeningId: number | null;
  bloodPressure: {
    systolic: number | null;
    diastolic: number | null;
    formatted: string | null;
  };
  temperature: number | null;
  pulseRate: number | null;
  respiratoryRate: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  bloodSugar: {
    random: number | null;
    fasting: number | null;
  };
  notes: string | null;
  recordedBy: {
    id: number;
    name: string;
  } | null;
  recordedAt: string;
  createdAt: string;
}

export interface CreateVitalRecordDto {
  patientId: number;
  screeningId?: number;
  systolicBp: number;
  diastolicBp: number;
  temperature?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  weight?: number;
  height?: number;
  bloodSugarRandom?: number;
  bloodSugarFasting?: number;
  notes?: string;
}

export interface VitalRecordsResponse {
  count: number;
  records: VitalRecord[];
}

// Follow-up types
export interface CreateFollowupDto {
  clientId: number;
  screeningId?: number;
  followupDate: string;
  followupTime?: string;
  followupType: string;
  followupInstructions?: string;
  sendSmsReminder?: boolean;
  reminderDaysBefore?: number;
}

export interface FollowupAppointment extends Appointment {
  isFollowup: boolean;
  followupInstructions: string | null;
  sendSmsReminder: boolean;
  reminderDaysBefore: number;
  reminderScheduledDate: string | null;
  screeningId: number | null;
}

// Divider types (CHO Feature)
export type DividerStatus = 'active' | 'inactive';

export interface Divider {
  id: number;
  dividerCode: string;
  fullName: string;
  phone: string | null;
  address: string | null;
  lga: string | null;
  ward: string | null;
  community: string | null;
  notes: string | null;
  status: DividerStatus;
  facility: {
    id: number;
    name: string;
  } | null;
  capturedBy: {
    id: number;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// Volunteer types (CHO Feature)
export type VolunteerStatus = 'active' | 'inactive' | 'pending';
export type VolunteerGender = 'male' | 'female';

export interface Volunteer {
  id: number;
  volunteerCode: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  altPhone: string | null;
  email: string | null;
  gender: VolunteerGender;
  age: number | null;
  dateOfBirth: string | null;
  address: string | null;
  lga: string | null;
  ward: string | null;
  community: string | null;
  occupation: string | null;
  educationLevel: string | null;
  nextOfKin: string | null;
  nextOfKinPhone: string | null;
  skills: string | null;
  notes: string | null;
  status: VolunteerStatus;
  trainingCompleted: boolean;
  trainingDate: string | null;
  facility: {
    id: number;
    name: string;
  } | null;
  registeredBy: {
    id: number;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}
