"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  hasPermission,
  isClinicalRole,
  getRoleDisplayName,
  getRoleColor,
  getScreeningActions,
  type Permission,
} from "@/lib/permissions";
import type {
  User,
  Screening,
  Patient,
  NotificationType,
  Facility,
  UpdateVitalsDto,
  CreatePatientDto,
  CreateDiabetesScreeningDto,
  CreatePsaScreeningDto,
  CreateHypertensionScreeningDto,
  CreateCervicalScreeningDto,
  DiabetesTestType,
  CervicalScreeningMethod,
  CervicalResult,
  UserRoleType,
} from "@/types";
import { LOGO } from "@/constants";

// ==================== INTERFACES ====================

interface DashboardStats {
  totalPatients: number;
  pendingScreenings: number;
  inProgressScreenings: number;
  completedToday: number;
  pendingVitals: number;
  pendingAssessment: number;
}

interface VitalsForm extends UpdateVitalsDto {
  height?: number;
  respiratoryRate?: number;
  bloodSugarRandom?: number;
  bloodSugarFasting?: number;
  notes?: string;
}

interface AssessmentForm {
  clinicalAssessment: string;
  recommendations: string;
  prescription: string;
  patientStatus: "normal" | "abnormal" | "critical" | "requires_followup";
  referralFacility: string;
  nextAppointment: string;
}

interface DiabetesForm {
  testType: DiabetesTestType;
  bloodSugarLevel: number | undefined;
  fastingDurationHours?: number;
  testTime: string;
  clinicalObservations?: string;
  referToDoctor: boolean;
  referralReason?: string;
}

interface PsaForm {
  psaLevel: number | undefined;
  testMethod?: string;
  testKit?: string;
  collectionTime: string;
  sampleQuality: string;
  sampleQualityNotes?: string;
  patientAge: number | undefined;
  normalRangeMax: number;
  resultInterpretation?: string;
  clinicalObservations?: string;
  referToDoctor: boolean;
  referralReason?: string;
}

interface HypertensionForm {
  systolicBp1: number;
  diastolicBp1: number;
  position1: "sitting" | "standing" | "lying";
  armUsed1: "left" | "right";
  systolicBp2?: number;
  diastolicBp2?: number;
  position2?: "sitting" | "standing" | "lying";
  armUsed2?: "left" | "right";
  clinicalObservations?: string;
  recommendations?: string;
  referToDoctor: boolean;
  referralReason?: string;
}

interface CervicalForm {
  screeningPerformed: boolean;
  screeningMethod: CervicalScreeningMethod;
  otherMethodDetails?: string;
  visualInspectionFindings?: string;
  specimenCollected: boolean;
  specimenType?: string;
  screeningResult: CervicalResult;
  clinicalObservations?: string;
  remarks?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
}

// ==================== INITIAL FORMS ====================

const initialVitalsForm: VitalsForm = {
  systolicBp: 0,
  diastolicBp: 0,
  weight: undefined,
  pulseRate: undefined,
  temperature: undefined,
  height: undefined,
  respiratoryRate: undefined,
  bloodSugarRandom: undefined,
  bloodSugarFasting: undefined,
  notes: "",
};

const initialAssessmentForm: AssessmentForm = {
  clinicalAssessment: "",
  recommendations: "",
  prescription: "",
  patientStatus: "normal",
  referralFacility: "",
  nextAppointment: "",
};

const initialDiabetesForm: DiabetesForm = {
  testType: "random",
  bloodSugarLevel: undefined,
  fastingDurationHours: undefined,
  testTime: new Date().toTimeString().slice(0, 5),
  clinicalObservations: "",
  referToDoctor: false,
  referralReason: "",
};

const initialPsaForm: PsaForm = {
  psaLevel: undefined,
  testMethod: "immunoassay",
  testKit: "",
  collectionTime: new Date().toTimeString().slice(0, 5),
  sampleQuality: "good",
  sampleQualityNotes: "",
  patientAge: undefined,
  normalRangeMax: 4.0,
  resultInterpretation: "",
  clinicalObservations: "",
  referToDoctor: false,
  referralReason: "",
};

const initialHypertensionForm: HypertensionForm = {
  systolicBp1: 0,
  diastolicBp1: 0,
  position1: "sitting",
  armUsed1: "left",
  clinicalObservations: "",
  recommendations: "",
  referToDoctor: false,
  referralReason: "",
};

const initialCervicalForm: CervicalForm = {
  screeningPerformed: true,
  screeningMethod: "via",
  otherMethodDetails: "",
  visualInspectionFindings: "",
  specimenCollected: false,
  specimenType: "",
  screeningResult: "negative",
  clinicalObservations: "",
  remarks: "",
  followUpRequired: false,
  followUpDate: "",
  followUpNotes: "",
};

const initialClientForm: CreatePatientDto = {
  fullName: "",
  phone: "",
  age: 0,
  gender: "Male",
  phcCenterId: 0,
  address: "",
  screeningTypeId: 0,
  nextOfKin: "",
  nextOfKinPhone: "",
};

const SCREENING_TYPES = [
  {
    id: 2,
    name: "Diabetes Screening",
    description: "Blood sugar testing",
    gender: "all" as const,
  },
  {
    id: 1,
    name: "Hypertension Screening",
    description: "Blood pressure monitoring",
    gender: "all" as const,
  },
  {
    id: 3,
    name: "Cervical Cancer Screening",
    description: "Pap smear/HPV test (Women 25-65)",
    gender: "female" as const,
  },
  {
    id: 4,
    name: "Breast Cancer Screening",
    description: "Clinical examination (Women 20+)",
    gender: "female" as const,
  },
  {
    id: 5,
    name: "Prostate Cancer Screening",
    description: "PSA test (Men 45+)",
    gender: "male" as const,
  },
];

// ==================== MAIN COMPONENT ====================

