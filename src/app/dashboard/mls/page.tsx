'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { User, Screening, CreateDiabetesScreeningDto, CreatePsaScreeningDto, DiabetesTestType } from '@/types';

interface MlsDashboardStats {
  pendingLabTests: number;
  inProgressTests: number;
  completedToday: number;
  totalToday: number;
}

// Diabetes screening form
interface DiabetesForm {
  testType: DiabetesTestType;
  bloodSugarLevel: number | undefined;
  fastingDurationHours?: number;
  testTime: string;
  clinicalObservations?: string;
  referToDoctor: boolean;
  referralReason?: string;
}

const initialDiabetesForm: DiabetesForm = {
  testType: 'random',
  bloodSugarLevel: undefined,
  fastingDurationHours: undefined,
  testTime: new Date().toTimeString().slice(0, 5),
  clinicalObservations: '',
  referToDoctor: false,
  referralReason: '',
};

// PSA screening form
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

const initialPsaForm: PsaForm = {
  psaLevel: undefined,
  testMethod: 'immunoassay',
  testKit: '',
  collectionTime: new Date().toTimeString().slice(0, 5),
  sampleQuality: 'good',
  sampleQualityNotes: '',
  patientAge: undefined,
  normalRangeMax: 4.0,
  resultInterpretation: '',
  clinicalObservations: '',
  referToDoctor: false,
  referralReason: '',
};

