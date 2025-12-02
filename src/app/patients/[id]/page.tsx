"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import type {
  Patient,
  User,
  CreateBreastScreeningDto,
  LymphNodeStatus,
  BreastRiskLevel,
  Laterality,
  CreateFollowupDto,
  FollowupAppointment,
  UserRoleType,
  VitalRecord,
} from "@/types";

interface ScreeningHistory {
  id: number;
  sessionId: string;
  status: string;
  createdAt: string;
  screeningDate: string;
  screeningTime: string;
  notificationType: {
    id: number;
    name: string;
    pathway: string;
  };
  conductedBy: string | null;
  vitals: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    temperature?: number;
    pulseRate?: number;
    respiratoryRate?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  };
  results: {
    diagnosis?: string;
    prescription?: string;
    recommendations?: string;
    nextAppointment?: string;
  };
}

export default function PatientHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [screenings, setScreenings] = useState<ScreeningHistory[]>([]);
  const [followups, setFollowups] = useState<FollowupAppointment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "history" | "vitals" | "results" | "followups"
  >("history");

  // Screening result form state
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedScreening, setSelectedScreening] =
    useState<ScreeningHistory | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [resultSuccess, setResultSuccess] = useState(false);

  // Breast screening form (example - can be extended for other types)
  const [breastForm, setBreastForm] = useState<CreateBreastScreeningDto>({
    lumpPresent: false,
    lumpLocation: "",
    lumpSize: "",
    lumpCharacteristics: "",
    dischargePresent: false,
    dischargeType: "",
    nippleInversion: false,
    lymphNodeStatus: "normal",
    summaryFindings: "",
    riskAssessment: "low",
    recommendations: "",
    referralRequired: false,
  });

  // Follow-up scheduling state
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followupError, setFollowupError] = useState<string | null>(null);
  const [followupSuccess, setFollowupSuccess] = useState(false);
  const [followupForm, setFollowupForm] = useState<CreateFollowupDto>({
    clientId: 0,
    followupDate: "",
    followupTime: "09:00",
    followupType: "Specialist Consultation",
    followupInstructions: "",
    sendSmsReminder: true,
    reminderDaysBefore: 1,
  });

  // SMS modal state
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [smsSuccess, setSmsSuccess] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");

  // Doctor's Note modal state
  const [showDoctorNoteModal, setShowDoctorNoteModal] = useState(false);
  const [selectedScreeningForNote, setSelectedScreeningForNote] = useState<ScreeningHistory | null>(null);
  const [doctorNoteLoading, setDoctorNoteLoading] = useState(false);
  const [doctorNoteError, setDoctorNoteError] = useState<string | null>(null);
  const [doctorNoteSuccess, setDoctorNoteSuccess] = useState(false);
  const [doctorNoteForm, setDoctorNoteForm] = useState({
    clinicalAssessment: "",
    recommendations: "",
    prescription: "",
    patientStatus: "normal" as "normal" | "abnormal" | "critical" | "requires_followup",
    referralFacility: "",
    nextAppointment: "",
  });

  // Vital records state
  const [vitalRecords, setVitalRecords] = useState<VitalRecord[]>([]);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsError, setVitalsError] = useState<string | null>(null);
  const [vitalsSuccess, setVitalsSuccess] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    systolicBp: "",
    diastolicBp: "",
    temperature: "",
    pulseRate: "",
    respiratoryRate: "",
    weight: "",
    height: "",
    bloodSugarRandom: "",
    bloodSugarFasting: "",
    notes: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    fetchData();
  }, [params.id, router]);

  const fetchData = async () => {
    try {
      const patientId = Number(params.id);
      const [patientData, screeningsData, followupsData, vitalsData] = await Promise.all([
        api.getClient(patientId),
        api.getPatientScreenings(patientId),
        api.getFollowupsByPatient(patientId),
        api.getPatientVitals(patientId),
      ]);

      setPatient(patientData);
      setScreenings(screeningsData as unknown as ScreeningHistory[]);
      setFollowups(followupsData);
      setVitalRecords(vitalsData.records);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch patient data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Go back to the appropriate dashboard based on user role
    if (user?.role?.id === "admin") {
      router.push("/dashboard");
    } else {
      router.push("/dashboard/clinical");
    }
  };

  const openResultModal = (screening: ScreeningHistory) => {
    setSelectedScreening(screening);
    setResultError(null);
    setResultSuccess(false);
    setShowResultModal(true);
  };

  const handleSubmitResult = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScreening) return;

    setResultLoading(true);
    setResultError(null);

    try {
      const pathway = selectedScreening.notificationType.pathway;

      if (pathway === "breast") {
        await api.createBreastScreening(selectedScreening.id, breastForm);
      }
      // Add other pathway handlers as needed

      setResultSuccess(true);
      fetchData();

      setTimeout(() => {
        setShowResultModal(false);
        setSelectedScreening(null);
        setResultSuccess(false);
      }, 1500);
    } catch (err) {
      setResultError(
        err instanceof Error ? err.message : "Failed to submit screening result"
      );
    } finally {
      setResultLoading(false);
    }
  };

  const openFollowupModal = (screening?: ScreeningHistory) => {
    if (!patient) return;
    setFollowupForm({
      clientId: patient.id,
      screeningId: screening?.id,
      followupDate: "",
      followupTime: "09:00",
      followupType: "Specialist Consultation",
      followupInstructions: "",
      sendSmsReminder: true,
      reminderDaysBefore: 1,
    });
    setFollowupError(null);
    setFollowupSuccess(false);
    setShowFollowupModal(true);
  };

  const handleSubmitFollowup = async (e: FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    setFollowupLoading(true);
    setFollowupError(null);

    try {
      await api.createFollowup({
        ...followupForm,
        clientId: patient.id,
      });

      setFollowupSuccess(true);
      fetchData();

      setTimeout(() => {
        setShowFollowupModal(false);
        setFollowupSuccess(false);
      }, 1500);
    } catch (err) {
      setFollowupError(
        err instanceof Error ? err.message : "Failed to schedule follow-up"
      );
    } finally {
      setFollowupLoading(false);
    }
  };

  const openSmsModal = () => {
    setSmsMessage("");
    setSmsError(null);
    setSmsSuccess(false);
    setShowSmsModal(true);
  };

  const handleSendSms = async (e: FormEvent) => {
    e.preventDefault();
    if (!patient || !smsMessage.trim()) return;

    setSmsLoading(true);
    setSmsError(null);

    try {
      const result = await api.sendManualSms(patient.id, smsMessage);
      if (result.success) {
        setSmsSuccess(true);
        setTimeout(() => {
          setShowSmsModal(false);
          setSmsSuccess(false);
          setSmsMessage("");
        }, 1500);
      } else {
        setSmsError(result.message || "Failed to send SMS");
      }
    } catch (err) {
      setSmsError(
        err instanceof Error ? err.message : "Failed to send SMS"
      );
    } finally {
      setSmsLoading(false);
    }
  };

  // Open doctor's note modal
  const openDoctorNoteModal = (screening: ScreeningHistory) => {
    setSelectedScreeningForNote(screening);
    setDoctorNoteForm({
      clinicalAssessment: screening.results?.diagnosis || "",
      recommendations: screening.results?.recommendations || "",
      prescription: screening.results?.prescription || "",
      patientStatus: "normal",
      referralFacility: "",
      nextAppointment: screening.results?.nextAppointment || "",
    });
    setDoctorNoteError(null);
    setDoctorNoteSuccess(false);
    setShowDoctorNoteModal(true);
  };

  // Handle doctor's note submission
  const handleSaveDoctorNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScreeningForNote) return;

    if (!doctorNoteForm.clinicalAssessment.trim()) {
      setDoctorNoteError("Clinical assessment is required");
      return;
    }

    setDoctorNoteLoading(true);
    setDoctorNoteError(null);

    try {
      await api.addDoctorAssessment(selectedScreeningForNote.id, {
        clinicalAssessment: doctorNoteForm.clinicalAssessment,
        recommendations: doctorNoteForm.recommendations || undefined,
        prescription: doctorNoteForm.prescription || undefined,
        patientStatus: doctorNoteForm.patientStatus,
        referralFacility: doctorNoteForm.referralFacility || undefined,
        nextAppointment: doctorNoteForm.nextAppointment || undefined,
      });

      setDoctorNoteSuccess(true);
      fetchData();

      setTimeout(() => {
        setShowDoctorNoteModal(false);
        setSelectedScreeningForNote(null);
        setDoctorNoteSuccess(false);
      }, 1500);
    } catch (err) {
      setDoctorNoteError(
        err instanceof Error ? err.message : "Failed to save doctor's note"
      );
    } finally {
      setDoctorNoteLoading(false);
    }
  };

  // Vitals modal handlers
  const openVitalsModal = () => {
    setVitalsForm({
      systolicBp: "",
      diastolicBp: "",
      temperature: "",
      pulseRate: "",
      respiratoryRate: "",
      weight: "",
      height: "",
      bloodSugarRandom: "",
      bloodSugarFasting: "",
      notes: "",
    });
    setVitalsError(null);
    setVitalsSuccess(false);
    setShowVitalsModal(true);
  };

  const handleRecordVitals = async (e: FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    setVitalsLoading(true);
    setVitalsError(null);

    try {
      await api.createVitalRecord({
        patientId: patient.id,
        systolicBp: parseInt(vitalsForm.systolicBp),
        diastolicBp: parseInt(vitalsForm.diastolicBp),
        temperature: vitalsForm.temperature ? parseFloat(vitalsForm.temperature) : undefined,
        pulseRate: vitalsForm.pulseRate ? parseInt(vitalsForm.pulseRate) : undefined,
        respiratoryRate: vitalsForm.respiratoryRate ? parseInt(vitalsForm.respiratoryRate) : undefined,
        weight: vitalsForm.weight ? parseFloat(vitalsForm.weight) : undefined,
        height: vitalsForm.height ? parseFloat(vitalsForm.height) : undefined,
        bloodSugarRandom: vitalsForm.bloodSugarRandom ? parseFloat(vitalsForm.bloodSugarRandom) : undefined,
        bloodSugarFasting: vitalsForm.bloodSugarFasting ? parseFloat(vitalsForm.bloodSugarFasting) : undefined,
        notes: vitalsForm.notes || undefined,
      });

      setVitalsSuccess(true);
      fetchData();

      setTimeout(() => {
        setShowVitalsModal(false);
        setVitalsSuccess(false);
      }, 1500);
    } catch (err) {
      setVitalsError(
        err instanceof Error ? err.message : "Failed to record vitals"
      );
    } finally {
      setVitalsLoading(false);
    }
  };

  // Get user's role for permission checks
  const userRole = user?.role?.id as UserRoleType | undefined;

  const getBpCategory = (
    systolic?: number,
    diastolic?: number
  ): { label: string; color: string } => {
    if (!systolic || !diastolic)
      return { label: "N/A", color: "text-gray-500" };
    if (systolic < 120 && diastolic < 80)
      return { label: "Normal", color: "text-green-600" };
    if (systolic < 130 && diastolic < 80)
      return { label: "Elevated", color: "text-yellow-600" };
    if (systolic < 140 || diastolic < 90)
      return { label: "High Stage 1", color: "text-orange-600" };
    if (systolic >= 180 || diastolic >= 120)
      return { label: "Crisis", color: "text-red-800 font-bold" };
    return { label: "High Stage 2", color: "text-red-600" };
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPathwayColor = (pathway: string): string => {
    const colors: Record<string, string> = {
      hypertension: "bg-red-100 text-red-700",
      diabetes: "bg-blue-100 text-blue-700",
      cervical: "bg-purple-100 text-purple-700",
      breast: "bg-pink-100 text-pink-700",
      psa: "bg-teal-100 text-teal-700",
    };
    return colors[pathway] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patient history...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || "Patient not found"}</p>
          <button
            onClick={handleBack}
            className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
              <div className="border-l pl-4">
                <h1 className="text-xl font-bold text-gray-800">
                  Patient Medical History
                </h1>
                <p className="text-sm text-gray-500">{patient.client_id}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Patient Info Card */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-teal-700">
                {patient.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "P"}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {patient.full_name}
              </h2>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Age:</span>
                  <span className="ml-2 font-medium">{patient.age} years</span>
                </div>
                <div>
                  <span className="text-gray-500">Gender:</span>
                  <span className="ml-2 font-medium">{patient.gender}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <span className="ml-2 font-medium">{patient.phone}</span>
                </div>
                <div>
                  <span className="text-gray-500">Facility:</span>
                  <span className="ml-2 font-medium">
                    {patient.facility_name || "N/A"}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-gray-500">Address:</span>
                <span className="ml-2">{patient.address}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Next of Kin:</span>
                  <span className="ml-2 font-medium">
                    {patient.next_of_kin || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Next of Kin Phone:</span>
                  <span className="ml-2 font-medium">
                    {patient.next_of_kin_phone || "N/A"}
                  </span>
                </div>
              </div>
              {/* SMS Button */}
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={openSmsModal}
                  disabled={!patient.phone}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    patient.phone
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  title={patient.phone ? "Send SMS to patient" : "No phone number available"}
                >
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
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  Send SMS
                </button>
                {!patient.phone && (
                  <p className="text-xs text-gray-500 mt-1">
                    No phone number on file
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-t-xl shadow-sm border-b">
          <div className="flex gap-1 px-4">
            {(["history", "vitals", "results", "followups"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-medium capitalize ${
                    activeTab === tab
                      ? "text-teal-600 border-b-2 border-teal-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "history"
                    ? "Screening History"
                    : tab === "vitals"
                    ? "Vitals History"
                    : tab === "results"
                    ? "Doctor's Notes"
                    : `Follow-ups (${followups.length})`}
                </button>
              )
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-xl shadow p-6">
          {/* Screening History Tab */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  All Screening Sessions
                </h3>
                <span className="text-sm text-gray-500">
                  {screenings.length} total
                </span>
              </div>

              {screenings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-300"
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
                  <p>No screening history found for this patient</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {screenings.map((s) => (
                    <div
                      key={s.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getPathwayColor(
                                s.notificationType.pathway
                              )}`}
                            >
                              {s.notificationType.name}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                s.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : s.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600">
                            Session ID:{" "}
                            <span className="font-medium">{s.sessionId}</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Date: {formatDate(s.screeningDate)} at{" "}
                            {s.screeningTime}
                          </p>
                          {s.conductedBy && (
                            <p className="text-sm text-gray-600">
                              Conducted by:{" "}
                              <span className="font-medium">
                                {s.conductedBy}
                              </span>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {s.status === "pending" &&
                            (user?.role?.id === "nurse" ||
                              user?.role?.id === "doctor" ||
                              user?.role?.id === "admin") && (
                              <button
                                onClick={() => openResultModal(s)}
                                className="px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                              >
                                Record Result
                              </button>
                            )}
                          {s.status === "completed" &&
                            (user?.role?.id === "nurse" ||
                              user?.role?.id === "doctor" ||
                              user?.role?.id === "admin") && (
                              <button
                                onClick={() => openFollowupModal(s)}
                                className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                              >
                                Schedule Follow-up
                              </button>
                            )}
                          <button
                            onClick={() => router.push(`/screenings/${s.id}`)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vitals History Tab */}
          {activeTab === "vitals" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Vitals History</h3>
                {hasPermission(userRole, "vitals:record") && (
                  <button
                    onClick={openVitalsModal}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
                  >
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Add Vitals
                  </button>
                )}
              </div>

              {vitalRecords.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <p>No vitals recorded for this patient</p>
                  {hasPermission(userRole, "vitals:record") && (
                    <button
                      onClick={openVitalsModal}
                      className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                    >
                      Record First Vitals
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date & Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Blood Pressure
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Pulse
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Temp
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Weight / BMI
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Recorded By
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {vitalRecords.map((record) => {
                        const bpCat = getBpCategory(
                          record.bloodPressure.systolic ?? undefined,
                          record.bloodPressure.diastolic ?? undefined
                        );
                        return (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDateTime(record.recordedAt)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {record.bloodPressure.formatted || "-"}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm ${bpCat.color}`}
                            >
                              {bpCat.label}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {record.pulseRate
                                ? `${record.pulseRate} bpm`
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {record.temperature
                                ? `${record.temperature}°C`
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {record.weight
                                ? `${record.weight} kg`
                                : "-"}
                              {record.bmi && (
                                <span className="ml-1 text-xs text-gray-400">
                                  (BMI: {record.bmi})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {record.recordedBy?.name || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Screening Results Tab */}
          {activeTab === "results" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Screening Results & Doctor&apos;s Notes
                </h3>
              </div>

              {/* List of screenings where doctor can add notes */}
              {hasPermission(userRole, "assessment:create") && screenings.filter(s => s.status === "in_progress" || s.status === "completed").length > 0 && (
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <h4 className="text-sm font-medium text-indigo-800 mb-3">Add Doctor&apos;s Note to Screening:</h4>
                  <div className="flex flex-wrap gap-2">
                    {screenings
                      .filter(s => s.status === "in_progress" || s.status === "completed")
                      .map((s) => (
                        <button
                          key={s.id}
                          onClick={() => openDoctorNoteModal(s)}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          {s.notificationType.name} ({formatDate(s.screeningDate)})
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {screenings.filter(
                (s) => s.results?.diagnosis || s.status === "completed"
              ).length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p>No screening results available</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {screenings
                    .filter(
                      (s) => s.results?.diagnosis || s.status === "completed"
                    )
                    .map((s) => (
                      <div
                        key={s.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div
                          className={`px-4 py-3 ${
                            s.notificationType.pathway === "breast"
                              ? "bg-pink-50"
                              : s.notificationType.pathway === "hypertension"
                              ? "bg-red-50"
                              : s.notificationType.pathway === "diabetes"
                              ? "bg-blue-50"
                              : s.notificationType.pathway === "cervical"
                              ? "bg-purple-50"
                              : s.notificationType.pathway === "psa"
                              ? "bg-teal-50"
                              : "bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${getPathwayColor(
                                  s.notificationType.pathway
                                )}`}
                              >
                                {s.notificationType.name}
                              </span>
                              <span className="text-sm text-gray-600">
                                {formatDate(s.screeningDate)}
                              </span>
                            </div>
                            {s.conductedBy && (
                              <span className="text-sm text-gray-600">
                                By:{" "}
                                <span className="font-medium">
                                  {s.conductedBy}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          {s.results?.diagnosis && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-1">
                                Diagnosis / Findings:
                              </h4>
                              <p className="text-gray-900">
                                {s.results.diagnosis}
                              </p>
                            </div>
                          )}
                          {s.results?.recommendations && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-1">
                                Recommendations:
                              </h4>
                              <p className="text-gray-900">
                                {s.results.recommendations}
                              </p>
                            </div>
                          )}
                          {s.results?.prescription && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-1">
                                Prescription:
                              </h4>
                              <p className="text-gray-900">
                                {s.results.prescription}
                              </p>
                            </div>
                          )}
                          {s.results?.nextAppointment && (
                            <div className="p-3 bg-yellow-50 rounded-lg">
                              <h4 className="text-sm font-medium text-yellow-800 mb-1">
                                Next Appointment:
                              </h4>
                              <p className="text-yellow-900">
                                {formatDate(s.results.nextAppointment)}
                              </p>
                            </div>
                          )}
                          {!s.results?.diagnosis &&
                            !s.results?.recommendations && (
                              <p className="text-gray-500 italic">
                                No detailed results recorded yet.
                              </p>
                            )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Follow-ups Tab */}
          {activeTab === "followups" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Scheduled Follow-ups</h3>
                {(user?.role?.id === "nurse" ||
                  user?.role?.id === "doctor" ||
                  user?.role?.id === "admin") && (
                  <button
                    onClick={() => openFollowupModal()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Schedule Follow-up
                  </button>
                )}
              </div>

              {followups.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p>No follow-ups scheduled for this patient</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {followups.map((f) => (
                    <div
                      key={f.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              {f.appointmentType}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                f.status === "scheduled"
                                  ? "bg-blue-100 text-blue-700"
                                  : f.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : f.status === "cancelled"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {f.status}
                            </span>
                            {f.sendSmsReminder && (
                              <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700 flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                  />
                                </svg>
                                SMS Reminder
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Date:</span>{" "}
                            {formatDate(f.appointmentDate)} at{" "}
                            {f.appointmentTime}
                          </p>
                          {f.followupInstructions && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Instructions:</span>{" "}
                              {f.followupInstructions}
                            </p>
                          )}
                          {f.sendSmsReminder && f.reminderDaysBefore && (
                            <p className="text-sm text-gray-500 mt-1">
                              Reminder: {f.reminderDaysBefore} day
                              {f.reminderDaysBefore > 1 ? "s" : ""} before
                              appointment
                            </p>
                          )}
                          {f.createdBy && (
                            <p className="text-sm text-gray-500 mt-1">
                              Scheduled by: {f.createdBy}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-600">
                            {new Date(f.appointmentDate).getDate()}
                          </div>
                          <div className="text-xs text-gray-500 uppercase">
                            {new Date(f.appointmentDate).toLocaleDateString(
                              "en-US",
                              { month: "short", year: "numeric" }
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Record Result Modal - Breast Cancer Example */}
      {showResultModal &&
        selectedScreening &&
        selectedScreening.notificationType.pathway === "breast" && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Breast Cancer Screening Results
                </h3>
                <button
                  onClick={() => setShowResultModal(false)}
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

              <div className="mb-4 p-3 bg-pink-50 rounded-lg border border-pink-200">
                <p className="text-sm text-pink-700">
                  <strong>Patient:</strong> {patient.full_name} |{" "}
                  <strong>Session:</strong> {selectedScreening.sessionId}
                </p>
              </div>

              {resultSuccess && (
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
                  Screening result recorded successfully!
                </div>
              )}

              {resultError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {resultError}
                </div>
              )}

              {!resultSuccess && (
                <form onSubmit={handleSubmitResult} className="space-y-4">
                  {/* Lump Detection */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Lump Detection
                    </h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={breastForm.lumpPresent}
                          onChange={(e) =>
                            setBreastForm({
                              ...breastForm,
                              lumpPresent: e.target.checked,
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm">Lump Present</span>
                      </label>
                      {breastForm.lumpPresent && (
                        <div className="pl-6 grid grid-cols-3 gap-3">
                          <input
                            type="text"
                            placeholder="Location"
                            value={breastForm.lumpLocation || ""}
                            onChange={(e) =>
                              setBreastForm({
                                ...breastForm,
                                lumpLocation: e.target.value,
                              })
                            }
                            className="px-3 py-2 border rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Size"
                            value={breastForm.lumpSize || ""}
                            onChange={(e) =>
                              setBreastForm({
                                ...breastForm,
                                lumpSize: e.target.value,
                              })
                            }
                            className="px-3 py-2 border rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Characteristics (e.g., Benign)"
                            value={breastForm.lumpCharacteristics || ""}
                            onChange={(e) =>
                              setBreastForm({
                                ...breastForm,
                                lumpCharacteristics: e.target.value,
                              })
                            }
                            className="px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Breast Discharge */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Breast Discharge
                    </h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={breastForm.dischargePresent}
                          onChange={(e) =>
                            setBreastForm({
                              ...breastForm,
                              dischargePresent: e.target.checked,
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm">Discharge Present</span>
                      </label>
                      {breastForm.dischargePresent && (
                        <div className="pl-6 grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Type (e.g., Clear, Bloody)"
                            value={breastForm.dischargeType || ""}
                            onChange={(e) =>
                              setBreastForm({
                                ...breastForm,
                                dischargeType: e.target.value,
                              })
                            }
                            className="px-3 py-2 border rounded-lg text-sm"
                          />
                          <select
                            value={breastForm.dischargeLocation || ""}
                            onChange={(e) =>
                              setBreastForm({
                                ...breastForm,
                                dischargeLocation: e.target.value as Laterality,
                              })
                            }
                            className="px-3 py-2 border rounded-lg text-sm"
                          >
                            <option value="">Location</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                            <option value="bilateral">Bilateral</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nipple Changes */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Nipple Changes
                    </h4>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={breastForm.nippleInversion}
                        onChange={(e) =>
                          setBreastForm({
                            ...breastForm,
                            nippleInversion: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">
                        Nipple Inversion/Retraction
                      </span>
                    </label>
                    {breastForm.nippleInversion && (
                      <select
                        value={breastForm.nippleInversionLaterality || ""}
                        onChange={(e) =>
                          setBreastForm({
                            ...breastForm,
                            nippleInversionLaterality: e.target
                              .value as Laterality,
                          })
                        }
                        className="mt-2 px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="">Laterality</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="bilateral">Bilateral</option>
                      </select>
                    )}
                  </div>

                  {/* Lymph Nodes */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Lymph Nodes
                    </h4>
                    <select
                      value={breastForm.lymphNodeStatus}
                      onChange={(e) =>
                        setBreastForm({
                          ...breastForm,
                          lymphNodeStatus: e.target.value as LymphNodeStatus,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="normal">Normal</option>
                      <option value="enlarged">Enlarged</option>
                    </select>
                    {breastForm.lymphNodeStatus === "enlarged" && (
                      <input
                        type="text"
                        placeholder="Location of enlarged nodes"
                        value={breastForm.lymphNodeLocation || ""}
                        onChange={(e) =>
                          setBreastForm({
                            ...breastForm,
                            lymphNodeLocation: e.target.value,
                          })
                        }
                        className="mt-2 w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    )}
                  </div>

                  {/* Summary Findings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Summary Findings *
                    </label>
                    <textarea
                      required
                      value={breastForm.summaryFindings}
                      onChange={(e) =>
                        setBreastForm({
                          ...breastForm,
                          summaryFindings: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter detailed summary of examination findings..."
                    />
                  </div>

                  {/* Risk Assessment */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Risk Assessment *
                      </label>
                      <select
                        value={breastForm.riskAssessment}
                        onChange={(e) =>
                          setBreastForm({
                            ...breastForm,
                            riskAssessment: e.target.value as BreastRiskLevel,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      >
                        <option value="low">Low Risk</option>
                        <option value="moderate">Moderate Risk</option>
                        <option value="high">High Risk</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={breastForm.referralRequired || false}
                          onChange={(e) =>
                            setBreastForm({
                              ...breastForm,
                              referralRequired: e.target.checked,
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Referral Required
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recommendations
                    </label>
                    <textarea
                      value={breastForm.recommendations || ""}
                      onChange={(e) =>
                        setBreastForm({
                          ...breastForm,
                          recommendations: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter recommendations..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowResultModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      disabled={resultLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resultLoading}
                      className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-pink-400"
                    >
                      {resultLoading ? "Saving..." : "Save Result"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      {/* Follow-up Scheduling Modal */}
      {showFollowupModal && patient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Schedule Follow-up</h3>
              <button
                onClick={() => setShowFollowupModal(false)}
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

            <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700">
                <strong>Patient:</strong> {patient.full_name}
              </p>
            </div>

            {followupSuccess && (
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
                Follow-up scheduled successfully!
              </div>
            )}

            {followupError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {followupError}
              </div>
            )}

            {!followupSuccess && (
              <form onSubmit={handleSubmitFollowup} className="space-y-4">
                {/* Follow-up Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={followupForm.followupDate}
                    onChange={(e) =>
                      setFollowupForm({
                        ...followupForm,
                        followupDate: e.target.value,
                      })
                    }
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Follow-up Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={followupForm.followupTime || "09:00"}
                    onChange={(e) =>
                      setFollowupForm({
                        ...followupForm,
                        followupTime: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Follow-up Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up Type *
                  </label>
                  <select
                    required
                    value={followupForm.followupType}
                    onChange={(e) =>
                      setFollowupForm({
                        ...followupForm,
                        followupType: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Specialist Consultation">
                      Specialist Consultation
                    </option>
                    <option value="Lab Results Review">
                      Lab Results Review
                    </option>
                    <option value="Routine Check-up">Routine Check-up</option>
                    <option value="Treatment Follow-up">
                      Treatment Follow-up
                    </option>
                    <option value="Screening Re-test">Screening Re-test</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Follow-up Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions
                  </label>
                  <textarea
                    value={followupForm.followupInstructions || ""}
                    onChange={(e) =>
                      setFollowupForm({
                        ...followupForm,
                        followupInstructions: e.target.value,
                      })
                    }
                    rows={2}
                    placeholder="e.g., Further testing required, Bring previous results..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* SMS Reminder Toggle */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">
                        Send SMS Reminder
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={followupForm.sendSmsReminder}
                        onChange={(e) =>
                          setFollowupForm({
                            ...followupForm,
                            sendSmsReminder: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {followupForm.sendSmsReminder && (
                    <div className="mt-3">
                      <label className="block text-sm text-gray-600 mb-1">
                        Reminder Days Before
                      </label>
                      <select
                        value={followupForm.reminderDaysBefore || 1}
                        onChange={(e) =>
                          setFollowupForm({
                            ...followupForm,
                            reminderDaysBefore: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                      >
                        <option value={1}>1 Day Before</option>
                        <option value={2}>2 Days Before</option>
                        <option value={3}>3 Days Before</option>
                        <option value={5}>5 Days Before</option>
                        <option value={7}>1 Week Before</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFollowupModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={followupLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={followupLoading}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400"
                  >
                    {followupLoading ? "Scheduling..." : "Schedule Follow-up"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {showSmsModal && patient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                Send SMS
              </h3>
              <button
                onClick={() => setShowSmsModal(false)}
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

            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                <strong>To:</strong> {patient.full_name}
              </p>
              <p className="text-sm text-green-600">
                <strong>Phone:</strong> {patient.phone}
              </p>
            </div>

            {smsSuccess && (
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
                SMS sent successfully!
              </div>
            )}

            {smsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {smsError}
              </div>
            )}

            {!smsSuccess && (
              <form onSubmit={handleSendSms} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    required
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Type your message here..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {smsMessage.length}/1000 characters
                  </p>
                </div>

                {/* Quick Templates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Templates
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const facilityInfo = patient.facility_name
                          ? (patient.facility_address
                            ? `${patient.facility_name}, ${patient.facility_address}`
                            : patient.facility_name)
                          : 'your PHC center';
                        setSmsMessage(
                          `Dear ${patient.full_name}, this is a reminder about your upcoming appointment. Please visit ${facilityInfo}. - LSHD1`
                        );
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                    >
                      Appointment Reminder
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const facilityInfo = patient.facility_name
                          ? (patient.facility_address
                            ? `${patient.facility_name}, ${patient.facility_address}`
                            : patient.facility_name)
                          : 'your PHC center';
                        setSmsMessage(
                          `Dear ${patient.full_name}, your test results are ready. Please visit ${facilityInfo} to collect them. - LSHD1`
                        );
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                    >
                      Results Ready
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSmsMessage(
                          `Dear ${patient.full_name}, please remember to take your medications as prescribed. - LSHD1`
                        )
                      }
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                    >
                      Medication Reminder
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowSmsModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={smsLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={smsLoading || !smsMessage.trim()}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center justify-center gap-2"
                  >
                    {smsLoading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
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
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                        Send SMS
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Doctor's Note Modal */}
      {showDoctorNoteModal && selectedScreeningForNote && patient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Doctor&apos;s Assessment Note</h3>
              <button
                onClick={() => setShowDoctorNoteModal(false)}
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

            {/* Patient & Screening Info */}
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center">
                  <span className="text-indigo-700 font-bold text-lg">
                    {patient.full_name?.split(" ").map((n) => n[0]).join("") || "P"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{patient.full_name}</p>
                  <p className="text-sm text-gray-500">
                    ID: {patient.client_id} | {selectedScreeningForNote.notificationType.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Session: {selectedScreeningForNote.sessionId} | {formatDate(selectedScreeningForNote.screeningDate)}
                  </p>
                </div>
                {selectedScreeningForNote.vitals?.bloodPressureSystolic && (
                  <div className="text-right">
                    <p className={`font-medium ${getBpCategory(selectedScreeningForNote.vitals.bloodPressureSystolic, selectedScreeningForNote.vitals.bloodPressureDiastolic).color}`}>
                      BP: {selectedScreeningForNote.vitals.bloodPressureSystolic}/{selectedScreeningForNote.vitals.bloodPressureDiastolic}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getBpCategory(selectedScreeningForNote.vitals.bloodPressureSystolic, selectedScreeningForNote.vitals.bloodPressureDiastolic).label}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {doctorNoteSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Doctor&apos;s note saved successfully!
              </div>
            )}

            {doctorNoteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {doctorNoteError}
              </div>
            )}

            {!doctorNoteSuccess && (
              <form onSubmit={handleSaveDoctorNote} className="space-y-4">
                {/* Clinical Assessment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinical Assessment *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter clinical findings and assessment..."
                    value={doctorNoteForm.clinicalAssessment}
                    onChange={(e) => setDoctorNoteForm({ ...doctorNoteForm, clinicalAssessment: e.target.value })}
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
                    value={doctorNoteForm.recommendations}
                    onChange={(e) => setDoctorNoteForm({ ...doctorNoteForm, recommendations: e.target.value })}
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
                    value={doctorNoteForm.prescription}
                    onChange={(e) => setDoctorNoteForm({ ...doctorNoteForm, prescription: e.target.value })}
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
                      value={doctorNoteForm.patientStatus}
                      onChange={(e) => setDoctorNoteForm({ ...doctorNoteForm, patientStatus: e.target.value as typeof doctorNoteForm.patientStatus })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="abnormal">Abnormal</option>
                      <option value="critical">Critical</option>
                      <option value="requires_followup">Requires Follow-up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Referral Facility (if applicable)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter referral facility..."
                      value={doctorNoteForm.referralFacility}
                      onChange={(e) => setDoctorNoteForm({ ...doctorNoteForm, referralFacility: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Next Appointment */}
                {doctorNoteForm.patientStatus === "requires_followup" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Next Appointment Date
                    </label>
                    <input
                      type="date"
                      value={doctorNoteForm.nextAppointment}
                      onChange={(e) => setDoctorNoteForm({ ...doctorNoteForm, nextAppointment: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDoctorNoteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={doctorNoteLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={doctorNoteLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2"
                  >
                    {doctorNoteLoading ? (
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

      {/* Vitals Recording Modal */}
      {showVitalsModal && patient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                Record Vitals
              </h3>
              <button
                onClick={() => setShowVitalsModal(false)}
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

            <div className="mb-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
              <p className="text-sm text-teal-700">
                <strong>Patient:</strong> {patient.full_name} ({patient.client_id})
              </p>
            </div>

            {vitalsSuccess && (
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
                Vitals recorded successfully!
              </div>
            )}

            {vitalsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {vitalsError}
              </div>
            )}

            {!vitalsSuccess && (
              <form onSubmit={handleRecordVitals} className="space-y-4">
                {/* Blood Pressure - Required */}
                <div className="border rounded-lg p-4 bg-red-50">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Blood Pressure *
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Systolic (mmHg)</label>
                      <input
                        type="number"
                        required
                        min="60"
                        max="250"
                        value={vitalsForm.systolicBp}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, systolicBp: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g., 120"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Diastolic (mmHg)</label>
                      <input
                        type="number"
                        required
                        min="40"
                        max="150"
                        value={vitalsForm.diastolicBp}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, diastolicBp: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g., 80"
                      />
                    </div>
                  </div>
                </div>

                {/* Other Vitals - Optional */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="30"
                      max="45"
                      value={vitalsForm.temperature}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., 36.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pulse Rate (bpm)</label>
                    <input
                      type="number"
                      min="30"
                      max="200"
                      value={vitalsForm.pulseRate}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, pulseRate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., 72"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Respiratory Rate</label>
                    <input
                      type="number"
                      min="8"
                      max="60"
                      value={vitalsForm.respiratoryRate}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, respiratoryRate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., 16"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="500"
                      value={vitalsForm.weight}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, weight: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., 70"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="30"
                      max="300"
                      value={vitalsForm.height}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, height: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., 170"
                    />
                  </div>
                </div>

                {/* Blood Sugar */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Blood Sugar (Optional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Random (mg/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="1000"
                        value={vitalsForm.bloodSugarRandom}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, bloodSugarRandom: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                        placeholder="Random blood sugar"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Fasting (mg/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="1000"
                        value={vitalsForm.bloodSugarFasting}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, bloodSugarFasting: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                        placeholder="Fasting blood sugar"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={vitalsForm.notes}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Additional observations..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowVitalsModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={vitalsLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={vitalsLoading}
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400 flex items-center justify-center gap-2"
                  >
                    {vitalsLoading ? (
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
    </div>
  );
}