export default function ClinicalDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRoleType | undefined>(undefined);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    pendingScreenings: 0,
    inProgressScreenings: 0,
    completedToday: 0,
    pendingVitals: 0,
    pendingAssessment: 0,
  });
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [clients, setClients] = useState<Patient[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [notificationTypes, setNotificationTypes] = useState<
    NotificationType[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "in_progress" | "completed" | "follow_up"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [selectedScreening, setSelectedScreening] = useState<Screening | null>(
    null
  );
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Form states
  const [vitalsForm, setVitalsForm] = useState<VitalsForm>(initialVitalsForm);
  const [assessmentForm, setAssessmentForm] = useState<AssessmentForm>(
    initialAssessmentForm
  );
  const [diabetesForm, setDiabetesForm] =
    useState<DiabetesForm>(initialDiabetesForm);
  const [psaForm, setPsaForm] = useState<PsaForm>(initialPsaForm);
  const [hypertensionForm, setHypertensionForm] = useState<HypertensionForm>(
    initialHypertensionForm
  );
  const [cervicalForm, setCervicalForm] =
    useState<CervicalForm>(initialCervicalForm);
  const [newClient, setNewClient] =
    useState<CreatePatientDto>(initialClientForm);

  // UI states
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<{
    clientId: string;
    screeningId: string;
  } | null>(null);

  // Routing modal state
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Patient | null>(null);
  const [selectedNotificationType, setSelectedNotificationType] =
    useState<string>("");

  // ==================== EFFECTS ====================

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setUserRole(parsedUser.role?.id as UserRoleType);

    // Only allow clinical roles (redirect admin to main dashboard)
    if (parsedUser.role?.id === "admin") {
      router.push("/dashboard");
      return;
    }

    // Redirect non-clinical roles
    if (!isClinicalRole(parsedUser.role?.id)) {
      router.push("/");
      return;
    }

    // Set default facility for new clients
    if (parsedUser.facility?.id) {
      setNewClient((prev) => ({
        ...prev,
        phcCenterId: parsedUser.facility.id,
      }));
    }

    fetchData();
  }, [router]);

  // ==================== DATA FETCHING ====================

  const fetchData = async () => {
    try {
      const [
        screeningsData,
        clientsData,
        typesData,
        facilitiesData,
        dashboardStats,
      ] = await Promise.all([
        api.getScreenings(),
        api.getClients(),
        api.getNotificationTypes(),
        api.getFacilities(),
        api.getDashboardStats(),
      ]);

      setScreenings(screeningsData);
      setClients(clientsData);
      setNotificationTypes(typesData);
      setFacilities(facilitiesData);

      // Calculate stats
      const today = new Date().toDateString();
      const todayScreenings = screeningsData.filter(
        (s) => new Date(s.createdAt).toDateString() === today
      );

      // Pending vitals = pending status screenings
      const pendingVitals = screeningsData.filter(
        (s) => s.status === "pending"
      ).length;

      // Pending assessment = in_progress with vitals recorded
      const pendingAssessment = screeningsData.filter(
        (s) => s.status === "in_progress" && s.vitals?.bloodPressureSystolic
      ).length;

      setStats({
        totalPatients: dashboardStats.totalClients,
        pendingScreenings: screeningsData.filter((s) => s.status === "pending")
          .length,
        inProgressScreenings: screeningsData.filter(
          (s) => s.status === "in_progress"
        ).length,
        completedToday: todayScreenings.filter((s) => s.status === "completed")
          .length,
        pendingVitals,
        pendingAssessment,
      });
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  };

  // ==================== HANDLERS ====================

  const handleLogout = () => {
    api.logout();
    router.push("/");
  };

  const openModal = (modalType: string, screening: Screening) => {
    setSelectedScreening(screening);
    setFormError(null);
    setFormSuccess(false);

    // Pre-fill forms based on modal type
    if (modalType === "vitals") {
      setVitalsForm({
        systolicBp: screening.vitals?.bloodPressureSystolic || 0,
        diastolicBp: screening.vitals?.bloodPressureDiastolic || 0,
        weight: screening.vitals?.weight || undefined,
        pulseRate: screening.vitals?.pulseRate || undefined,
        temperature: screening.vitals?.temperature || undefined,
        height: screening.vitals?.height || undefined,
        respiratoryRate: screening.vitals?.respiratoryRate || undefined,
      });
    } else if (modalType === "assessment") {
      setAssessmentForm(initialAssessmentForm);
    } else if (modalType === "diabetes") {
      setDiabetesForm(initialDiabetesForm);
    } else if (modalType === "psa") {
      setPsaForm({
        ...initialPsaForm,
        patientAge: screening.client ? undefined : undefined, // Would need age from client
      });
    } else if (modalType === "hypertension") {
      setHypertensionForm(initialHypertensionForm);
    } else if (modalType === "cervical") {
      setCervicalForm(initialCervicalForm);
    }

    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedScreening(null);
    setFormError(null);
    setFormSuccess(false);
  };

  // Vitals submission - now creates a new vital record (allows multiple recordings)
  const handleRecordVitals = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScreening) return;

    if (!vitalsForm.systolicBp || !vitalsForm.diastolicBp) {
      setFormError("Systolic and Diastolic blood pressure are required");
      return;
    }

    setFormError(null);
    setFormLoading(true);

    try {
      // Create a new vital record (allows multiple recordings per screening)
      await api.createVitalRecord({
        patientId: selectedScreening.client.id,
        screeningId: selectedScreening.id,
        systolicBp: vitalsForm.systolicBp,
        diastolicBp: vitalsForm.diastolicBp,
        weight: vitalsForm.weight,
        pulseRate: vitalsForm.pulseRate,
        temperature: vitalsForm.temperature,
        height: vitalsForm.height,
        respiratoryRate: vitalsForm.respiratoryRate,
        bloodSugarRandom: vitalsForm.bloodSugarRandom,
        bloodSugarFasting: vitalsForm.bloodSugarFasting,
        notes: vitalsForm.notes || undefined,
      });

      setFormSuccess(true);
      fetchData();

      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to record vitals";
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // Assessment submission
  const handleSaveAssessment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScreening) return;

    if (!assessmentForm.clinicalAssessment.trim()) {
      setFormError("Clinical assessment is required");
      return;
    }

    setFormError(null);
    setFormLoading(true);

    try {
      await api.addDoctorAssessment(selectedScreening.id, {
        clinicalAssessment: assessmentForm.clinicalAssessment,
        recommendations: assessmentForm.recommendations || undefined,
        prescription: assessmentForm.prescription || undefined,
        patientStatus: assessmentForm.patientStatus,
        referralFacility: assessmentForm.referralFacility || undefined,
        nextAppointment: assessmentForm.nextAppointment || undefined,
      });

      setFormSuccess(true);
      fetchData();

      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save assessment";
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // Diabetes screening submission
  const handleDiabetesScreening = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScreening) return;

    if (!diabetesForm.bloodSugarLevel) {
      setFormError("Blood sugar level is required");
      return;
    }

    setFormError(null);
    setFormLoading(true);

    try {
      const data: CreateDiabetesScreeningDto = {
        testType: diabetesForm.testType,
        bloodSugarLevel: diabetesForm.bloodSugarLevel,
        testTime: diabetesForm.testTime,
        fastingDurationHours:
          diabetesForm.testType === "fasting"
            ? diabetesForm.fastingDurationHours
            : undefined,
        clinicalObservations: diabetesForm.clinicalObservations,
        referToDoctor: diabetesForm.referToDoctor,
        referralReason: diabetesForm.referToDoctor
          ? diabetesForm.referralReason
          : undefined,
      };

      await api.createDiabetesScreening(selectedScreening.id, data);
      setFormSuccess(true);
      fetchData();

      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to record diabetes screening";
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // PSA screening submission
  const handlePsaScreening = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScreening) return;

    if (!psaForm.psaLevel) {
      setFormError("PSA level is required");
      return;
    }

    if (!psaForm.patientAge) {
      setFormError("Patient age is required");
      return;
    }

    setFormError(null);
    setFormLoading(true);

    try {
      const data: CreatePsaScreeningDto = {
        psaLevel: psaForm.psaLevel,
        testMethod: psaForm.testMethod,
        testKit: psaForm.testKit,
        collectionTime: psaForm.collectionTime,
        sampleQuality: psaForm.sampleQuality,
        sampleQualityNotes: psaForm.sampleQualityNotes,
        patientAge: psaForm.patientAge,
        normalRangeMax: psaForm.normalRangeMax,
        resultInterpretation: psaForm.resultInterpretation,
        clinicalObservations: psaForm.clinicalObservations,
        referToDoctor: psaForm.referToDoctor,
        referralReason: psaForm.referToDoctor
          ? psaForm.referralReason
          : undefined,
      };

      await api.createPsaScreening(selectedScreening.id, data);
      setFormSuccess(true);
      fetchData();

      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to record PSA screening";
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // Hypertension screening submission
  const handleHypertensionScreening = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScreening) return;

    if (!hypertensionForm.systolicBp1 || !hypertensionForm.diastolicBp1) {
      setFormError("First BP reading is required");
      return;
    }

    setFormError(null);
    setFormLoading(true);

    try {
      const data: CreateHypertensionScreeningDto = {
        systolicBp1: hypertensionForm.systolicBp1,
        diastolicBp1: hypertensionForm.diastolicBp1,
        position1: hypertensionForm.position1,
        armUsed1: hypertensionForm.armUsed1,
        systolicBp2: hypertensionForm.systolicBp2,
        diastolicBp2: hypertensionForm.diastolicBp2,
        position2: hypertensionForm.position2,
        armUsed2: hypertensionForm.armUsed2,
        clinicalObservations: hypertensionForm.clinicalObservations,
        recommendations: hypertensionForm.recommendations,
        referToDoctor: hypertensionForm.referToDoctor,
        referralReason: hypertensionForm.referToDoctor
          ? hypertensionForm.referralReason
          : undefined,
      };

      await api.createHypertensionScreening(selectedScreening.id, data);
      setFormSuccess(true);
      fetchData();

      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to record hypertension screening";
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // Cervical screening submission
  const handleCervicalScreening = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScreening) return;

    if (!cervicalForm.screeningMethod) {
      setFormError("Screening method is required");
      return;
    }

    setFormError(null);
    setFormLoading(true);

    try {
      const data: CreateCervicalScreeningDto = {
        screeningPerformed: cervicalForm.screeningPerformed,
        screeningMethod: cervicalForm.screeningMethod,
        otherMethodDetails:
          cervicalForm.screeningMethod === "other"
            ? cervicalForm.otherMethodDetails
            : undefined,
        visualInspectionFindings: cervicalForm.visualInspectionFindings,
        specimenCollected: cervicalForm.specimenCollected,
        specimenType: cervicalForm.specimenCollected
          ? cervicalForm.specimenType
          : undefined,
        screeningResult: cervicalForm.screeningResult,
        clinicalObservations: cervicalForm.clinicalObservations,
        remarks: cervicalForm.remarks,
        followUpRequired: cervicalForm.followUpRequired,
        followUpDate: cervicalForm.followUpRequired
          ? cervicalForm.followUpDate
          : undefined,
        followUpNotes: cervicalForm.followUpRequired
          ? cervicalForm.followUpNotes
          : undefined,
      };

      await api.createCervicalScreening(selectedScreening.id, data);
      setFormSuccess(true);
      fetchData();

      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to record cervical screening";
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // Client registration
  const handleCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      const response = await api.createClient(newClient);
      setRegistrationSuccess({
        clientId: response.client.client_id,
        screeningId: response.screening.sessionId,
      });
      const currentPhcCenterId = newClient.phcCenterId;
      setNewClient({ ...initialClientForm, phcCenterId: currentPhcCenterId });
      fetchData();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to register client";
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // Route existing client
  const handleRouteClient = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedNotificationType) return;

    setFormError(null);
    setFormLoading(true);
    try {
      await api.createScreening({
        clientId: selectedClient.id,
        notificationTypeId: parseInt(selectedNotificationType),
      });
      setShowRoutingModal(false);
      setSelectedClient(null);
      setSelectedNotificationType("");
      fetchData();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to route client";
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  // ==================== UTILITY FUNCTIONS ====================

  const getBpCategory = (
    systolic: number,
    diastolic: number
  ): { label: string; color: string } => {
    if (systolic < 120 && diastolic < 80) {
      return { label: "Normal", color: "text-green-600" };
    } else if (systolic < 130 && diastolic < 80) {
      return { label: "Elevated", color: "text-yellow-600" };
    } else if (systolic < 140 || diastolic < 90) {
      return { label: "High (Stage 1)", color: "text-orange-600" };
    } else if (systolic >= 140 || diastolic >= 90) {
      return { label: "High (Stage 2)", color: "text-red-600" };
    } else if (systolic > 180 || diastolic > 120) {
      return { label: "Crisis", color: "text-red-800 font-bold" };
    }
    return { label: "Unknown", color: "text-gray-600" };
  };

  const getBloodSugarCategory = (
    value: number,
    isFasting: boolean
  ): { label: string; color: string } => {
    if (isFasting) {
      if (value < 100) return { label: "Normal", color: "text-green-600" };
      if (value < 126)
        return { label: "Prediabetes", color: "text-yellow-600" };
      return { label: "Diabetes", color: "text-red-600" };
    } else {
      if (value < 140) return { label: "Normal", color: "text-green-600" };
      if (value < 200)
        return { label: "Prediabetes", color: "text-yellow-600" };
      return { label: "Diabetes", color: "text-red-600" };
    }
  };

  const getPsaCategory = (value: number): { label: string; color: string } => {
    if (value < 4) return { label: "Normal", color: "text-green-600" };
    if (value < 10)
      return { label: "Slightly Elevated", color: "text-yellow-600" };
    return { label: "Elevated", color: "text-red-600" };
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "follow_up":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Filter screenings based on tab and search
  const filteredScreenings = screenings.filter((s) => {
    // Tab filter
    if (activeTab !== "all" && s.status !== activeTab) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const clientName =
        `${s.client?.firstName} ${s.client?.lastName}`.toLowerCase();
      const clientId = s.client?.clientId?.toLowerCase() || "";
      const sessionId = s.sessionId?.toLowerCase() || "";
      return (
        clientName.includes(query) ||
        clientId.includes(query) ||
        sessionId.includes(query)
      );
    }

    return true;
  });

  // Filter clients for search
  const filteredClients = clients.filter((c) => {
    if (!searchQuery) return false; // Only show when searching
    const query = searchQuery.toLowerCase();
    return (
      (c.full_name && c.full_name.toLowerCase().includes(query)) ||
      c.first_name.toLowerCase().includes(query) ||
      c.last_name.toLowerCase().includes(query) ||
      c.client_id.toLowerCase().includes(query) ||
      (c.phone && c.phone.includes(query))
    );
  });

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <img
                src={LOGO}
                alt="LSHD1 Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Clinical Dashboard
              </h1>
              <p className="text-xs text-gray-500">
                {user?.facility?.name || "LSHD1 Screening System"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-gray-800">
                {user?.firstName} {user?.lastName}
              </p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(
                  userRole
                )}`}
              >
                {getRoleDisplayName(userRole)}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Quick Actions Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Register New Client - HIM Officer only */}
            {hasPermission(userRole, "patient:register") && (
              <button
                onClick={() => setShowClientModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Register New Client
              </button>
            )}

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, client ID, or session ID..."
                  className="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <svg
                  className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: "all", label: "All Patients", count: screenings.length },
              {
                id: "pending",
                label: "Awaiting Vitals",
                count: stats.pendingScreenings,
              },
              {
                id: "in_progress",
                label: "In Progress",
                count: stats.inProgressScreenings,
              },
              {
                id: "completed",
                label: "Completed",
                count: stats.completedToday,
              },
              {
                id: "follow_up",
                label: "Follow-up",
                count: screenings.filter((s) => s.status === "follow_up")
                  .length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-gray-500 text-xs">Total Patients</p>
            <p className="text-2xl font-bold text-gray-800">
              {stats.totalPatients}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-gray-500 text-xs">Awaiting Vitals</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.pendingVitals}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-gray-500 text-xs">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.inProgressScreenings}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-gray-500 text-xs">Pending Assessment</p>
            <p className="text-2xl font-bold text-indigo-600">
              {stats.pendingAssessment}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-gray-500 text-xs">Completed Today</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.completedToday}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-gray-500 text-xs">Follow-up</p>
            <p className="text-2xl font-bold text-orange-600">
              {screenings.filter((s) => s.status === "follow_up").length}
            </p>
          </div>
        </div>

        {/* Existing Clients Search Results (for routing) */}
        {searchQuery &&
          hasPermission(userRole, "screening:route") &&
          filteredClients.length > 0 && (
            <div className="bg-white rounded-xl shadow mb-6">
              <div className="p-4 border-b">
                <h2 className="text-sm font-semibold text-gray-700">
                  Existing Clients (Route to new screening)
                </h2>
              </div>
              <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
                {filteredClients.slice(0, 5).map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {client.full_name ||
                          `${client.first_name} ${client.last_name}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        ID: {client.client_id} | {client.gender} | Age:{" "}
                        {client.age}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedClient(client);
                        setShowRoutingModal(true);
                      }}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs"
                    >
                      Route to Screening
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Screenings Table */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Patient Screenings</h2>
            <p className="text-sm text-gray-500">
              {activeTab === "all" && "All screening sessions"}
              {activeTab === "pending" && "Patients waiting for vital signs"}
              {activeTab === "in_progress" && "Screenings in progress"}
              {activeTab === "completed" && "Completed screenings"}
              {activeTab === "follow_up" && "Patients requiring follow-up"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Session
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vitals
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredScreenings.map((s) => {
                  const actions = getScreeningActions(
                    s.notificationType?.name || "",
                    s.status,
                    userRole
                  );

                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {s.sessionId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">
                            {s.client?.firstName} {s.client?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {s.client?.clientId}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                          {s.notificationType?.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {s.vitals?.bloodPressureSystolic &&
                        s.vitals?.bloodPressureDiastolic ? (
                          <div>
                            <p
                              className={`font-medium ${
                                getBpCategory(
                                  s.vitals.bloodPressureSystolic,
                                  s.vitals.bloodPressureDiastolic
                                ).color
                              }`}
                            >
                              BP: {s.vitals.bloodPressureSystolic}/
                              {s.vitals.bloodPressureDiastolic}
                            </p>
                            <p className="text-xs text-gray-400">
                              {s.vitals.weight && `${s.vitals.weight}kg`}
                              {s.vitals.pulseRate &&
                                ` | ${s.vitals.pulseRate}bpm`}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            Not recorded
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(
                            s.status
                          )}`}
                        >
                          {s.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {actions.map((action) => (
                            <button
                              key={action.id}
                              onClick={() => openModal(action.id, s)}
                              className={`px-2 py-1 text-xs rounded-lg text-white flex items-center gap-1
                                ${
                                  action.color === "teal"
                                    ? "bg-teal-600 hover:bg-teal-700"
                                    : ""
                                }
                                ${
                                  action.color === "indigo"
                                    ? "bg-indigo-600 hover:bg-indigo-700"
                                    : ""
                                }
                                ${
                                  action.color === "orange"
                                    ? "bg-orange-600 hover:bg-orange-700"
                                    : ""
                                }
                                ${
                                  action.color === "blue"
                                    ? "bg-blue-600 hover:bg-blue-700"
                                    : ""
                                }
                                ${
                                  action.color === "red"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : ""
                                }
                                ${
                                  action.color === "pink"
                                    ? "bg-pink-600 hover:bg-pink-700"
                                    : ""
                                }
                                ${
                                  action.color === "rose"
                                    ? "bg-rose-600 hover:bg-rose-700"
                                    : ""
                                }
                                ${
                                  action.color === "green"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : ""
                                }
                              `}
                              title={action.label}
                            >
                              {action.label}
                            </button>
                          ))}
                          {/* View History - always available */}
                          <button
                            onClick={() =>
                              router.push(`/patients/${s.client?.id}`)
                            }
                            className="px-2 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs"
                            title="View patient history"
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredScreenings.length === 0 && (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="text-gray-500">No screenings found</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ==================== MODALS ==================== */}

      {/* Vitals Modal */}
      {activeModal === "vitals" && selectedScreening && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Record Vital Signs</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Patient Info */}
            <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-200 rounded-full flex items-center justify-center">
                  <span className="text-teal-700 font-bold text-lg">
                    {selectedScreening.client?.firstName?.[0]}
                    {selectedScreening.client?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedScreening.client?.firstName}{" "}
                    {selectedScreening.client?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {selectedScreening.client?.clientId} |{" "}
                    {selectedScreening.notificationType?.name}
                  </p>
                </div>
              </div>
            </div>

            {formSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Vital signs recorded successfully!
              </div>
            )}

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {formError}
              </div>
            )}

            {!formSuccess && (
              <form onSubmit={handleRecordVitals} className="space-y-4">
                {/* Blood Pressure */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blood Pressure (mmHg) *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        required
                        min="60"
                        max="250"
                        placeholder="Systolic"
                        value={vitalsForm.systolicBp || ""}
                        onChange={(e) =>
                          setVitalsForm({
                            ...vitalsForm,
                            systolicBp: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Systolic (top)
                      </p>
                    </div>
                    <span className="text-xl font-bold text-gray-400">/</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        required
                        min="40"
                        max="150"
                        placeholder="Diastolic"
                        value={vitalsForm.diastolicBp || ""}
                        onChange={(e) =>
                          setVitalsForm({
                            ...vitalsForm,
                            diastolicBp: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Diastolic (bottom)
                      </p>
                    </div>
                  </div>
                  {vitalsForm.systolicBp > 0 && vitalsForm.diastolicBp > 0 && (
                    <p
                      className={`text-sm mt-2 ${
                        getBpCategory(
                          vitalsForm.systolicBp,
                          vitalsForm.diastolicBp
                        ).color
                      }`}
                    >
                      BP Category:{" "}
                      {
                        getBpCategory(
                          vitalsForm.systolicBp,
                          vitalsForm.diastolicBp
                        ).label
                      }
                    </p>
                  )}
                </div>

                {/* Weight and Pulse Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      step="0.1"
                      placeholder="e.g., 70"
                      value={vitalsForm.weight || ""}
                      onChange={(e) =>
                        setVitalsForm({
                          ...vitalsForm,
                          weight: parseFloat(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pulse Rate (bpm)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="200"
                      placeholder="e.g., 72"
                      value={vitalsForm.pulseRate || ""}
                      onChange={(e) =>
                        setVitalsForm({
                          ...vitalsForm,
                          pulseRate: parseInt(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Temperature and Respiratory Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperature (°C)
                    </label>
                    <input
                      type="number"
                      min="35"
                      max="42"
                      step="0.1"
                      placeholder="e.g., 36.5"
                      value={vitalsForm.temperature || ""}
                      onChange={(e) =>
                        setVitalsForm({
                          ...vitalsForm,
                          temperature: parseFloat(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Respiratory Rate (bpm)
                    </label>
                    <input
                      type="number"
                      min="8"
                      max="60"
                      placeholder="e.g., 16"
                      value={vitalsForm.respiratoryRate || ""}
                      onChange={(e) =>
                        setVitalsForm({
                          ...vitalsForm,
                          respiratoryRate:
                            parseInt(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Height */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="250"
                    step="0.1"
                    placeholder="e.g., 170"
                    value={vitalsForm.height || ""}
                    onChange={(e) =>
                      setVitalsForm({
                        ...vitalsForm,
                        height: parseFloat(e.target.value) || undefined,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any observations or notes..."
                    value={vitalsForm.notes || ""}
                    onChange={(e) =>
                      setVitalsForm({
                        ...vitalsForm,
                        notes: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Previous Vitals Info */}
                {selectedScreening.vitals?.bloodPressureSystolic && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Previous Recording:
                    </p>
                    <p className="text-sm text-gray-600">
                      BP: {selectedScreening.vitals.bloodPressureSystolic}/
                      {selectedScreening.vitals.bloodPressureDiastolic} mmHg
                      {selectedScreening.vitals.pulseRate &&
                        ` | Pulse: ${selectedScreening.vitals.pulseRate} bpm`}
                      {selectedScreening.vitals.temperature &&
                        ` | Temp: ${selectedScreening.vitals.temperature}°C`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Recording new vitals will add to the history, not replace.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400 flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Recording...
                      </>
                    ) : (
                      "Record Vitals"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Assessment Modal */}
      {activeModal === "assessment" && selectedScreening && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Doctor&apos;s Assessment
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Patient Info */}
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center">
                  <span className="text-indigo-700 font-bold text-lg">
                    {selectedScreening.client?.firstName?.[0]}
                    {selectedScreening.client?.lastName?.[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {selectedScreening.client?.firstName}{" "}
                    {selectedScreening.client?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {selectedScreening.client?.clientId} |{" "}
                    {selectedScreening.notificationType?.name}
                  </p>
                </div>
                {selectedScreening.vitals?.bloodPressureSystolic && (
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        getBpCategory(
                          selectedScreening.vitals.bloodPressureSystolic,
                          selectedScreening.vitals.bloodPressureDiastolic || 0
                        ).color
                      }`}
                    >
                      BP: {selectedScreening.vitals.bloodPressureSystolic}/
                      {selectedScreening.vitals.bloodPressureDiastolic}
                    </p>
                    <p className="text-xs text-gray-500">
                      {
                        getBpCategory(
                          selectedScreening.vitals.bloodPressureSystolic,
                          selectedScreening.vitals.bloodPressureDiastolic || 0
                        ).label
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            {formSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Assessment saved successfully!
              </div>
            )}

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {formError}
              </div>
            )}

            {!formSuccess && (
              <form onSubmit={handleSaveAssessment} className="space-y-4">
                {/* Clinical Assessment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinical Assessment *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter clinical findings and assessment..."
                    value={assessmentForm.clinicalAssessment}
                    onChange={(e) =>
                      setAssessmentForm({
                        ...assessmentForm,
                        clinicalAssessment: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Recommendations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recommendations
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter treatment recommendations..."
                    value={assessmentForm.recommendations}
                    onChange={(e) =>
                      setAssessmentForm({
                        ...assessmentForm,
                        recommendations: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Prescription */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prescription
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter prescription details..."
                    value={assessmentForm.prescription}
                    onChange={(e) =>
                      setAssessmentForm({
                        ...assessmentForm,
                        prescription: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Patient Status and Referral */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Patient Status
                    </label>
                    <select
                      value={assessmentForm.patientStatus}
                      onChange={(e) =>
                        setAssessmentForm({
                          ...assessmentForm,
                          patientStatus: e.target
                            .value as AssessmentForm["patientStatus"],
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="abnormal">Abnormal</option>
                      <option value="critical">Critical</option>
                      <option value="requires_followup">
                        Requires Follow-up
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Referral Facility (if applicable)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter referral facility..."
                      value={assessmentForm.referralFacility}
                      onChange={(e) =>
                        setAssessmentForm({
                          ...assessmentForm,
                          referralFacility: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Next Appointment */}
                {assessmentForm.patientStatus === "requires_followup" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Next Appointment Date
                    </label>
                    <input
                      type="date"
                      value={assessmentForm.nextAppointment}
                      onChange={(e) =>
                        setAssessmentForm({
                          ...assessmentForm,
                          nextAppointment: e.target.value,
                        })
                      }
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      "Save Assessment"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Diabetes Screening Modal */}
      {activeModal === "diabetes" && selectedScreening && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Diabetes Screening</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Patient Info */}
            <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                  <span className="text-orange-700 font-bold text-lg">
                    {selectedScreening.client?.firstName?.[0]}
                    {selectedScreening.client?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedScreening.client?.firstName}{" "}
                    {selectedScreening.client?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {selectedScreening.client?.clientId} | Session:{" "}
                    {selectedScreening.sessionId}
                  </p>
                </div>
              </div>
            </div>

            {formSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Diabetes screening recorded successfully!
              </div>
            )}

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {formError}
              </div>
            )}

            {!formSuccess && (
              <form onSubmit={handleDiabetesScreening} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Test Type *
                    </label>
                    <select
                      required
                      value={diabetesForm.testType}
                      onChange={(e) =>
                        setDiabetesForm({
                          ...diabetesForm,
                          testType: e.target.value as DiabetesTestType,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="random">Random Blood Sugar</option>
                      <option value="fasting">Fasting Blood Sugar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Test Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={diabetesForm.testTime}
                      onChange={(e) =>
                        setDiabetesForm({
                          ...diabetesForm,
                          testTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {diabetesForm.testType === "fasting" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fasting Duration (hours)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      placeholder="e.g., 8"
                      value={diabetesForm.fastingDurationHours || ""}
                      onChange={(e) =>
                        setDiabetesForm({
                          ...diabetesForm,
                          fastingDurationHours:
                            parseInt(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blood Sugar Level (mg/dL) *
                  </label>
                  <input
                    type="number"
                    required
                    min="20"
                    max="600"
                    step="0.1"
                    placeholder="e.g., 120"
                    value={diabetesForm.bloodSugarLevel || ""}
                    onChange={(e) =>
                      setDiabetesForm({
                        ...diabetesForm,
                        bloodSugarLevel:
                          parseFloat(e.target.value) || undefined,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  {diabetesForm.bloodSugarLevel && (
                    <p
                      className={`text-sm mt-1 ${
                        getBloodSugarCategory(
                          diabetesForm.bloodSugarLevel,
                          diabetesForm.testType === "fasting"
                        ).color
                      }`}
                    >
                      Result:{" "}
                      {
                        getBloodSugarCategory(
                          diabetesForm.bloodSugarLevel,
                          diabetesForm.testType === "fasting"
                        ).label
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinical Observations
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any observations during the test..."
                    value={diabetesForm.clinicalObservations || ""}
                    onChange={(e) =>
                      setDiabetesForm({
                        ...diabetesForm,
                        clinicalObservations: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="diabetesReferToDoctor"
                    checked={diabetesForm.referToDoctor}
                    onChange={(e) =>
                      setDiabetesForm({
                        ...diabetesForm,
                        referToDoctor: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <label
                    htmlFor="diabetesReferToDoctor"
                    className="text-sm text-gray-700"
                  >
                    Refer to Doctor for Review
                  </label>
                </div>

                {diabetesForm.referToDoctor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Referral Reason
                    </label>
                    <input
                      type="text"
                      placeholder="Reason for referral..."
                      value={diabetesForm.referralReason || ""}
                      onChange={(e) =>
                        setDiabetesForm({
                          ...diabetesForm,
                          referralReason: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Recording...
                      </>
                    ) : (
                      "Complete Screening"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PSA Screening Modal */}
      {activeModal === "psa" && selectedScreening && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">PSA Screening</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Patient Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-bold text-lg">
                    {selectedScreening.client?.firstName?.[0]}
                    {selectedScreening.client?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedScreening.client?.firstName}{" "}
                    {selectedScreening.client?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {selectedScreening.client?.clientId} | Session:{" "}
                    {selectedScreening.sessionId}
                  </p>
                </div>
              </div>
            </div>

            {formSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                PSA screening recorded successfully!
              </div>
            )}

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {formError}
              </div>
            )}

            {!formSuccess && (
              <form onSubmit={handlePsaScreening} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Patient Age *
                    </label>
                    <input
                      type="number"
                      required
                      min="40"
                      max="100"
                      placeholder="e.g., 55"
                      value={psaForm.patientAge || ""}
                      onChange={(e) =>
                        setPsaForm({
                          ...psaForm,
                          patientAge: parseInt(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Collection Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={psaForm.collectionTime}
                      onChange={(e) =>
                        setPsaForm({
                          ...psaForm,
                          collectionTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PSA Level (ng/mL) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="e.g., 2.5"
                      value={psaForm.psaLevel || ""}
                      onChange={(e) =>
                        setPsaForm({
                          ...psaForm,
                          psaLevel: parseFloat(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {psaForm.psaLevel !== undefined && psaForm.psaLevel > 0 && (
                      <p
                        className={`text-sm mt-1 ${
                          getPsaCategory(psaForm.psaLevel).color
                        }`}
                      >
                        Result: {getPsaCategory(psaForm.psaLevel).label}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Normal Range Max (ng/mL)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={psaForm.normalRangeMax}
                      onChange={(e) =>
                        setPsaForm({
                          ...psaForm,
                          normalRangeMax: parseFloat(e.target.value) || 4.0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Age-adjusted normal range
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Test Method
                    </label>
                    <select
                      value={psaForm.testMethod || ""}
                      onChange={(e) =>
                        setPsaForm({ ...psaForm, testMethod: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="immunoassay">Immunoassay</option>
                      <option value="elisa">ELISA</option>
                      <option value="chemiluminescence">
                        Chemiluminescence
                      </option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sample Quality
                    </label>
                    <select
                      value={psaForm.sampleQuality}
                      onChange={(e) =>
                        setPsaForm({
                          ...psaForm,
                          sampleQuality: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="good">Good</option>
                      <option value="adequate">Adequate</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinical Observations
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any clinical observations..."
                    value={psaForm.clinicalObservations || ""}
                    onChange={(e) =>
                      setPsaForm({
                        ...psaForm,
                        clinicalObservations: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="psaReferToDoctor"
                    checked={psaForm.referToDoctor}
                    onChange={(e) =>
                      setPsaForm({
                        ...psaForm,
                        referToDoctor: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="psaReferToDoctor"
                    className="text-sm text-gray-700"
                  >
                    Refer to Doctor for Review
                  </label>
                </div>

                {psaForm.referToDoctor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Referral Reason
                    </label>
                    <input
                      type="text"
                      placeholder="Reason for referral..."
                      value={psaForm.referralReason || ""}
                      onChange={(e) =>
                        setPsaForm({
                          ...psaForm,
                          referralReason: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Recording...
                      </>
                    ) : (
                      "Complete Screening"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Hypertension Screening Modal */}
      {activeModal === "hypertension" && selectedScreening && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Hypertension Screening</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Patient Info */}
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
                  <span className="text-red-700 font-bold text-lg">
                    {selectedScreening.client?.firstName?.[0]}
                    {selectedScreening.client?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedScreening.client?.firstName}{" "}
                    {selectedScreening.client?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {selectedScreening.client?.clientId} | Session:{" "}
                    {selectedScreening.sessionId}
                  </p>
                </div>
              </div>
            </div>

            {formSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Hypertension screening recorded successfully!
              </div>
            )}

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {formError}
              </div>
            )}

            {!formSuccess && (
              <form
                onSubmit={handleHypertensionScreening}
                className="space-y-4"
              >
                {/* First Reading */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    First Reading *
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Systolic (mmHg)
                      </label>
                      <input
                        type="number"
                        required
                        min="60"
                        max="250"
                        value={hypertensionForm.systolicBp1 || ""}
                        onChange={(e) =>
                          setHypertensionForm({
                            ...hypertensionForm,
                            systolicBp1: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Diastolic (mmHg)
                      </label>
                      <input
                        type="number"
                        required
                        min="40"
                        max="150"
                        value={hypertensionForm.diastolicBp1 || ""}
                        onChange={(e) =>
                          setHypertensionForm({
                            ...hypertensionForm,
                            diastolicBp1: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Position
                      </label>
                      <select
                        value={hypertensionForm.position1}
                        onChange={(e) =>
                          setHypertensionForm({
                            ...hypertensionForm,
                            position1: e.target.value as
                              | "sitting"
                              | "standing"
                              | "lying",
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                      >
                        <option value="sitting">Sitting</option>
                        <option value="standing">Standing</option>
                        <option value="lying">Lying</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Arm Used
                      </label>
                      <select
                        value={hypertensionForm.armUsed1}
                        onChange={(e) =>
                          setHypertensionForm({
                            ...hypertensionForm,
                            armUsed1: e.target.value as "left" | "right",
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                      >
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                  {hypertensionForm.systolicBp1 > 0 &&
                    hypertensionForm.diastolicBp1 > 0 && (
                      <p
                        className={`text-sm mt-2 ${
                          getBpCategory(
                            hypertensionForm.systolicBp1,
                            hypertensionForm.diastolicBp1
                          ).color
                        }`}
                      >
                        Category:{" "}
                        {
                          getBpCategory(
                            hypertensionForm.systolicBp1,
                            hypertensionForm.diastolicBp1
                          ).label
                        }
                      </p>
                    )}
                </div>

                {/* Second Reading (Optional) */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Second Reading (Optional)
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Systolic (mmHg)
                      </label>
                      <input
                        type="number"
                        min="60"
                        max="250"
                        value={hypertensionForm.systolicBp2 || ""}
                        onChange={(e) =>
                          setHypertensionForm({
                            ...hypertensionForm,
                            systolicBp2: parseInt(e.target.value) || undefined,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Diastolic (mmHg)
                      </label>
                      <input
                        type="number"
                        min="40"
                        max="150"
                        value={hypertensionForm.diastolicBp2 || ""}
                        onChange={(e) =>
                          setHypertensionForm({
                            ...hypertensionForm,
                            diastolicBp2: parseInt(e.target.value) || undefined,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Position
                      </label>
                      <select
                        value={hypertensionForm.position2 || ""}
                        onChange={(e) =>
                          setHypertensionForm({
                            ...hypertensionForm,
                            position2: e.target.value as
                              | "sitting"
                              | "standing"
                              | "lying"
                              | undefined,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                      >
                        <option value="">Select</option>
                        <option value="sitting">Sitting</option>
                        <option value="standing">Standing</option>
                        <option value="lying">Lying</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Arm Used
                      </label>
                      <select
                        value={hypertensionForm.armUsed2 || ""}
                        onChange={(e) =>
                          setHypertensionForm({
                            ...hypertensionForm,
                            armUsed2: e.target.value as
                              | "left"
                              | "right"
                              | undefined,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                      >
                        <option value="">Select</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinical Observations
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any clinical observations..."
                    value={hypertensionForm.clinicalObservations || ""}
                    onChange={(e) =>
                      setHypertensionForm({
                        ...hypertensionForm,
                        clinicalObservations: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hypertensionReferToDoctor"
                    checked={hypertensionForm.referToDoctor}
                    onChange={(e) =>
                      setHypertensionForm({
                        ...hypertensionForm,
                        referToDoctor: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <label
                    htmlFor="hypertensionReferToDoctor"
                    className="text-sm text-gray-700"
                  >
                    Refer to Doctor for Review
                  </label>
                </div>

                {hypertensionForm.referToDoctor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Referral Reason
                    </label>
                    <input
                      type="text"
                      placeholder="Reason for referral..."
                      value={hypertensionForm.referralReason || ""}
                      onChange={(e) =>
                        setHypertensionForm({
                          ...hypertensionForm,
                          referralReason: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Recording...
                      </>
                    ) : (
                      "Complete Screening"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Cervical Cancer Screening Modal */}
      {activeModal === "cervical" && selectedScreening && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Cervical Cancer Screening
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Patient Info */}
            <div className="mb-6 p-4 bg-pink-50 rounded-lg border border-pink-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-200 rounded-full flex items-center justify-center">
                  <span className="text-pink-700 font-bold text-lg">
                    {selectedScreening.client?.firstName?.[0]}
                    {selectedScreening.client?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedScreening.client?.firstName}{" "}
                    {selectedScreening.client?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {selectedScreening.client?.clientId} | Session:{" "}
                    {selectedScreening.sessionId}
                  </p>
                </div>
              </div>
            </div>

            {formSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Cervical screening recorded successfully!
              </div>
            )}

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {formError}
              </div>
            )}

            {!formSuccess && (
              <form onSubmit={handleCervicalScreening} className="space-y-4">
                {/* Screening Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screening Method *
                  </label>
                  <select
                    required
                    value={cervicalForm.screeningMethod}
                    onChange={(e) =>
                      setCervicalForm({
                        ...cervicalForm,
                        screeningMethod: e.target
                          .value as CervicalScreeningMethod,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="via">
                      VIA (Visual Inspection with Acetic Acid)
                    </option>
                    <option value="vili">
                      VILI (Visual Inspection with Lugol&apos;s Iodine)
                    </option>
                    <option value="pap_smear">Pap Smear</option>
                    <option value="hpv_test">HPV Test</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {cervicalForm.screeningMethod === "other" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Other Method Details
                    </label>
                    <input
                      type="text"
                      placeholder="Describe the screening method..."
                      value={cervicalForm.otherMethodDetails || ""}
                      onChange={(e) =>
                        setCervicalForm({
                          ...cervicalForm,
                          otherMethodDetails: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                )}

                {/* Visual Inspection Findings */}
                {(cervicalForm.screeningMethod === "via" ||
                  cervicalForm.screeningMethod === "vili") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visual Inspection Findings
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Describe visual inspection findings..."
                      value={cervicalForm.visualInspectionFindings || ""}
                      onChange={(e) =>
                        setCervicalForm({
                          ...cervicalForm,
                          visualInspectionFindings: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                )}

                {/* Specimen Collection */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="specimenCollected"
                    checked={cervicalForm.specimenCollected}
                    onChange={(e) =>
                      setCervicalForm({
                        ...cervicalForm,
                        specimenCollected: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                  />
                  <label
                    htmlFor="specimenCollected"
                    className="text-sm text-gray-700"
                  >
                    Specimen Collected
                  </label>
                </div>

                {cervicalForm.specimenCollected && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specimen Type
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Cervical swab, Pap smear slide..."
                      value={cervicalForm.specimenType || ""}
                      onChange={(e) =>
                        setCervicalForm({
                          ...cervicalForm,
                          specimenType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                )}

                {/* Screening Result */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screening Result *
                  </label>
                  <select
                    required
                    value={cervicalForm.screeningResult}
                    onChange={(e) =>
                      setCervicalForm({
                        ...cervicalForm,
                        screeningResult: e.target.value as CervicalResult,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="negative">Negative (Normal)</option>
                    <option value="positive">Positive (Abnormal)</option>
                    <option value="suspicious">Suspicious</option>
                    <option value="inconclusive">Inconclusive</option>
                  </select>
                  {cervicalForm.screeningResult === "positive" && (
                    <p className="text-sm mt-1 text-red-600">
                      Abnormal result - follow-up recommended
                    </p>
                  )}
                  {cervicalForm.screeningResult === "suspicious" && (
                    <p className="text-sm mt-1 text-orange-600">
                      Suspicious finding - further evaluation needed
                    </p>
                  )}
                </div>

                {/* Clinical Observations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinical Observations
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any clinical observations..."
                    value={cervicalForm.clinicalObservations || ""}
                    onChange={(e) =>
                      setCervicalForm({
                        ...cervicalForm,
                        clinicalObservations: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                {/* Follow-up Required */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cervicalFollowUp"
                    checked={cervicalForm.followUpRequired}
                    onChange={(e) =>
                      setCervicalForm({
                        ...cervicalForm,
                        followUpRequired: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                  />
                  <label
                    htmlFor="cervicalFollowUp"
                    className="text-sm text-gray-700"
                  >
                    Follow-up Required
                  </label>
                </div>

                {cervicalForm.followUpRequired && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Follow-up Date
                      </label>
                      <input
                        type="date"
                        value={cervicalForm.followUpDate || ""}
                        onChange={(e) =>
                          setCervicalForm({
                            ...cervicalForm,
                            followUpDate: e.target.value,
                          })
                        }
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Follow-up Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Repeat screening, colposcopy..."
                        value={cervicalForm.followUpNotes || ""}
                        onChange={(e) =>
                          setCervicalForm({
                            ...cervicalForm,
                            followUpNotes: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-pink-400 flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Recording...
                      </>
                    ) : (
                      "Complete Screening"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Client Registration Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Register New Client</h3>
              <button
                onClick={() => {
                  setShowClientModal(false);
                  setFormError(null);
                  setRegistrationSuccess(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Success Message */}
            {registrationSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                <p className="font-medium">Client registered successfully!</p>
                <p className="text-sm">
                  Client ID: {registrationSuccess.clientId}
                </p>
                <p className="text-sm">
                  Screening Session: {registrationSuccess.screeningId}
                </p>
                <button
                  onClick={() => setRegistrationSuccess(null)}
                  className="mt-2 text-sm text-green-800 underline"
                >
                  Register another client
                </button>
              </div>
            )}

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {formError}
              </div>
            )}

            {!registrationSuccess && (
              <form onSubmit={handleCreateClient} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClient.fullName}
                    onChange={(e) =>
                      setNewClient({ ...newClient, fullName: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter full name"
                  />
                </div>

                {/* Phone and Age */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newClient.phone}
                      onChange={(e) =>
                        setNewClient({ ...newClient, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="080XXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Age *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="150"
                      value={newClient.age || ""}
                      onChange={(e) =>
                        setNewClient({
                          ...newClient,
                          age: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter age"
                    />
                  </div>
                </div>

                {/* Gender and PHC Center */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender *
                    </label>
                    <select
                      required
                      value={newClient.gender}
                      onChange={(e) =>
                        setNewClient({
                          ...newClient,
                          gender: e.target.value,
                          screeningTypeId: 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PHC Center *
                    </label>
                    <select
                      required
                      disabled
                      value={newClient.phcCenterId || ""}
                      onChange={(e) =>
                        setNewClient({
                          ...newClient,
                          phcCenterId: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select PHC Center</option>
                      {facilities.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <textarea
                    required
                    value={newClient.address}
                    onChange={(e) =>
                      setNewClient({ ...newClient, address: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter client address"
                  />
                </div>

                {/* Screening Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Screening Type *
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {SCREENING_TYPES.filter((type) => {
                      const clientGender = newClient.gender.toLowerCase();
                      return (
                        type.gender === "all" || type.gender === clientGender
                      );
                    }).map((type) => (
                      <label
                        key={type.id}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer transition ${
                          newClient.screeningTypeId === type.id
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="screeningType"
                          value={type.id}
                          checked={newClient.screeningTypeId === type.id}
                          onChange={(e) =>
                            setNewClient({
                              ...newClient,
                              screeningTypeId: parseInt(e.target.value),
                            })
                          }
                          className="mt-1 mr-3"
                          required
                        />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {type.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {type.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Next of Kin */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Next of Kin Name{" "}
                      <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={newClient.nextOfKin}
                      onChange={(e) =>
                        setNewClient({
                          ...newClient,
                          nextOfKin: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter next of kin name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Next of Kin Phone{" "}
                      <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={newClient.nextOfKinPhone}
                      onChange={(e) =>
                        setNewClient({
                          ...newClient,
                          nextOfKinPhone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="080XXXXXXXX"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowClientModal(false);
                      setFormError(null);
                      setRegistrationSuccess(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
                  >
                    {formLoading ? "Registering..." : "Register Client"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Routing Modal */}
      {showRoutingModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Route Client to Screening
              </h3>
              <button
                onClick={() => {
                  setShowRoutingModal(false);
                  setSelectedClient(null);
                  setSelectedNotificationType("");
                  setFormError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Client Info */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">
                {selectedClient.full_name ||
                  `${selectedClient.first_name} ${selectedClient.last_name}`}
              </p>
              <p className="text-sm text-gray-500">
                ID: {selectedClient.client_id}
              </p>
              <p className="text-sm text-gray-500">
                {selectedClient.gender} | Age: {selectedClient.age}
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleRouteClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Screening Type *
                </label>
                <select
                  required
                  value={selectedNotificationType}
                  onChange={(e) => setSelectedNotificationType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Screening Type --</option>
                  {notificationTypes
                    .filter((t) => {
                      if (!selectedClient) return true;
                      const clientGender =
                        selectedClient.gender?.toLowerCase() || "";
                      return t.gender === "all" || t.gender === clientGender;
                    })
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoutingModal(false);
                    setSelectedClient(null);
                    setSelectedNotificationType("");
                    setFormError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !selectedNotificationType}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
                >
                  {formLoading ? "Routing..." : "Route Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