export default function MlsDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<MlsDashboardStats>({
    pendingLabTests: 0,
    inProgressTests: 0,
    completedToday: 0,
    totalToday: 0,
  });
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'screening' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);

  // Screening modal state
  const [showScreeningModal, setShowScreeningModal] = useState(false);
  const [selectedScreening, setSelectedScreening] = useState<Screening | null>(null);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [screeningError, setScreeningError] = useState<string | null>(null);
  const [screeningSuccess, setScreeningSuccess] = useState(false);

  // Diabetes form state
  const [diabetesForm, setDiabetesForm] = useState<DiabetesForm>(initialDiabetesForm);

  // PSA form state
  const [psaForm, setPsaForm] = useState<PsaForm>(initialPsaForm);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Redirect non-MLS to appropriate dashboard
    if (parsedUser.role?.id !== 'mls' && parsedUser.role?.id !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const screeningsData = await api.getScreenings();
      setScreenings(screeningsData);

      // Calculate MLS-specific stats
      const today = new Date().toDateString();
      const todayScreenings = screeningsData.filter(
        (s) => new Date(s.createdAt).toDateString() === today
      );

      // Filter screenings that need lab tests (diabetes, PSA screening types)
      const labScreeningTypes = ['Diabetes Screening', 'PSA Screening'];
      const labScreenings = screeningsData.filter(
        (s) => labScreeningTypes.includes(s.notificationType?.name || '')
      );
      const pendingLabScreenings = labScreenings.filter((s) => s.status === 'pending');
      const inProgressLabScreenings = labScreenings.filter((s) => s.status === 'in_progress');

      setStats({
        pendingLabTests: pendingLabScreenings.length,
        inProgressTests: inProgressLabScreenings.length,
        completedToday: todayScreenings.filter((s) => s.status === 'completed').length,
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

  const openScreeningModal = (screening: Screening) => {
    setSelectedScreening(screening);
    setDiabetesForm(initialDiabetesForm);
    setPsaForm(initialPsaForm);
    setScreeningError(null);
    setScreeningSuccess(false);
    setShowScreeningModal(true);
  };

  const handleDiabetesScreening = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScreening) return;

    if (!diabetesForm.bloodSugarLevel) {
      setScreeningError('Blood sugar level is required');
      return;
    }

    setScreeningError(null);
    setScreeningLoading(true);

    try {
      const data: CreateDiabetesScreeningDto = {
        testType: diabetesForm.testType,
        bloodSugarLevel: diabetesForm.bloodSugarLevel,
        testTime: diabetesForm.testTime,
        fastingDurationHours: diabetesForm.testType === 'fasting' ? diabetesForm.fastingDurationHours : undefined,
        clinicalObservations: diabetesForm.clinicalObservations,
        referToDoctor: diabetesForm.referToDoctor,
        referralReason: diabetesForm.referToDoctor ? diabetesForm.referralReason : undefined,
      };

      await api.createDiabetesScreening(selectedScreening.id, data);
      setScreeningSuccess(true);
      fetchData();

      setTimeout(() => {
        setShowScreeningModal(false);
        setSelectedScreening(null);
        setScreeningSuccess(false);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record diabetes screening';
      setScreeningError(errorMessage);
      console.error('Diabetes screening error:', err);
    } finally {
      setScreeningLoading(false);
    }
  };

  const handlePsaScreening = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScreening) return;

    if (!psaForm.psaLevel) {
      setScreeningError('PSA level is required');
      return;
    }

    if (!psaForm.patientAge) {
      setScreeningError('Patient age is required');
      return;
    }

    setScreeningError(null);
    setScreeningLoading(true);

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
        referralReason: psaForm.referToDoctor ? psaForm.referralReason : undefined,
      };

      await api.createPsaScreening(selectedScreening.id, data);
      setScreeningSuccess(true);
      fetchData();

      setTimeout(() => {
        setShowScreeningModal(false);
        setSelectedScreening(null);
        setScreeningSuccess(false);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record PSA screening';
      setScreeningError(errorMessage);
      console.error('PSA screening error:', err);
    } finally {
      setScreeningLoading(false);
    }
  };

  const getBloodSugarCategory = (value: number, isFasting: boolean): { label: string; color: string } => {
    if (isFasting) {
      if (value < 100) return { label: 'Normal', color: 'text-green-600' };
      if (value < 126) return { label: 'Prediabetes', color: 'text-yellow-600' };
      return { label: 'Diabetes', color: 'text-red-600' };
    } else {
      if (value < 140) return { label: 'Normal', color: 'text-green-600' };
      if (value < 200) return { label: 'Prediabetes', color: 'text-yellow-600' };
      return { label: 'Diabetes', color: 'text-red-600' };
    }
  };

  const getPsaCategory = (value: number): { label: string; color: string } => {
    if (value < 4) return { label: 'Normal', color: 'text-green-600' };
    if (value < 10) return { label: 'Slightly Elevated', color: 'text-yellow-600' };
    return { label: 'Elevated', color: 'text-red-600' };
  };

  // Filter screenings for lab work
  const labScreeningTypes = ['Diabetes Screening', 'PSA Screening'];
  const filteredScreenings = screenings.filter((s) => {
    const isLabType = labScreeningTypes.includes(s.notificationType?.name || '');
    if (activeTab === 'pending') return isLabType && s.status === 'pending';
    if (activeTab === 'screening') return isLabType && s.status === 'in_progress';
    if (activeTab === 'completed') return isLabType && s.status === 'completed';
    return false;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">MLS Dashboard</h1>
              <p className="text-xs text-gray-500">{user?.facility?.name || 'LSHD1 Screening System'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-gray-800">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500">Medical Lab Scientist</p>
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
            {(['pending', 'screening', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize ${
                  activeTab === tab
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'pending' ? 'Awaiting Vitals' : tab === 'screening' ? 'Ready for Screening' : 'Completed'}
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
                <p className="text-gray-500 text-sm">Awaiting Vitals</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingLabTests}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Ready for Screening</p>
                <p className="text-3xl font-bold text-orange-600">{stats.inProgressTests}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Completed Today</p>
                <p className="text-3xl font-bold text-green-600">{stats.completedToday}</p>
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
                <p className="text-gray-500 text-sm">Total Today</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalToday}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Lab Tests Table */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              {activeTab === 'pending' && 'Patients Awaiting Vitals'}
              {activeTab === 'screening' && 'Ready for Lab Screening'}
              {activeTab === 'completed' && 'Completed Screenings'}
            </h2>
            <p className="text-sm text-gray-500">
              {activeTab === 'pending' && 'Patients waiting for vitals to be recorded by nurse/CHO'}
              {activeTab === 'screening' && 'Patients with vitals recorded - perform diabetes or PSA screening'}
              {activeTab === 'completed' && 'Recently completed lab screenings'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
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
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                        {s.notificationType?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          s.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {s.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {s.status === 'pending' && (
                          <span className="text-sm text-yellow-600">Awaiting Vitals</span>
                        )}
                        {s.status === 'in_progress' && (
                          <button
                            onClick={() => openScreeningModal(s)}
                            className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            Perform Screening
                          </button>
                        )}
                        {s.status === 'completed' && (
                          <span className="text-sm text-green-600">Done</span>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <p className="text-gray-500">
                  {activeTab === 'pending' && 'No patients awaiting vitals'}
                  {activeTab === 'screening' && 'No patients ready for screening'}
                  {activeTab === 'completed' && 'No completed screenings'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Screening Modal */}
      {showScreeningModal && selectedScreening && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {selectedScreening.notificationType?.name === 'Diabetes Screening' ? 'Diabetes Screening' : 'PSA Screening'}
              </h3>
              <button
                onClick={() => setShowScreeningModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Patient Info */}
            <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                  <span className="text-orange-700 font-bold text-lg">
                    {selectedScreening.client?.firstName?.[0]}{selectedScreening.client?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedScreening.client?.firstName} {selectedScreening.client?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    ID: {selectedScreening.client?.clientId} | Session: {selectedScreening.sessionId}
                  </p>
                </div>
              </div>
              {/* Show vitals if available */}
              {selectedScreening.vitals && (
                <div className="mt-3 pt-3 border-t border-orange-200 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">BP:</span>{' '}
                    <span className="font-medium">
                      {selectedScreening.vitals.bloodPressureSystolic}/{selectedScreening.vitals.bloodPressureDiastolic} mmHg
                    </span>
                  </div>
                  {selectedScreening.vitals.weight && (
                    <div>
                      <span className="text-gray-500">Weight:</span>{' '}
                      <span className="font-medium">{selectedScreening.vitals.weight} kg</span>
                    </div>
                  )}
                  {selectedScreening.vitals.pulseRate && (
                    <div>
                      <span className="text-gray-500">Pulse:</span>{' '}
                      <span className="font-medium">{selectedScreening.vitals.pulseRate} bpm</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {screeningSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Screening recorded successfully!
              </div>
            )}

            {screeningError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {screeningError}
              </div>
            )}

            {!screeningSuccess && (
              <>
                {/* Diabetes Screening Form */}
                {selectedScreening.notificationType?.name === 'Diabetes Screening' && (
                  <form onSubmit={handleDiabetesScreening} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Test Type *</label>
                        <select
                          required
                          value={diabetesForm.testType}
                          onChange={(e) => setDiabetesForm({ ...diabetesForm, testType: e.target.value as DiabetesTestType })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="random">Random Blood Sugar</option>
                          <option value="fasting">Fasting Blood Sugar</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Test Time *</label>
                        <input
                          type="time"
                          required
                          value={diabetesForm.testTime}
                          onChange={(e) => setDiabetesForm({ ...diabetesForm, testTime: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {diabetesForm.testType === 'fasting' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fasting Duration (hours)</label>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          placeholder="e.g., 8"
                          value={diabetesForm.fastingDurationHours || ''}
                          onChange={(e) => setDiabetesForm({ ...diabetesForm, fastingDurationHours: parseInt(e.target.value) || undefined })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Blood Sugar Level (mg/dL) *</label>
                      <input
                        type="number"
                        required
                        min="20"
                        max="600"
                        step="0.1"
                        placeholder="e.g., 120"
                        value={diabetesForm.bloodSugarLevel || ''}
                        onChange={(e) => setDiabetesForm({ ...diabetesForm, bloodSugarLevel: parseFloat(e.target.value) || undefined })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                      {diabetesForm.bloodSugarLevel && (
                        <p className={`text-sm mt-1 ${getBloodSugarCategory(diabetesForm.bloodSugarLevel, diabetesForm.testType === 'fasting').color}`}>
                          Result: {getBloodSugarCategory(diabetesForm.bloodSugarLevel, diabetesForm.testType === 'fasting').label}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Observations</label>
                      <textarea
                        rows={2}
                        placeholder="Any observations during the test..."
                        value={diabetesForm.clinicalObservations || ''}
                        onChange={(e) => setDiabetesForm({ ...diabetesForm, clinicalObservations: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="diabetesReferToDoctor"
                        checked={diabetesForm.referToDoctor}
                        onChange={(e) => setDiabetesForm({ ...diabetesForm, referToDoctor: e.target.checked })}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <label htmlFor="diabetesReferToDoctor" className="text-sm text-gray-700">
                        Refer to Doctor for Review
                      </label>
                    </div>

                    {diabetesForm.referToDoctor && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Referral Reason</label>
                        <input
                          type="text"
                          placeholder="Reason for referral..."
                          value={diabetesForm.referralReason || ''}
                          onChange={(e) => setDiabetesForm({ ...diabetesForm, referralReason: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowScreeningModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={screeningLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={screeningLoading}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 flex items-center justify-center gap-2"
                      >
                        {screeningLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Recording...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Complete Screening
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* PSA Screening Form */}
                {selectedScreening.notificationType?.name === 'PSA Screening' && (
                  <form onSubmit={handlePsaScreening} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient Age *</label>
                        <input
                          type="number"
                          required
                          min="40"
                          max="100"
                          placeholder="e.g., 55"
                          value={psaForm.patientAge || ''}
                          onChange={(e) => setPsaForm({ ...psaForm, patientAge: parseInt(e.target.value) || undefined })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Collection Time *</label>
                        <input
                          type="time"
                          required
                          value={psaForm.collectionTime}
                          onChange={(e) => setPsaForm({ ...psaForm, collectionTime: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PSA Level (ng/mL) *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="e.g., 2.5"
                          value={psaForm.psaLevel || ''}
                          onChange={(e) => setPsaForm({ ...psaForm, psaLevel: parseFloat(e.target.value) || undefined })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                        {psaForm.psaLevel !== undefined && psaForm.psaLevel > 0 && (
                          <p className={`text-sm mt-1 ${getPsaCategory(psaForm.psaLevel).color}`}>
                            Result: {getPsaCategory(psaForm.psaLevel).label}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Normal Range Max (ng/mL)</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.1"
                          value={psaForm.normalRangeMax}
                          onChange={(e) => setPsaForm({ ...psaForm, normalRangeMax: parseFloat(e.target.value) || 4.0 })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Age-adjusted normal range</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Test Method</label>
                        <select
                          value={psaForm.testMethod || ''}
                          onChange={(e) => setPsaForm({ ...psaForm, testMethod: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="immunoassay">Immunoassay</option>
                          <option value="elisa">ELISA</option>
                          <option value="chemiluminescence">Chemiluminescence</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sample Quality</label>
                        <select
                          value={psaForm.sampleQuality}
                          onChange={(e) => setPsaForm({ ...psaForm, sampleQuality: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="good">Good</option>
                          <option value="adequate">Adequate</option>
                          <option value="poor">Poor</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Result Interpretation</label>
                      <textarea
                        rows={2}
                        placeholder="Interpretation of the PSA result..."
                        value={psaForm.resultInterpretation || ''}
                        onChange={(e) => setPsaForm({ ...psaForm, resultInterpretation: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Observations</label>
                      <textarea
                        rows={2}
                        placeholder="Any clinical observations..."
                        value={psaForm.clinicalObservations || ''}
                        onChange={(e) => setPsaForm({ ...psaForm, clinicalObservations: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="psaReferToDoctor"
                        checked={psaForm.referToDoctor}
                        onChange={(e) => setPsaForm({ ...psaForm, referToDoctor: e.target.checked })}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <label htmlFor="psaReferToDoctor" className="text-sm text-gray-700">
                        Refer to Doctor for Review
                      </label>
                    </div>

                    {psaForm.referToDoctor && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Referral Reason</label>
                        <input
                          type="text"
                          placeholder="Reason for referral..."
                          value={psaForm.referralReason || ''}
                          onChange={(e) => setPsaForm({ ...psaForm, referralReason: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowScreeningModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={screeningLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={screeningLoading}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 flex items-center justify-center gap-2"
                      >
                        {screeningLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Recording...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Complete Screening
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
