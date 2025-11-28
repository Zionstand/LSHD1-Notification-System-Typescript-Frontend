'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { User, Screening, UpdateVitalsDto } from '@/types';

interface DoctorDashboardStats {
  pendingReview: number;
  assessedToday: number;
  followUpRequired: number;
  totalToday: number;
}

interface VitalsForm extends UpdateVitalsDto {
  height?: number;
  respiratoryRate?: number;
}

interface AssessmentForm {
  clinicalAssessment: string;
  recommendations: string;
  prescription: string;
  patientStatus: 'normal' | 'abnormal' | 'critical' | 'requires_followup';
  referralFacility: string;
  nextAppointment: string;
}

const initialVitalsForm: VitalsForm = {
  systolicBp: 0,
  diastolicBp: 0,
  weight: undefined,
  pulseRate: undefined,
  temperature: undefined,
  height: undefined,
  respiratoryRate: undefined,
};

const initialAssessmentForm: AssessmentForm = {
  clinicalAssessment: '',
  recommendations: '',
  prescription: '',
  patientStatus: 'normal',
  referralFacility: '',
  nextAppointment: '',
};

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DoctorDashboardStats>({
    pendingReview: 0,
    assessedToday: 0,
    followUpRequired: 0,
    totalToday: 0,
  });
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [allScreenings, setAllScreenings] = useState<Screening[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'assessed' | 'followup'>('pending');
  const [loading, setLoading] = useState(true);

  // Assessment modal state
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [selectedScreening, setSelectedScreening] = useState<Screening | null>(null);
  const [assessmentForm, setAssessmentForm] = useState<AssessmentForm>(initialAssessmentForm);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [assessmentSuccess, setAssessmentSuccess] = useState(false);

  // Vitals modal state
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsForm, setVitalsForm] = useState<VitalsForm>(initialVitalsForm);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsError, setVitalsError] = useState<string | null>(null);
  const [vitalsSuccess, setVitalsSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Redirect non-doctors to appropriate dashboard
    if (parsedUser.role?.id !== 'doctor' && parsedUser.role?.id !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      // Get pending screenings for doctor review
      const pendingData = await api.getPendingDoctorReview();
      setScreenings(pendingData);

      // Get all screenings for stats
      const allData = await api.getScreenings();
      setAllScreenings(allData);

      // Calculate doctor-specific stats
      const today = new Date().toDateString();
      const todayScreenings = allData.filter(
        (s) => new Date(s.createdAt).toDateString() === today
      );

      setStats({
        pendingReview: pendingData.length,
        assessedToday: todayScreenings.filter((s) => s.status === 'completed').length,
        followUpRequired: allData.filter((s) => s.status === 'follow_up').length,
        totalToday: todayScreenings.length,
      });
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    api.logout();
    router.push('/');
  };

  const openAssessmentModal = (screening: Screening) => {
    setSelectedScreening(screening);
    setAssessmentForm(initialAssessmentForm);
    setAssessmentError(null);
    setAssessmentSuccess(false);
    setShowAssessmentModal(true);
  };

  const openVitalsModal = (screening: Screening) => {
    setSelectedScreening(screening);
    // Pre-fill with existing vitals if any
    setVitalsForm({
      systolicBp: screening.vitals?.bloodPressureSystolic || 0,
      diastolicBp: screening.vitals?.bloodPressureDiastolic || 0,
      weight: screening.vitals?.weight || undefined,
      pulseRate: screening.vitals?.pulseRate || undefined,
      temperature: screening.vitals?.temperature || undefined,
      height: undefined,
      respiratoryRate: undefined,
    });
    setVitalsError(null);
    setVitalsSuccess(false);
    setShowVitalsModal(true);
  };

  const handleSaveAssessment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScreening) return;

    if (!assessmentForm.clinicalAssessment.trim()) {
      setAssessmentError('Clinical assessment is required');
      return;
    }

    setAssessmentError(null);
    setAssessmentLoading(true);

    try {
      await api.addDoctorAssessment(selectedScreening.id, {
        clinicalAssessment: assessmentForm.clinicalAssessment,
        recommendations: assessmentForm.recommendations || undefined,
        prescription: assessmentForm.prescription || undefined,
        patientStatus: assessmentForm.patientStatus,
        referralFacility: assessmentForm.referralFacility || undefined,
        nextAppointment: assessmentForm.nextAppointment || undefined,
      });

      setAssessmentSuccess(true);
      fetchData();

      setTimeout(() => {
        setShowAssessmentModal(false);
        setSelectedScreening(null);
        setAssessmentSuccess(false);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save assessment';
      setAssessmentError(errorMessage);
      console.error('Save assessment error:', err);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleRecordVitals = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScreening) return;

    if (!vitalsForm.systolicBp || !vitalsForm.diastolicBp) {
      setVitalsError('Systolic and Diastolic blood pressure are required');
      return;
    }

    setVitalsError(null);
    setVitalsLoading(true);

    try {
      await api.updateVitals(selectedScreening.id, {
        systolicBp: vitalsForm.systolicBp,
        diastolicBp: vitalsForm.diastolicBp,
        weight: vitalsForm.weight,
        pulseRate: vitalsForm.pulseRate,
        temperature: vitalsForm.temperature,
      });

      setVitalsSuccess(true);
      fetchData();

      setTimeout(() => {
        setShowVitalsModal(false);
        setSelectedScreening(null);
        setVitalsSuccess(false);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record vitals';
      setVitalsError(errorMessage);
      console.error('Record vitals error:', err);
    } finally {
      setVitalsLoading(false);
    }
  };

  const getBpCategory = (systolic: number, diastolic: number): { label: string; color: string } => {
    if (systolic < 120 && diastolic < 80) {
      return { label: 'Normal', color: 'text-green-600' };
    } else if (systolic < 130 && diastolic < 80) {
      return { label: 'Elevated', color: 'text-yellow-600' };
    } else if (systolic < 140 || diastolic < 90) {
      return { label: 'High (Stage 1)', color: 'text-orange-600' };
    } else if (systolic >= 140 || diastolic >= 90) {
      return { label: 'High (Stage 2)', color: 'text-red-600' };
    } else if (systolic > 180 || diastolic > 120) {
      return { label: 'Crisis', color: 'text-red-800 font-bold' };
    }
    return { label: 'Unknown', color: 'text-gray-600' };
  };

  const getPatientStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-700';
      case 'abnormal': return 'bg-yellow-100 text-yellow-700';
      case 'critical': return 'bg-red-100 text-red-700';
      case 'requires_followup': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredScreenings = (() => {
    if (activeTab === 'pending') return screenings;
    if (activeTab === 'assessed') return allScreenings.filter((s) => s.status === 'completed');
    if (activeTab === 'followup') return allScreenings.filter((s) => s.status === 'follow_up');
    return [];
  })();

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
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Doctor Dashboard</h1>
              <p className="text-xs text-gray-500">{user?.facility?.name || 'LSHD1 Screening System'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-gray-800">Dr. {user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500">Physician</p>
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

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {(['pending', 'assessed', 'followup'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize ${
                  activeTab === tab
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'pending' ? 'Pending Review' : tab === 'assessed' ? 'Assessed' : 'Follow-up Required'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pending Review</p>
                <p className="text-3xl font-bold text-indigo-600">{stats.pendingReview}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Assessed Today</p>
                <p className="text-3xl font-bold text-green-600">{stats.assessedToday}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Follow-up Required</p>
                <p className="text-3xl font-bold text-orange-600">{stats.followUpRequired}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Today</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalToday}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Screenings Table */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              {activeTab === 'pending' && 'Patients Awaiting Assessment'}
              {activeTab === 'assessed' && 'Assessed Patients'}
              {activeTab === 'followup' && 'Patients Requiring Follow-up'}
            </h2>
            <p className="text-sm text-gray-500">
              {activeTab === 'pending' && 'Review vitals and provide clinical assessment'}
              {activeTab === 'assessed' && 'Patients with completed assessments'}
              {activeTab === 'followup' && 'Patients scheduled for follow-up care'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Screening Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vitals</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredScreenings.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.sessionId}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <p className="font-medium">{s.client?.firstName} {s.client?.lastName}</p>
                        <p className="text-xs text-gray-500">{s.client?.clientId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                        {s.notificationType?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {s.vitals?.bloodPressureSystolic && s.vitals?.bloodPressureDiastolic ? (
                        <div>
                          <p className={`font-medium ${getBpCategory(s.vitals.bloodPressureSystolic, s.vitals.bloodPressureDiastolic).color}`}>
                            BP: {s.vitals.bloodPressureSystolic}/{s.vitals.bloodPressureDiastolic}
                          </p>
                          <p className="text-xs text-gray-400">
                            {s.vitals.temperature && `Temp: ${s.vitals.temperature}°C`}
                            {s.vitals.pulseRate && ` | Pulse: ${s.vitals.pulseRate}`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Not recorded</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          s.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : s.status === 'follow_up'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {s.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {activeTab === 'pending' && (
                          <>
                            <button
                              onClick={() => openAssessmentModal(s)}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Assess
                            </button>
                            <button
                              onClick={() => openVitalsModal(s)}
                              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              Vitals
                            </button>
                          </>
                        )}
                        {activeTab === 'followup' && (
                          <button
                            onClick={() => router.push(`/screenings/${s.id}`)}
                            className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/patients/${s.client?.id}`)}
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1"
                          title="View patient history"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredScreenings.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500">
                  {activeTab === 'pending' && 'No patients pending review'}
                  {activeTab === 'assessed' && 'No assessed patients'}
                  {activeTab === 'followup' && 'No patients requiring follow-up'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Doctor Assessment Modal */}
      {showAssessmentModal && selectedScreening && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Doctor&apos;s Assessment</h3>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Patient Info */}
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center">
                  <span className="text-indigo-700 font-bold text-lg">
                    {selectedScreening.client?.firstName?.[0]}{selectedScreening.client?.lastName?.[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {selectedScreening.client?.firstName} {selectedScreening.client?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {selectedScreening.client?.clientId} | {selectedScreening.notificationType?.name}
                  </p>
                </div>
                {selectedScreening.vitals?.bloodPressureSystolic && (
                  <div className="text-right">
                    <p className={`font-medium ${getBpCategory(selectedScreening.vitals.bloodPressureSystolic, selectedScreening.vitals.bloodPressureDiastolic || 0).color}`}>
                      BP: {selectedScreening.vitals.bloodPressureSystolic}/{selectedScreening.vitals.bloodPressureDiastolic}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getBpCategory(selectedScreening.vitals.bloodPressureSystolic, selectedScreening.vitals.bloodPressureDiastolic || 0).label}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {assessmentSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Assessment saved successfully!
              </div>
            )}

            {assessmentError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {assessmentError}
              </div>
            )}

            {!assessmentSuccess && (
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
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, clinicalAssessment: e.target.value })}
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
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, recommendations: e.target.value })}
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
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, prescription: e.target.value })}
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
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, patientStatus: e.target.value as AssessmentForm['patientStatus'] })}
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
                      value={assessmentForm.referralFacility}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, referralFacility: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Next Appointment */}
                {assessmentForm.patientStatus === 'requires_followup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Next Appointment Date
                    </label>
                    <input
                      type="date"
                      value={assessmentForm.nextAppointment}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, nextAppointment: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAssessmentModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={assessmentLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assessmentLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2"
                  >
                    {assessmentLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Assessment
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Record Vitals Modal */}
      {showVitalsModal && selectedScreening && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Record Vital Signs</h3>
              <button
                onClick={() => setShowVitalsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Patient Info */}
            <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-200 rounded-full flex items-center justify-center">
                  <span className="text-teal-700 font-bold text-lg">
                    {selectedScreening.client?.firstName?.[0]}{selectedScreening.client?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedScreening.client?.firstName} {selectedScreening.client?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {selectedScreening.client?.clientId} | {selectedScreening.notificationType?.name}
                  </p>
                </div>
              </div>
            </div>

            {vitalsSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Vital signs recorded successfully!
              </div>
            )}

            {vitalsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {vitalsError}
              </div>
            )}

            {!vitalsSuccess && (
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
                        value={vitalsForm.systolicBp || ''}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, systolicBp: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Systolic (top)</p>
                    </div>
                    <span className="text-xl font-bold text-gray-400">/</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        required
                        min="40"
                        max="150"
                        placeholder="Diastolic"
                        value={vitalsForm.diastolicBp || ''}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, diastolicBp: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Diastolic (bottom)</p>
                    </div>
                  </div>
                  {vitalsForm.systolicBp > 0 && vitalsForm.diastolicBp > 0 && (
                    <p className={`text-sm mt-2 ${getBpCategory(vitalsForm.systolicBp, vitalsForm.diastolicBp).color}`}>
                      BP Category: {getBpCategory(vitalsForm.systolicBp, vitalsForm.diastolicBp).label}
                    </p>
                  )}
                </div>

                {/* Weight and Pulse Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      step="0.1"
                      placeholder="e.g., 70"
                      value={vitalsForm.weight || ''}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, weight: parseFloat(e.target.value) || undefined })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pulse Rate (bpm)</label>
                    <input
                      type="number"
                      min="30"
                      max="200"
                      placeholder="e.g., 72"
                      value={vitalsForm.pulseRate || ''}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, pulseRate: parseInt(e.target.value) || undefined })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    min="35"
                    max="42"
                    step="0.1"
                    placeholder="e.g., 36.5"
                    value={vitalsForm.temperature || ''}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
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
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Record Vitals
                      </>
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
