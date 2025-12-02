import type {
  User,
  LoginResponse,
  RegisterDto,
  RegisterResponse,
  Patient,
  CreatePatientDto,
  CreatePatientResponse,
  Screening,
  CreateScreeningDto,
  UpdateVitalsDto,
  CompleteScreeningDto,
  DashboardStats,
  NotificationType,
  Facility,
  CreateFacilityDto,
  UpdateFacilityDto,
  Appointment,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  // Pathway screening types
  HypertensionScreeningData,
  CreateHypertensionScreeningDto,
  DiabetesScreeningData,
  CreateDiabetesScreeningDto,
  CervicalScreeningData,
  CreateCervicalScreeningDto,
  BreastScreeningData,
  CreateBreastScreeningDto,
  PsaScreeningData,
  CreatePsaScreeningDto,
  PathwayDataResponse,
  // User management types
  StaffUser,
  UserActionResponse,
  UserStatus,
  // Follow-up types
  CreateFollowupDto,
  FollowupAppointment,
  // Vital records types
  VitalRecord,
  CreateVitalRecordDto,
  VitalRecordsResponse,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
const ACTIVITY_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

class APIClient {
  private token: string | null = null;
  private lastActivityTime: number = Date.now();
  private activityCheckInterval: ReturnType<typeof setInterval> | null = null;
  private onSessionExpired: (() => void) | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
      this.lastActivityTime = parseInt(
        localStorage.getItem("lastActivityTime") || String(Date.now())
      );
      this.setupActivityTracking();
    }
  }

  // Set callback for session expiry
  setSessionExpiredCallback(callback: () => void): void {
    this.onSessionExpired = callback;
  }

  // Update activity timestamp
  private updateActivity(): void {
    this.lastActivityTime = Date.now();
    if (typeof window !== "undefined") {
      localStorage.setItem("lastActivityTime", String(this.lastActivityTime));
    }
  }

  // Setup activity tracking
  private setupActivityTracking(): void {
    if (typeof window === "undefined") return;

    // Track user activity
    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((event) => {
      window.addEventListener(event, () => this.updateActivity(), {
        passive: true,
      });
    });

    // Periodically check for session timeout
    this.activityCheckInterval = setInterval(() => {
      if (this.token && this.isSessionExpired()) {
        this.handleSessionExpired();
      }
    }, ACTIVITY_CHECK_INTERVAL_MS);
  }

  // Check if session has expired due to inactivity
  private isSessionExpired(): boolean {
    return Date.now() - this.lastActivityTime > SESSION_TIMEOUT_MS;
  }

  // Handle session expiration
  private handleSessionExpired(): void {
    this.clearToken();
    if (this.onSessionExpired) {
      this.onSessionExpired();
    } else if (typeof window !== "undefined") {
      // Default behavior: redirect to login
      window.location.href = "/?reason=session_expired";
    }
  }

  setToken(token: string): void {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
      // Reset activity time on login
      this.updateActivity();
    }
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("lastActivityTime");
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    skipAuth = false
  ): Promise<T> {
    // Update activity on each API request
    this.updateActivity();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token && !skipAuth) {
      (headers as Record<string, string>)[
        "Authorization"
      ] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle token expiration (401 Unauthorized)
      if (response.status === 401 && this.token) {
        this.handleSessionExpired();
        throw new Error("Session expired. Please log in again.");
      }
      throw new Error(data.message || "Request failed");
    }

    return data as T;
  }

  // Auth endpoints
  async register(data: RegisterDto): Promise<RegisterResponse> {
    const response = await this.request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    // If token is returned (admin registration), auto-login
    if (response.token) {
      this.setToken(response.token);
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(response.user));
      }
    }

    return response;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data.token) {
      this.setToken(data.token);
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
    }

    return data;
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  logout(): void {
    this.clearToken();
  }

  // Client/Patient endpoints
  async getClients(): Promise<Patient[]> {
    return this.request<Patient[]>("/clients");
  }

  async getClient(id: number): Promise<Patient> {
    return this.request<Patient>(`/clients/${id}`);
  }

  async createClient(data: CreatePatientDto): Promise<CreatePatientResponse> {
    return this.request("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Screening endpoints
  async getScreenings(status?: string): Promise<Screening[]> {
    const query = status ? `?status=${status}` : "";
    return this.request<Screening[]>(`/screenings${query}`);
  }

  async getScreening(id: number | string): Promise<Screening> {
    return this.request<Screening>(`/screenings/${id}`);
  }

  async getPatientScreenings(patientId: number): Promise<Screening[]> {
    return this.request<Screening[]>(`/screenings/patient/${patientId}`);
  }

  async getPendingDoctorReview(): Promise<Screening[]> {
    return this.request<Screening[]>("/screenings/doctor/pending");
  }

  async addDoctorAssessment(
    screeningId: number,
    data: {
      clinicalAssessment: string;
      recommendations?: string;
      prescription?: string;
      patientStatus?: "normal" | "abnormal" | "critical" | "requires_followup";
      referralFacility?: string;
      nextAppointment?: string;
    }
  ): Promise<{
    message: string;
    screening: {
      id: number;
      patientStatus: string;
      status: string;
      doctorAssessedAt: string;
    };
  }> {
    return this.request(`/screenings/${screeningId}/doctor-assessment`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async createScreening(
    data: CreateScreeningDto
  ): Promise<{
    message: string;
    session: { id: number; sessionId: string; status: string };
  }> {
    return this.request("/screenings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateVitals(
    id: number,
    data: UpdateVitalsDto
  ): Promise<{ message: string }> {
    return this.request(`/screenings/${id}/vitals`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async completeScreening(
    id: number,
    data: CompleteScreeningDto
  ): Promise<{ message: string }> {
    return this.request(`/screenings/${id}/complete`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>("/dashboard/stats");
  }

  // Reference data endpoints
  async getNotificationTypes(): Promise<NotificationType[]> {
    return this.request<NotificationType[]>("/notification-types");
  }

  // Public facilities endpoint (no auth required) - for registration page
  async getPublicFacilities(): Promise<Pick<Facility, "id" | "name">[]> {
    return this.request<Pick<Facility, "id" | "name">[]>(
      "/facilities/public",
      {},
      true
    );
  }

  async getFacilities(includeInactive?: boolean): Promise<Facility[]> {
    const query = includeInactive ? "?includeInactive=true" : "";
    return this.request<Facility[]>(`/facilities${query}`);
  }

  async getFacility(id: number): Promise<Facility> {
    return this.request<Facility>(`/facilities/${id}`);
  }

  async createFacility(
    data: CreateFacilityDto
  ): Promise<{ message: string; facility: Facility }> {
    return this.request("/facilities", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateFacility(
    id: number,
    data: UpdateFacilityDto
  ): Promise<{ message: string }> {
    return this.request(`/facilities/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async activateFacility(id: number): Promise<{ message: string }> {
    return this.request(`/facilities/${id}/activate`, {
      method: "PUT",
    });
  }

  async deactivateFacility(id: number): Promise<{ message: string }> {
    return this.request(`/facilities/${id}/deactivate`, {
      method: "PUT",
    });
  }

  // Appointment endpoints
  async getAppointments(
    status?: string,
    date?: string
  ): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (date) params.append("date", date);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<Appointment[]>(`/appointments${query}`);
  }

  async getUpcomingAppointments(days?: number): Promise<Appointment[]> {
    const query = days ? `?days=${days}` : "";
    return this.request<Appointment[]>(`/appointments/upcoming${query}`);
  }

  async getAppointment(id: number): Promise<Appointment> {
    return this.request<Appointment>(`/appointments/${id}`);
  }

  async getPatientAppointments(patientId: number): Promise<Appointment[]> {
    return this.request<Appointment[]>(`/appointments/patient/${patientId}`);
  }

  async createAppointment(
    data: CreateAppointmentDto
  ): Promise<{ message: string; appointment: Appointment }> {
    return this.request("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAppointment(
    id: number,
    data: UpdateAppointmentDto
  ): Promise<{ message: string }> {
    return this.request(`/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async cancelAppointment(id: number): Promise<{ message: string }> {
    return this.request(`/appointments/${id}/cancel`, {
      method: "PUT",
    });
  }

  async completeAppointment(id: number): Promise<{ message: string }> {
    return this.request(`/appointments/${id}/complete`, {
      method: "PUT",
    });
  }

  async markAppointmentNoShow(id: number): Promise<{ message: string }> {
    return this.request(`/appointments/${id}/no-show`, {
      method: "PUT",
    });
  }

  // ==================== FOLLOW-UP APPOINTMENT ENDPOINTS ====================

  async createFollowup(
    data: CreateFollowupDto
  ): Promise<{ message: string; appointment: FollowupAppointment }> {
    return this.request("/appointments/followup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getFollowupsByPatient(
    patientId: number
  ): Promise<FollowupAppointment[]> {
    return this.request<FollowupAppointment[]>(
      `/appointments/followups/patient/${patientId}`
    );
  }

  // ==================== PATHWAY SCREENING ENDPOINTS ====================

  // Get pathway-specific data for a screening
  async getPathwayData(screeningId: number): Promise<PathwayDataResponse> {
    return this.request<PathwayDataResponse>(
      `/screenings/${screeningId}/pathway-data`
    );
  }

  // Hypertension Screening
  async getHypertensionScreening(
    screeningId: number
  ): Promise<HypertensionScreeningData | null> {
    return this.request<HypertensionScreeningData | null>(
      `/screenings/${screeningId}/hypertension`
    );
  }

  async createHypertensionScreening(
    screeningId: number,
    data: CreateHypertensionScreeningDto
  ): Promise<{
    message: string;
    data: {
      id: number;
      screeningResult: string;
      averageBp: string;
      referToDoctor: boolean;
    };
  }> {
    return this.request(`/screenings/${screeningId}/hypertension`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateHypertensionScreening(
    screeningId: number,
    data: Partial<CreateHypertensionScreeningDto>
  ): Promise<{ message: string }> {
    return this.request(`/screenings/${screeningId}/hypertension`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Diabetes Screening
  async getDiabetesScreening(
    screeningId: number
  ): Promise<DiabetesScreeningData | null> {
    return this.request<DiabetesScreeningData | null>(
      `/screenings/${screeningId}/diabetes`
    );
  }

  async createDiabetesScreening(
    screeningId: number,
    data: CreateDiabetesScreeningDto
  ): Promise<{
    message: string;
    data: {
      id: number;
      screeningResult: string;
      bloodSugarLevel: number;
      referToDoctor: boolean;
    };
  }> {
    return this.request(`/screenings/${screeningId}/diabetes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateDiabetesScreening(
    screeningId: number,
    data: Partial<CreateDiabetesScreeningDto>
  ): Promise<{ message: string }> {
    return this.request(`/screenings/${screeningId}/diabetes`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Cervical Cancer Screening
  async getCervicalScreening(
    screeningId: number
  ): Promise<CervicalScreeningData | null> {
    return this.request<CervicalScreeningData | null>(
      `/screenings/${screeningId}/cervical`
    );
  }

  async createCervicalScreening(
    screeningId: number,
    data: CreateCervicalScreeningDto
  ): Promise<{
    message: string;
    data: { id: number; screeningResult: string; followUpRequired: boolean };
  }> {
    return this.request(`/screenings/${screeningId}/cervical`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCervicalScreening(
    screeningId: number,
    data: Partial<CreateCervicalScreeningDto>
  ): Promise<{ message: string }> {
    return this.request(`/screenings/${screeningId}/cervical`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Breast Cancer Screening
  async getBreastScreening(
    screeningId: number
  ): Promise<BreastScreeningData | null> {
    return this.request<BreastScreeningData | null>(
      `/screenings/${screeningId}/breast`
    );
  }

  async createBreastScreening(
    screeningId: number,
    data: CreateBreastScreeningDto
  ): Promise<{
    message: string;
    data: { id: number; riskAssessment: string; referralRequired: boolean };
  }> {
    return this.request(`/screenings/${screeningId}/breast`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateBreastScreening(
    screeningId: number,
    data: Partial<CreateBreastScreeningDto>
  ): Promise<{ message: string }> {
    return this.request(`/screenings/${screeningId}/breast`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // PSA Screening
  async getPsaScreening(screeningId: number): Promise<PsaScreeningData | null> {
    return this.request<PsaScreeningData | null>(
      `/screenings/${screeningId}/psa`
    );
  }

  async createPsaScreening(
    screeningId: number,
    data: CreatePsaScreeningDto
  ): Promise<{
    message: string;
    data: {
      id: number;
      screeningResult: string;
      psaLevel: number;
      referToDoctor: boolean;
    };
  }> {
    return this.request(`/screenings/${screeningId}/psa`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePsaScreening(
    screeningId: number,
    data: Partial<CreatePsaScreeningDto>
  ): Promise<{ message: string }> {
    return this.request(`/screenings/${screeningId}/psa`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ==================== USER MANAGEMENT ENDPOINTS ====================

  async getUsers(status?: UserStatus): Promise<StaffUser[]> {
    const query = status ? `?status=${status}` : "";
    return this.request<StaffUser[]>(`/users${query}`);
  }

  async getPendingUsers(): Promise<StaffUser[]> {
    return this.request<StaffUser[]>("/users/pending");
  }

  async getUser(id: number): Promise<StaffUser> {
    return this.request<StaffUser>(`/users/${id}`);
  }

  async approveUser(id: number): Promise<UserActionResponse> {
    return this.request<UserActionResponse>(`/users/${id}/approve`, {
      method: "PUT",
    });
  }

  async rejectUser(id: number): Promise<UserActionResponse> {
    return this.request<UserActionResponse>(`/users/${id}/reject`, {
      method: "PUT",
    });
  }

  async suspendUser(id: number): Promise<UserActionResponse> {
    return this.request<UserActionResponse>(`/users/${id}/suspend`, {
      method: "PUT",
    });
  }

  async reactivateUser(id: number): Promise<UserActionResponse> {
    return this.request<UserActionResponse>(`/users/${id}/reactivate`, {
      method: "PUT",
    });
  }

  // ==================== SMS NOTIFICATION ENDPOINTS ====================

  async sendManualSms(
    patientId: number,
    message: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request("/sms/send", {
      method: "POST",
      body: JSON.stringify({ patientId, message }),
    });
  }

  async sendScreeningSms(
    screeningId: number
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/sms/screening/${screeningId}`, {
      method: "POST",
    });
  }

  async sendFollowupSms(
    appointmentId: number
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/sms/followup/${appointmentId}`, {
      method: "POST",
    });
  }

  async sendReminderSms(
    appointmentId: number
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/sms/reminder/${appointmentId}`, {
      method: "POST",
    });
  }

  async getPatientSmsHistory(patientId: number): Promise<{
    count: number;
    data: Array<{
      id: number;
      phoneNumber: string;
      message: string;
      type: string;
      status: string;
      sentAt: string | null;
      createdAt: string;
      sentBy: { id: number; name: string } | null;
    }>;
  }> {
    return this.request(`/sms/patient/${patientId}`);
  }

  async getSmsLogs(filters?: {
    status?: string;
    type?: string;
    limit?: number;
  }): Promise<{
    count: number;
    data: Array<{
      id: number;
      patientId: number;
      patientName: string | null;
      phoneNumber: string;
      message: string;
      type: string;
      status: string;
      sentAt: string | null;
      createdAt: string;
      sentBy: { id: number; name: string } | null;
      errorMessage: string | null;
    }>;
  }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.limit) params.append("limit", String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/sms/logs${query}`);
  }

  async getSmsStats(): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    byType: Record<string, number>;
  }> {
    return this.request("/sms/stats");
  }

  async processReminders(): Promise<{
    message: string;
    processed: number;
    sent: number;
    failed: number;
  }> {
    return this.request("/sms/process-reminders", {
      method: "POST",
    });
  }

  // ==================== VITAL RECORDS ENDPOINTS ====================

  async createVitalRecord(
    data: CreateVitalRecordDto
  ): Promise<{ message: string; vitalRecord: VitalRecord }> {
    return this.request("/vitals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getPatientVitals(patientId: number): Promise<VitalRecordsResponse> {
    return this.request<VitalRecordsResponse>(`/vitals/patient/${patientId}`);
  }

  async getLatestPatientVitals(
    patientId: number
  ): Promise<{ record: VitalRecord | null }> {
    return this.request(`/vitals/patient/${patientId}/latest`);
  }

  async getScreeningVitals(screeningId: number): Promise<VitalRecordsResponse> {
    return this.request<VitalRecordsResponse>(
      `/vitals/screening/${screeningId}`
    );
  }

  async getLatestScreeningVitals(
    screeningId: number
  ): Promise<{ record: VitalRecord | null }> {
    return this.request(`/vitals/screening/${screeningId}/latest`);
  }

  async getVitalRecord(id: number): Promise<{ record: VitalRecord }> {
    return this.request(`/vitals/${id}`);
  }
}

// Create singleton instance
export const api = new APIClient();

export default api;
