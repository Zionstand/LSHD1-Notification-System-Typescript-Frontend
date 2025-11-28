'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { User, Patient, Screening, NotificationType, CreatePatientDto, Facility } from '@/types';

interface HimDashboardStats {
  todayRegistrations: number;
  pendingRouting: number;
  completedToday: number;
  totalClients: number;
}

// Screening type options with descriptions
const SCREENING_TYPES = [
  { id: 2, name: 'Diabetes Screening', description: 'Blood sugar testing' },
  { id: 1, name: 'Hypertension Screening', description: 'Blood pressure monitoring' },
  { id: 3, name: 'Cervical Cancer Screening', description: 'Pap smear/HPV test (Women 25-65)' },
  { id: 4, name: 'Breast Cancer Screening', description: 'Clinical examination (Women 20+)' },
  { id: 5, name: 'Prostate Cancer Screening', description: 'PSA test (Men 45+)' },
];

const initialClientForm: CreatePatientDto = {
  fullName: '',
  phone: '',
  age: 0,
  gender: 'Male',
  phcCenterId: 0,
  address: '',
  screeningTypeId: 0,
  nextOfKin: '',
  nextOfKinPhone: '',
};

export default function HimDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<HimDashboardStats>({
    todayRegistrations: 0,
    pendingRouting: 0,
    completedToday: 0,
    totalClients: 0,
  });
  const [clients, setClients] = useState<Patient[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeTab, setActiveTab] = useState<'register' | 'queue' | 'history'>('register');
  const [loading, setLoading] = useState(true);

  // Client registration form state
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClient, setNewClient] = useState<CreatePatientDto>(initialClientForm);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<{ clientId: string; screeningId: string } | null>(null);

  // Screening/Routing state (for existing clients)
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Patient | null>(null);
  const [selectedNotificationType, setSelectedNotificationType] = useState<string>('');
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Redirect non-HIM officers to main dashboard
    if (parsedUser.role?.id !== 'him_officer' && parsedUser.role?.id !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [clientsData, screeningsData, typesData, dashboardStats, facilitiesData] = await Promise.all([
        api.getClients(),
        api.getScreenings(),
        api.getNotificationTypes(),
        api.getDashboardStats(),
        api.getFacilities(),
      ]);
      setClients(clientsData);
      setScreenings(screeningsData);
      setNotificationTypes(typesData);
      setFacilities(facilitiesData);

      // Set default facility if user has one
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.facility?.id) {
          setNewClient(prev => ({ ...prev, phcCenterId: parsedUser.facility.id }));
        }
      }

      // Calculate HIM-specific stats
      const today = new Date().toDateString();
      const todayScreenings = screeningsData.filter(
        (s) => new Date(s.createdAt).toDateString() === today
      );

      setStats({
        todayRegistrations: todayScreenings.length,
        pendingRouting: screeningsData.filter((s) => s.status === 'pending').length,
        completedToday: todayScreenings.filter((s) => s.status === 'completed').length,
        totalClients: dashboardStats.totalClients,
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

  const handleCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    setClientError(null);
    setClientLoading(true);
    try {
      const response = await api.createClient(newClient);

      // Show success message with client and screening IDs
      setRegistrationSuccess({
        clientId: response.client.client_id,
        screeningId: response.screening.sessionId,
      });

      // Reset form but keep phcCenterId
      const currentPhcCenterId = newClient.phcCenterId;
      setNewClient({ ...initialClientForm, phcCenterId: currentPhcCenterId });

      fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register client';
      setClientError(errorMessage);
      console.error('Create client error:', err);
    } finally {
      setClientLoading(false);
    }
  };

  const handleRouteClient = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedNotificationType) return;

    setRoutingError(null);
    setRoutingLoading(true);
    try {
      await api.createScreening({
        clientId: selectedClient.id,
        notificationTypeId: parseInt(selectedNotificationType),
      });
      setShowRoutingModal(false);
      setSelectedClient(null);
      setSelectedNotificationType('');
      fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to route client';
      setRoutingError(errorMessage);
      console.error('Route client error:', err);
    } finally {
      setRoutingLoading(false);
    }
  };

  const openRoutingForClient = (client: Patient) => {
    setSelectedClient(client);
    setShowRoutingModal(true);
  };

  const filteredClients = clients.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (c.full_name && c.full_name.toLowerCase().includes(query)) ||
      c.first_name.toLowerCase().includes(query) ||
      c.last_name.toLowerCase().includes(query) ||
      c.client_id.toLowerCase().includes(query) ||
      (c.phone && c.phone.includes(query))
    );
  });

  const getRoutingDestination = (pathway: string): string => {
    const destinations: Record<string, string> = {
      hypertension: 'OPD (Community Health Officer)',
      diabetes: 'Laboratory',
      cervical: 'Nursing Station',
      breast: 'Doctor',
      psa: 'Laboratory',
    };
    return destinations[pathway] || 'Unknown';
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
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">HIM</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">HIM Officer Dashboard</h1>
              <p className="text-xs text-gray-500">{user?.facility?.name || 'LSHD1 Screening System'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-gray-800">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500">HIM Officer</p>
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
            {(['register', 'queue', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize ${
                  activeTab === tab
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'register' ? 'Register & Route' : tab === 'queue' ? 'Pending Queue' : 'History'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow">
            <p className="text-gray-500 text-sm">Today's Registrations</p>
            <p className="text-3xl font-bold text-indigo-600">{stats.todayRegistrations}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow">
            <p className="text-gray-500 text-sm">Pending Routing</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingRouting}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow">
            <p className="text-gray-500 text-sm">Completed Today</p>
            <p className="text-3xl font-bold text-green-600">{stats.completedToday}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow">
            <p className="text-gray-500 text-sm">Total Clients</p>
            <p className="text-3xl font-bold text-gray-800">{stats.totalClients}</p>
          </div>
        </div>

        {/* Register & Route Tab */}
        {activeTab === 'register' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow">
              <h2 className="text-lg font-semibold mb-4">Client Registration & Routing</h2>
              <p className="text-gray-600 mb-4">
                Register new clients or search for existing clients to route them to the appropriate screening pathway.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowClientModal(true)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Register New Client
                </button>
              </div>
            </div>

            {/* Client Search & Selection */}
            <div className="bg-white rounded-xl shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold mb-4">Search Existing Clients</h2>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, client ID, or phone number..."
                    className="w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <svg
                    className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="p-6">
                {filteredClients.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredClients.slice(0, 10).map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {client.full_name || `${client.first_name} ${client.last_name}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            ID: {client.client_id} | {client.gender} | Age: {client.age}
                          </p>
                          <p className="text-sm text-gray-500">Phone: {client.phone}</p>
                        </div>
                        <button
                          onClick={() => openRoutingForClient(client)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                        >
                          Route to Screening
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {searchQuery ? 'No clients found matching your search' : 'Enter a search term to find clients'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending Queue Tab */}
        {activeTab === 'queue' && (
          <div className="bg-white rounded-xl shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Pending Screenings Queue</h2>
              <p className="text-sm text-gray-500">Clients waiting for vital signs assessment and screening</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Screening Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Routing Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {screenings
                    .filter((s) => s.status === 'pending' || s.status === 'in_progress')
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.sessionId}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {s.client?.firstName} {s.client?.lastName}
                          <br />
                          <span className="text-xs text-gray-500">{s.client?.clientId}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{s.notificationType?.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {getRoutingDestination(s.notificationType?.pathway || '')}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs ${
                              s.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {s.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(s.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {screenings.filter((s) => s.status === 'pending' || s.status === 'in_progress').length === 0 && (
                <p className="text-gray-500 text-center py-8">No pending screenings in queue</p>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Registration History</h2>
              <p className="text-sm text-gray-500">Recent client registrations and screening sessions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Screening Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {screenings.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
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
                        {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString()}
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
      </main>

      {/* Create Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8">
            <h3 className="text-lg font-semibold mb-4">Register New Client</h3>

            {/* Success Message */}
            {registrationSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                <p className="font-medium">Client registered successfully!</p>
                <p className="text-sm">Client ID: {registrationSuccess.clientId}</p>
                <p className="text-sm">Screening Session: {registrationSuccess.screeningId}</p>
                <button
                  onClick={() => setRegistrationSuccess(null)}
                  className="mt-2 text-sm text-green-800 underline"
                >
                  Register another client
                </button>
              </div>
            )}

            {clientError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {clientError}
              </div>
            )}

            {!registrationSuccess && (
              <form onSubmit={handleCreateClient} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newClient.fullName}
                    onChange={(e) => setNewClient({ ...newClient, fullName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter full name"
                  />
                </div>

                {/* Phone and Age */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="080XXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="150"
                      value={newClient.age || ''}
                      onChange={(e) => setNewClient({ ...newClient, age: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter age"
                    />
                  </div>
                </div>

                {/* Gender and PHC Center */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                    <select
                      required
                      value={newClient.gender}
                      onChange={(e) => setNewClient({ ...newClient, gender: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PHC Center *</label>
                    <select
                      required
                      value={newClient.phcCenterId || ''}
                      onChange={(e) => setNewClient({ ...newClient, phcCenterId: parseInt(e.target.value) })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <textarea
                    required
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter client address"
                  />
                </div>

                {/* Screening Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Screening Type *</label>
                  <div className="space-y-2">
                    {SCREENING_TYPES.map((type) => (
                      <label
                        key={type.id}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer transition ${
                          newClient.screeningTypeId === type.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="screeningType"
                          value={type.id}
                          checked={newClient.screeningTypeId === type.id}
                          onChange={(e) => setNewClient({ ...newClient, screeningTypeId: parseInt(e.target.value) })}
                          className="mt-1 mr-3"
                          required
                        />
                        <div>
                          <p className="font-medium text-gray-900">{type.name}</p>
                          <p className="text-sm text-gray-500">{type.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Next of Kin */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin Name *</label>
                    <input
                      type="text"
                      required
                      value={newClient.nextOfKin}
                      onChange={(e) => setNewClient({ ...newClient, nextOfKin: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter next of kin name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin Phone *</label>
                    <input
                      type="tel"
                      required
                      value={newClient.nextOfKinPhone}
                      onChange={(e) => setNewClient({ ...newClient, nextOfKinPhone: e.target.value })}
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
                      setClientError(null);
                      setRegistrationSuccess(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={clientLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={clientLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
                  >
                    {clientLoading ? 'Registering...' : 'Register Client'}
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
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Route Client to Screening</h3>

            {/* Client Info */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedClient.full_name || `${selectedClient.first_name} ${selectedClient.last_name}`}</p>
              <p className="text-sm text-gray-500">ID: {selectedClient.client_id}</p>
              <p className="text-sm text-gray-500">
                {selectedClient.gender} | Age: {selectedClient.age}
              </p>
            </div>

            {routingError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {routingError}
              </div>
            )}

            <form onSubmit={handleRouteClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Notification Type (Screening Pathway) *
                </label>
                <select
                  required
                  value={selectedNotificationType}
                  onChange={(e) => setSelectedNotificationType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Screening Type --</option>
                  {notificationTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedNotificationType && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-sm font-medium text-indigo-800">Routing Destination:</p>
                  <p className="text-indigo-700">
                    {getRoutingDestination(
                      notificationTypes.find((t) => t.id.toString() === selectedNotificationType)?.pathway || ''
                    )}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoutingModal(false);
                    setSelectedClient(null);
                    setSelectedNotificationType('');
                    setRoutingError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={routingLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={routingLoading || !selectedNotificationType}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
                >
                  {routingLoading ? 'Routing...' : 'Route Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
