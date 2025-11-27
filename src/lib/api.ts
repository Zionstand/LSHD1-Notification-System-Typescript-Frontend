import type {
  User,
  LoginResponse,
  RegisterDto,
  RegisterResponse,
  Patient,
  CreatePatientDto,
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
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class APIClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data as T;
  }

  // Auth endpoints
  async register(data: RegisterDto): Promise<RegisterResponse> {
    const response = await this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // If token is returned (admin registration), auto-login
    if (response.token) {
      this.setToken(response.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    }

    return response;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.token) {
      this.setToken(data.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }

    return data;
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  logout(): void {
    this.clearToken();
  }

  // Client/Patient endpoints
  async getClients(): Promise<Patient[]> {
    return this.request<Patient[]>('/clients');
  }

  async getClient(id: number): Promise<Patient> {
    return this.request<Patient>(`/clients/${id}`);
  }

  async createClient(data: CreatePatientDto): Promise<{ message: string; client: Patient }> {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Screening endpoints
  async getScreenings(status?: string): Promise<Screening[]> {
    const query = status ? `?status=${status}` : '';
    return this.request<Screening[]>(`/screenings${query}`);
  }

  async getScreening(id: number | string): Promise<Screening> {
    return this.request<Screening>(`/screenings/${id}`);
  }

  async createScreening(data: CreateScreeningDto): Promise<{ message: string; session: { id: number; sessionId: string; status: string } }> {
    return this.request('/screenings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVitals(id: number, data: UpdateVitalsDto): Promise<{ message: string }> {
    return this.request(`/screenings/${id}/vitals`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async completeScreening(id: number, data: CompleteScreeningDto): Promise<{ message: string }> {
    return this.request(`/screenings/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  // Reference data endpoints
  async getNotificationTypes(): Promise<NotificationType[]> {
    return this.request<NotificationType[]>('/notification-types');
  }

  async getFacilities(includeInactive?: boolean): Promise<Facility[]> {
    const query = includeInactive ? '?includeInactive=true' : '';
    return this.request<Facility[]>(`/facilities${query}`);
  }

  async getFacility(id: number): Promise<Facility> {
    return this.request<Facility>(`/facilities/${id}`);
  }

  async createFacility(data: CreateFacilityDto): Promise<{ message: string; facility: Facility }> {
    return this.request('/facilities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFacility(id: number, data: UpdateFacilityDto): Promise<{ message: string }> {
    return this.request(`/facilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async activateFacility(id: number): Promise<{ message: string }> {
    return this.request(`/facilities/${id}/activate`, {
      method: 'PUT',
    });
  }

  async deactivateFacility(id: number): Promise<{ message: string }> {
    return this.request(`/facilities/${id}/deactivate`, {
      method: 'PUT',
    });
  }

  // Appointment endpoints
  async getAppointments(status?: string, date?: string): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (date) params.append('date', date);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Appointment[]>(`/appointments${query}`);
  }

  async getUpcomingAppointments(days?: number): Promise<Appointment[]> {
    const query = days ? `?days=${days}` : '';
    return this.request<Appointment[]>(`/appointments/upcoming${query}`);
  }

  async getAppointment(id: number): Promise<Appointment> {
    return this.request<Appointment>(`/appointments/${id}`);
  }

  async getPatientAppointments(patientId: number): Promise<Appointment[]> {
    return this.request<Appointment[]>(`/appointments/patient/${patientId}`);
  }

  async createAppointment(data: CreateAppointmentDto): Promise<{ message: string; appointment: Appointment }> {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAppointment(id: number, data: UpdateAppointmentDto): Promise<{ message: string }> {
    return this.request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async cancelAppointment(id: number): Promise<{ message: string }> {
    return this.request(`/appointments/${id}/cancel`, {
      method: 'PUT',
    });
  }

  async completeAppointment(id: number): Promise<{ message: string }> {
    return this.request(`/appointments/${id}/complete`, {
      method: 'PUT',
    });
  }

  async markAppointmentNoShow(id: number): Promise<{ message: string }> {
    return this.request(`/appointments/${id}/no-show`, {
      method: 'PUT',
    });
  }

  // ==================== PATHWAY SCREENING ENDPOINTS ====================

  // Get pathway-specific data for a screening
  async getPathwayData(screeningId: number): Promise<PathwayDataResponse> {
    return this.request<PathwayDataResponse>(`/screenings/${screeningId}/pathway-data`);
  }

  // Hypertension Screening
  async getHypertensionScreening(screeningId: number): Promise<HypertensionScreeningData | null> {
    return this.request<HypertensionScreeningData | null>(`/screenings/${screeningId}/hypertension`);
  }

  async createHypertensionScreening(screeningId: number, data: CreateHypertensionScreeningDto): Promise<{ message: string; data: { id: number; screeningResult: string; averageBp: string; referToDoctor: boolean } }> {
    return this.request(`/screenings/${screeningId}/hypertension`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateHypertensionScreening(screeningId: number, data: Partial<CreateHypertensionScreeningDto>): Promise<{ message: string }> {
    return this.request(`/screenings/${screeningId}/hypertension`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Diabetes Screening
  async getDiabetesScreening(screeningId: number): Promise<DiabetesScreeningData | null> {
    return this.request<DiabetesScreeningData | null>(`/screenings/${screeningId}/diabetes`);
  }

  async createDiabetesScreening(screeningId: number, data: CreateDiabetesScreeningDto): Promise<{ message: string; data: { id: number; screeningResult: string; bloodSugarLevel: number; referToDoctor: boolean } }> {
    return this.request(`/screenings/${screeningId}/diabetes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDiabetesScreening(screeningId: number, data: Partial<CreateDiabetesScreeningDto>): Promise<{ message: string }> {
    return this.request(`/screenings/${screeningId}/diabetes`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Cervical Cancer Screening
  async getCervicalScreening(screeningId: number): Promise<CervicalScreeningData | null> {
    return this.request<CervicalScreeningData | null>(`/screenings/${screeningId}/cervical`);
  }

  async createCervicalScreening(screeningId: number, data: CreateCervicalScreeningDto): Promise<{ message: string; data: { id: number; screeningResult: string; followUpRequired: boolean } }> {
    return this.request(`/screenings/${screeningId}/cervical`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCervicalScreening(screeningId: number, data: Partial<CreateCervicalScreeningDto>): Promise<{ message: string }> {
    return this.request(`/screenings/${screeningId}/cervical`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Breast Cancer Screening
  async getBreastScreening(screeningId: number): Promise<BreastScreeningData | null> {
    return this.request<BreastScreeningData | null>(`/screenings/${screeningId}/breast`);
  }

  async createBreastScreening(screeningId: number, data: CreateBreastScreeningDto): Promise<{ message: string; data: { id: number; riskAssessment: string; referralRequired: boolean } }> {
    return this.request(`/screenings/${screeningId}/breast`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBreastScreening(screeningId: number, data: Partial<CreateBreastScreeningDto>): Promise<{ message: string }> {
    return this.request(`/screenings/${screeningId}/breast`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PSA Screening
  async getPsaScreening(screeningId: number): Promise<PsaScreeningData | null> {
    return this.request<PsaScreeningData | null>(`/screenings/${screeningId}/psa`);
  }

  async createPsaScreening(screeningId: number, data: CreatePsaScreeningDto): Promise<{ message: string; data: { id: number; screeningResult: string; psaLevel: number; referToDoctor: boolean } }> {
    return this.request(`/screenings/${screeningId}/psa`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePsaScreening(screeningId: number, data: Partial<CreatePsaScreeningDto>): Promise<{ message: string }> {
    return this.request(`/screenings/${screeningId}/psa`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

// Create singleton instance
export const api = new APIClient();

export default api;
