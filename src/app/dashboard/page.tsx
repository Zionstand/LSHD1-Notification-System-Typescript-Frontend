'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { User, DashboardStats, Patient, Screening, NotificationType, CreatePatientDto, Appointment, CreateAppointmentDto, Facility, CreateFacilityDto } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    todayScreenings: 0,
    pendingScreenings: 0,
    completedToday: 0,
  });
  const [clients, setClients] = useState<Patient[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'screenings' | 'appointments' | 'phc_centers'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showScreeningModal, setShowScreeningModal] = useState(false);
  const [newClient, setNewClient] = useState<CreatePatientDto>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'Male',
    phone: '',
  });
  const [newScreening, setNewScreening] = useState({ clientId: '', notificationTypeId: '' });
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState<CreateAppointmentDto>({
    clientId: 0,
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: '',
    reason: '',
  });
  const [appointmentError, setAppointmentError] = useState<string | null>(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [newFacility, setNewFacility] = useState<CreateFacilityDto>({
    centerName: '',
    address: '',
    phone: '',
    email: '',
    lga: '',
  });
  const [facilityError, setFacilityError] = useState<string | null>(null);
  const [facilityLoading, setFacilityLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [statsData, clientsData, screeningsData, typesData, appointmentsData, facilitiesData] = await Promise.all([
        api.getDashboardStats(),
        api.getClients(),
        api.getScreenings(),
        api.getNotificationTypes(),
        api.getAppointments(),
        api.getFacilities(true),
      ]);
      setStats(statsData);
      setClients(clientsData);
      setScreenings(screeningsData);
      setNotificationTypes(typesData);
      setAppointments(appointmentsData);
      setFacilities(facilitiesData);
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    api.logout();
    router.push('/');
  };

  const handleCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    setClientError(null);
    setClientLoading(true);
    try {
      await api.createClient(newClient);
      setShowClientModal(false);
      setNewClient({ firstName: '', lastName: '', dateOfBirth: '', gender: 'Male', phone: '' });
      fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create client';
      setClientError(errorMessage);
      console.error('Create client error:', err);
    } finally {
      setClientLoading(false);
    }
  };

  const handleCreateScreening = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createScreening({
        clientId: parseInt(newScreening.clientId),
        notificationTypeId: parseInt(newScreening.notificationTypeId),
      });
      setShowScreeningModal(false);
      setNewScreening({ clientId: '', notificationTypeId: '' });
      fetchData();
    } catch (err) {
      console.error('Create screening error:', err);
    }
  };

  const handleCreateAppointment = async (e: FormEvent) => {
    e.preventDefault();
    setAppointmentError(null);
    setAppointmentLoading(true);
    try {
      await api.createAppointment(newAppointment);
      setShowAppointmentModal(false);
      setNewAppointment({
        clientId: 0,
        appointmentDate: '',
        appointmentTime: '',
        appointmentType: '',
        reason: '',
      });
      fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create appointment';
      setAppointmentError(errorMessage);
      console.error('Create appointment error:', err);
    } finally {
      setAppointmentLoading(false);
    }
  };

  const handleCancelAppointment = async (id: number) => {
    try {
      await api.cancelAppointment(id);
      fetchData();
    } catch (err) {
      console.error('Cancel appointment error:', err);
    }
  };

  const handleCompleteAppointment = async (id: number) => {
    try {
      await api.completeAppointment(id);
      fetchData();
    } catch (err) {
      console.error('Complete appointment error:', err);
    }
  };

  const handleMarkNoShow = async (id: number) => {
    try {
      await api.markAppointmentNoShow(id);
      fetchData();
    } catch (err) {
      console.error('Mark no-show error:', err);
    }
  };

  const handleCreateFacility = async (e: FormEvent) => {
    e.preventDefault();
    setFacilityError(null);
    setFacilityLoading(true);
    try {
      await api.createFacility(newFacility);
      setShowFacilityModal(false);
      setNewFacility({
        centerName: '',
        address: '',
        phone: '',
        email: '',
        lga: '',
      });
      fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create facility';
      setFacilityError(errorMessage);
      console.error('Create facility error:', err);
    } finally {
      setFacilityLoading(false);
    }
  };

  const handleActivateFacility = async (id: number) => {
    try {
      await api.activateFacility(id);
      fetchData();
    } catch (err) {
      console.error('Activate facility error:', err);
    }
  };

  const handleDeactivateFacility = async (id: number) => {
    try {
      await api.deactivateFacility(id);
      fetchData();
    } catch (err) {
      console.error('Deactivate facility error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">LS</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">LSHD1 Screening System</h1>
              <p className="text-xs text-gray-500">{user?.facility?.name || 'System Admin'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-gray-800">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500">{user?.role?.name}</p>
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

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {(['dashboard', 'clients', 'screenings', 'appointments', 'phc_centers'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'phc_centers' ? 'PHC Centers' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 shadow">
                <p className="text-gray-500 text-sm">Total Clients</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalClients}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow">
                <p className="text-gray-500 text-sm">Today&apos;s Screenings</p>
                <p className="text-3xl font-bold text-blue-600">{stats.todayScreenings}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow">
                <p className="text-gray-500 text-sm">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingScreenings}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow">
                <p className="text-gray-500 text-sm">Completed Today</p>
                <p className="text-3xl font-bold text-green-600">{stats.completedToday}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowClientModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <span>+</span> Register Client
                </button>
                <button
                  onClick={() => setShowScreeningModal(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <span>+</span> New Screening
                </button>
              </div>
            </div>

            {/* Recent Screenings */}
            <div className="bg-white rounded-xl shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Recent Screenings</h2>
              </div>
              <div className="p-6">
                {screenings.length > 0 ? (
                  <div className="space-y-3">
                    {screenings.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">
                            {s.client?.firstName} {s.client?.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{s.notificationType?.name}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            s.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : s.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {s.status?.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No screening sessions yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="bg-white rounded-xl shadow">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Registered Clients</h2>
              <button
                onClick={() => setShowClientModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                + Register New Client
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DOB</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clients.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.client_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {c.first_name} {c.last_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{c.gender}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(c.date_of_birth).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{c.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clients.length === 0 && (
                <p className="text-gray-500 text-center py-8">No clients registered yet</p>
              )}
            </div>
          </div>
        )}

        {/* Screenings Tab */}
        {activeTab === 'screenings' && (
          <div className="bg-white rounded-xl shadow">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Screening Sessions</h2>
              <button
                onClick={() => setShowScreeningModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                + New Screening Session
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {screenings.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/screenings/${s.id}`)}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.sessionId}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {s.client?.firstName} {s.client?.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{s.notificationType?.name}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${
                            s.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : s.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {s.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {screenings.length === 0 && (
                <p className="text-gray-500 text-center py-8">No screening sessions yet</p>
              )}
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-xl shadow">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Appointments</h2>
              <button
                onClick={() => setShowAppointmentModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                + Schedule Appointment
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appointment ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.appointmentId}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {a.client?.firstName} {a.client?.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{a.appointmentType}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(a.appointmentDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{a.appointmentTime}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${
                            a.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : a.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : a.status === 'no_show'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {a.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {a.status === 'scheduled' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCompleteAppointment(a.id)}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleMarkNoShow(a.id)}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              No Show
                            </button>
                            <button
                              onClick={() => handleCancelAppointment(a.id)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {appointments.length === 0 && (
                <p className="text-gray-500 text-center py-8">No appointments scheduled yet</p>
              )}
            </div>
          </div>
        )}

        {/* PHC Centers Tab */}
        {activeTab === 'phc_centers' && (
          <div className="bg-white rounded-xl shadow">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">PHC Centers</h2>
              <button
                onClick={() => setShowFacilityModal(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
              >
                + Add PHC Center
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LGA</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {facilities.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{f.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{f.address}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{f.lga || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{f.phone || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{f.email || '-'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${
                            f.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {f.status === 'active' ? (
                          <button
                            onClick={() => handleDeactivateFacility(f.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivateFacility(f.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {facilities.length === 0 && (
                <p className="text-gray-500 text-center py-8">No PHC Centers registered yet</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Create Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Register New Client</h3>
            {clientError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {clientError}
              </div>
            )}
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newClient.firstName}
                    onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newClient.lastName}
                    onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={newClient.dateOfBirth}
                  onChange={(e) => setNewClient({ ...newClient, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                <select
                  value={newClient.gender}
                  onChange={(e) => setNewClient({ ...newClient, gender: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowClientModal(false);
                    setClientError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={clientLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clientLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {clientLoading ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Screening Modal */}
      {showScreeningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">New Screening Session</h3>
            <form onSubmit={handleCreateScreening} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Client *</label>
                <select
                  required
                  value={newScreening.clientId}
                  onChange={(e) => setNewScreening({ ...newScreening, clientId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_id} - {c.first_name} {c.last_name}
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  onClick={() => setShowScreeningModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Schedule Appointment</h3>
            {appointmentError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {appointmentError}
              </div>
            )}
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Client *</label>
                <select
                  required
                  value={newAppointment.clientId || ''}
                  onChange={(e) => setNewAppointment({ ...newAppointment, clientId: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_id} - {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type *</label>
                <select
                  required
                  value={newAppointment.appointmentType}
                  onChange={(e) => setNewAppointment({ ...newAppointment, appointmentType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Select Type --</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Screening">Screening</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Lab Test">Lab Test</option>
                  <option value="Vaccination">Vaccination</option>
                  <option value="General Checkup">General Checkup</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newAppointment.appointmentDate}
                    onChange={(e) => setNewAppointment({ ...newAppointment, appointmentDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={newAppointment.appointmentTime}
                    onChange={(e) => setNewAppointment({ ...newAppointment, appointmentTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={newAppointment.reason}
                  onChange={(e) => setNewAppointment({ ...newAppointment, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Optional notes about the appointment..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAppointmentModal(false);
                    setAppointmentError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={appointmentLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={appointmentLoading}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400"
                >
                  {appointmentLoading ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create PHC Center Modal */}
      {showFacilityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Add New PHC Center</h3>
            {facilityError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {facilityError}
              </div>
            )}
            <form onSubmit={handleCreateFacility} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Center Name *</label>
                <input
                  type="text"
                  required
                  value={newFacility.centerName}
                  onChange={(e) => setNewFacility({ ...newFacility, centerName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Central PHC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <textarea
                  required
                  value={newFacility.address}
                  onChange={(e) => setNewFacility({ ...newFacility, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Full address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LGA</label>
                <input
                  type="text"
                  value={newFacility.lga}
                  onChange={(e) => setNewFacility({ ...newFacility, lga: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Local Government Area"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newFacility.phone}
                    onChange={(e) => setNewFacility({ ...newFacility, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newFacility.email}
                    onChange={(e) => setNewFacility({ ...newFacility, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFacilityModal(false);
                    setFacilityError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={facilityLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={facilityLoading}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400"
                >
                  {facilityLoading ? 'Adding...' : 'Add PHC Center'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
