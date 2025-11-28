'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { User, Screening, UpdateVitalsDto, Patient, NotificationType } from '@/types';

interface ChoDashboardStats {
  pendingVitals: number;
  screeningsToday: number;
  completedToday: number;
  totalPatients: number;
}

interface VitalsForm extends UpdateVitalsDto {
  height?: number;
  respiratoryRate?: number;
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

export default function ChoDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ChoDashboardStats>({
    pendingVitals: 0,
    screeningsToday: 0,
    completedToday: 0,
    totalPatients: 0,
  });
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([]);
  const [activeTab, setActiveTab] = useState<'vitals' | 'screenings' | 'completed'>('vitals');
  const [loading, setLoading] = useState(true);

  // Vitals modal state
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedScreening, setSelectedScreening] = useState<Screening | null>(null);
  const [vitalsForm, setVitalsForm] = useState<VitalsForm>(initialVitalsForm);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsError, setVitalsError] = useState<string | null>(null);
  const [vitalsSuccess, setVitalsSuccess] = useState(false);

  // New screening modal state
  const [showScreeningModal, setShowScreeningModal] = useState(false);
  const [newScreening, setNewScreening] = useState({ clientId: '', notificationTypeId: '' });
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [screeningError, setScreeningError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Redirect non-CHO to appropriate dashboard
    if (parsedUser.role?.id !== 'cho' && parsedUser.role?.id !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [screeningsData, patientsData, typesData] = await Promise.all([
        api.getScreenings(),
        api.getClients(),
        api.getNotificationTypes(),
      ]);

      setScreenings(screeningsData);
      setPatients(patientsData);
      setNotificationTypes(typesData);

      // Calculate CHO-specific stats
      const today = new Date().toDateString();
      const todayScreenings = screeningsData.filter(
        (s) => new Date(s.createdAt).toDateString() === today
      );

      setStats({
        pendingVitals: screeningsData.filter((s) => s.status === 'pending').length,
        screeningsToday: todayScreenings.length,
        completedToday: todayScreenings.filter((s) => s.status === 'completed').length,
        totalPatients: patientsData.length,
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

  const openVitalsModal = (screening: Screening) => {
    setSelectedScreening(screening);
    setVitalsForm(initialVitalsForm);
    setVitalsError(null);
    setVitalsSuccess(false);
    setShowVitalsModal(true);
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

  const handleCreateScreening = async (e: FormEvent) => {
    e.preventDefault();
    setScreeningError(null);
    setScreeningLoading(true);

    try {
      await api.createScreening({
        clientId: parseInt(newScreening.clientId),
        notificationTypeId: parseInt(newScreening.notificationTypeId),
      });
      setShowScreeningModal(false);
      setNewScreening({ clientId: '', notificationTypeId: '' });
      fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create screening';
      setScreeningError(errorMessage);
      console.error('Create screening error:', err);
    } finally {
      setScreeningLoading(false);
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

  const filteredScreenings = (() => {
    if (activeTab === 'vitals') return screenings.filter((s) => s.status === 'pending');
    if (activeTab === 'screenings') return screenings.filter((s) => s.status === 'in_progress' || s.status === 'follow_up');
    if (activeTab === 'completed') return screenings.filter((s) => s.status === 'completed');
    return [];
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">CHO Dashboard</h1>
              <p className="text-xs text-gray-500">{user?.facility?.name || 'LSHD1 Screening System'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-gray-800">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500">Community Health Officer</p>
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
            {(['vitals', 'screenings', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize ${
                  activeTab === tab
                    ? 'text-teal-600 border-b-2 border-teal-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'vitals' ? 'Pending Vitals' : tab === 'screenings' ? 'In Progress' : 'Completed'}
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
                <p className="text-gray-500 text-sm">Pending Vitals</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingVitals}</p>
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
                <p className="text-gray-500 text-sm">Screenings Today</p>
                <p className="text-3xl font-bold text-blue-600">{stats.screeningsToday}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
                <p className="text-gray-500 text-sm">Total Patients</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalPatients}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setShowScreeningModal(true)}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
            >
              <span>+</span> Start New Screening
            </button>
          </div>
        </div>

        {/* Screenings Table */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              {activeTab === 'vitals' && 'Patients Awaiting Vitals'}
              {activeTab === 'screenings' && 'Screenings In Progress'}
              {activeTab === 'completed' && 'Completed Screenings'}
            </h2>
            <p className="text-sm text-gray-500">
              {activeTab === 'vitals' && 'Record vital signs for patients before their screening'}
              {activeTab === 'screenings' && 'Patients currently being screened'}
              {activeTab === 'completed' && 'Recently completed screening sessions'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Screening Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
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
                      <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs">
                        {s.notificationType?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          s.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : s.status === 'in_progress' || s.status === 'follow_up'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {s.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(s.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {s.status === 'pending' && (
                          <button
                            onClick={() => openVitalsModal(s)}
                            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            Vitals
                          </button>
                        )}
                        {(s.status === 'in_progress' || s.status === 'follow_up') && (
                          <button
                            onClick={() => router.push(`/screenings/${s.id}`)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                          >
                            Continue
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500">
                  {activeTab === 'vitals' && 'No patients waiting for vitals'}
                  {activeTab === 'screenings' && 'No screenings in progress'}
                  {activeTab === 'completed' && 'No completed screenings'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

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

      {/* New Screening Modal */}
      {showScreeningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Start New Screening</h3>
            {screeningError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {screeningError}
              </div>
            )}
            <form onSubmit={handleCreateScreening} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient *</label>
                <select
                  required
                  value={newScreening.clientId}
                  onChange={(e) => setNewScreening({ ...newScreening, clientId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Select Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.client_id} - {p.first_name} {p.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Screening Type *</label>
                <select
                  required
                  value={newScreening.notificationTypeId}
                  onChange={(e) => setNewScreening({ ...newScreening, notificationTypeId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Select Type --</option>
                  {notificationTypes.map((t) => (
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
                    setShowScreeningModal(false);
                    setScreeningError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={screeningLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={screeningLoading}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400"
                >
                  {screeningLoading ? 'Creating...' : 'Start Screening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
