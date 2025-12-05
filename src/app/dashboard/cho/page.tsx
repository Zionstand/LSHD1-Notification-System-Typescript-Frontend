'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { hasPermission } from '@/lib/permissions';
import type { User, Divider, Volunteer, UserRoleType } from '@/types';
import { LOGO } from '@/constants';

// ==================== INTERFACES ====================

interface DividerForm {
  fullName: string;
  phone: string;
  address: string;
  lga: string;
  ward: string;
  community: string;
  notes: string;
}

interface VolunteerForm {
  fullName: string;
  phone: string;
  altPhone: string;
  email: string;
  gender: 'male' | 'female';
  age: number | undefined;
  dateOfBirth: string;
  address: string;
  lga: string;
  ward: string;
  community: string;
  occupation: string;
  educationLevel: string;
  nextOfKin: string;
  nextOfKinPhone: string;
  skills: string;
  notes: string;
}

interface DividerStats {
  total: number;
  active: number;
  inactive: number;
}

interface VolunteerStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  trained: number;
  untrained: number;
}

// ==================== INITIAL FORMS ====================

const initialDividerForm: DividerForm = {
  fullName: '',
  phone: '',
  address: '',
  lga: '',
  ward: '',
  community: '',
  notes: '',
};

const initialVolunteerForm: VolunteerForm = {
  fullName: '',
  phone: '',
  altPhone: '',
  email: '',
  gender: 'male',
  age: undefined,
  dateOfBirth: '',
  address: '',
  lga: '',
  ward: '',
  community: '',
  occupation: '',
  educationLevel: '',
  nextOfKin: '',
  nextOfKinPhone: '',
  skills: '',
  notes: '',
};

// ==================== MAIN COMPONENT ====================

export default function ChoDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRoleType | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Main navigation
  const [activeSection, setActiveSection] = useState<'screenings' | 'dividers' | 'volunteers'>('screenings');

  // Divider state
  const [dividers, setDividers] = useState<Divider[]>([]);
  const [dividerStats, setDividerStats] = useState<DividerStats>({ total: 0, active: 0, inactive: 0 });
  const [showDividerModal, setShowDividerModal] = useState(false);
  const [dividerForm, setDividerForm] = useState<DividerForm>(initialDividerForm);
  const [dividerFilter, setDividerFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [dividerSearch, setDividerSearch] = useState('');
  const [dividerLoading, setDividerLoading] = useState(false);
  const [dividerError, setDividerError] = useState<string | null>(null);
  const [editingDivider, setEditingDivider] = useState<Divider | null>(null);

  // Volunteer state
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [volunteerStats, setVolunteerStats] = useState<VolunteerStats>({
    total: 0, active: 0, inactive: 0, pending: 0, trained: 0, untrained: 0
  });
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [volunteerForm, setVolunteerForm] = useState<VolunteerForm>(initialVolunteerForm);
  const [volunteerFilter, setVolunteerFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [volunteerSearch, setVolunteerSearch] = useState('');
  const [volunteerLoading, setVolunteerLoading] = useState(false);
  const [volunteerError, setVolunteerError] = useState<string | null>(null);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);

  // ==================== EFFECTS ====================

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Extract role - could be role.id or just role string
    const roleId = typeof parsedUser.role === 'string'
      ? parsedUser.role
      : parsedUser.role?.id;
    setUserRole(roleId as UserRoleType);

    console.log('CHO Dashboard - User role:', roleId, 'Full user:', parsedUser);

    // Only allow CHO and admin
    if (roleId !== 'cho' && roleId !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [router]);

  // ==================== DATA FETCHING ====================

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDividers(),
        fetchVolunteers(),
        fetchDividerStats(),
        fetchVolunteerStats(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDividers = async () => {
    try {
      const response = await api.getDividers({
        status: dividerFilter === 'all' ? undefined : dividerFilter,
        search: dividerSearch || undefined,
      });
      setDividers(response.dividers);
    } catch (error) {
      console.error('Error fetching dividers:', error);
    }
  };

  const fetchVolunteers = async () => {
    try {
      const response = await api.getVolunteers({
        status: volunteerFilter === 'all' ? undefined : volunteerFilter,
        search: volunteerSearch || undefined,
      });
      setVolunteers(response.volunteers);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
    }
  };

  const fetchDividerStats = async () => {
    try {
      const stats = await api.getDividerStats();
      setDividerStats(stats);
    } catch (error) {
      console.error('Error fetching divider stats:', error);
    }
  };

  const fetchVolunteerStats = async () => {
    try {
      const stats = await api.getVolunteerStats();
      setVolunteerStats(stats);
    } catch (error) {
      console.error('Error fetching volunteer stats:', error);
    }
  };

  // Refetch when filters change
  useEffect(() => {
    if (!loading) {
      fetchDividers();
    }
  }, [dividerFilter, dividerSearch]);

  useEffect(() => {
    if (!loading) {
      fetchVolunteers();
    }
  }, [volunteerFilter, volunteerSearch]);

  // ==================== DIVIDER HANDLERS ====================

  const handleDividerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setDividerLoading(true);
    setDividerError(null);

    try {
      if (!dividerForm.fullName.trim()) {
        throw new Error('Full name is required');
      }

      if (editingDivider) {
        await api.updateDivider(editingDivider.id, dividerForm);
      } else {
        await api.createDivider(dividerForm);
      }

      setShowDividerModal(false);
      setDividerForm(initialDividerForm);
      setEditingDivider(null);
      await Promise.all([fetchDividers(), fetchDividerStats()]);
    } catch (error: any) {
      setDividerError(error.message || 'Failed to save divider');
    } finally {
      setDividerLoading(false);
    }
  };

  const handleEditDivider = (divider: Divider) => {
    setEditingDivider(divider);
    setDividerForm({
      fullName: divider.fullName,
      phone: divider.phone || '',
      address: divider.address || '',
      lga: divider.lga || '',
      ward: divider.ward || '',
      community: divider.community || '',
      notes: divider.notes || '',
    });
    setShowDividerModal(true);
  };

  const handleToggleDividerStatus = async (divider: Divider) => {
    try {
      if (divider.status === 'active') {
        await api.deactivateDivider(divider.id);
      } else {
        await api.activateDivider(divider.id);
      }
      await Promise.all([fetchDividers(), fetchDividerStats()]);
    } catch (error) {
      console.error('Error toggling divider status:', error);
    }
  };

  // ==================== VOLUNTEER HANDLERS ====================

  const handleVolunteerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setVolunteerLoading(true);
    setVolunteerError(null);

    try {
      if (!volunteerForm.fullName.trim()) {
        throw new Error('Full name is required');
      }
      if (!volunteerForm.phone.trim()) {
        throw new Error('Phone number is required');
      }

      if (editingVolunteer) {
        await api.updateVolunteer(editingVolunteer.id, {
          ...volunteerForm,
          age: volunteerForm.age || undefined,
        });
      } else {
        await api.createVolunteer({
          ...volunteerForm,
          age: volunteerForm.age || undefined,
        });
      }

      setShowVolunteerModal(false);
      setVolunteerForm(initialVolunteerForm);
      setEditingVolunteer(null);
      await Promise.all([fetchVolunteers(), fetchVolunteerStats()]);
    } catch (error: any) {
      setVolunteerError(error.message || 'Failed to save volunteer');
    } finally {
      setVolunteerLoading(false);
    }
  };

  const handleEditVolunteer = (volunteer: Volunteer) => {
    setEditingVolunteer(volunteer);
    setVolunteerForm({
      fullName: volunteer.fullName,
      phone: volunteer.phone,
      altPhone: volunteer.altPhone || '',
      email: volunteer.email || '',
      gender: volunteer.gender,
      age: volunteer.age || undefined,
      dateOfBirth: volunteer.dateOfBirth || '',
      address: volunteer.address || '',
      lga: volunteer.lga || '',
      ward: volunteer.ward || '',
      community: volunteer.community || '',
      occupation: volunteer.occupation || '',
      educationLevel: volunteer.educationLevel || '',
      nextOfKin: volunteer.nextOfKin || '',
      nextOfKinPhone: volunteer.nextOfKinPhone || '',
      skills: volunteer.skills || '',
      notes: volunteer.notes || '',
    });
    setShowVolunteerModal(true);
  };

  const handleToggleVolunteerStatus = async (volunteer: Volunteer) => {
    try {
      if (volunteer.status === 'active') {
        await api.deactivateVolunteer(volunteer.id);
      } else {
        await api.activateVolunteer(volunteer.id);
      }
      await Promise.all([fetchVolunteers(), fetchVolunteerStats()]);
    } catch (error) {
      console.error('Error toggling volunteer status:', error);
    }
  };

  const handleMarkTrainingCompleted = async (volunteerId: number) => {
    try {
      await api.markVolunteerTrainingCompleted(volunteerId);
      await Promise.all([fetchVolunteers(), fetchVolunteerStats()]);
    } catch (error) {
      console.error('Error marking training completed:', error);
    }
  };

  // ==================== LOGOUT ====================

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading CHO Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">{LOGO}</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">CHO Dashboard</h1>
              <p className="text-xs text-gray-500">
                {user?.firstName} {user?.lastName} | {user?.facility?.name || 'No Facility'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/clinical')}
              className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
            >
              Clinical Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b sticky top-[68px] z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveSection('screenings')}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                activeSection === 'screenings'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Screenings
            </button>
            {hasPermission(userRole, 'divider:view') && (
              <button
                onClick={() => setActiveSection('dividers')}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                  activeSection === 'dividers'
                    ? 'text-green-600 border-b-2 border-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Dividers
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeSection === 'dividers' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {dividerStats.total}
                </span>
              </button>
            )}
            {hasPermission(userRole, 'volunteer:view') && (
              <button
                onClick={() => setActiveSection('volunteers')}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                  activeSection === 'volunteers'
                    ? 'text-green-600 border-b-2 border-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Volunteers
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeSection === 'volunteers' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {volunteerStats.total}
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Screenings Section - Redirect to Clinical */}
        {activeSection === 'screenings' && (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Patient Screenings</h2>
            <p className="text-gray-600 mb-6">Access the clinical dashboard to view and manage patient screenings, record vitals, and perform hypertension screenings.</p>
            <button
              onClick={() => router.push('/dashboard/clinical')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Go to Clinical Dashboard
            </button>
          </div>
        )}

        {/* Dividers Section */}
        {activeSection === 'dividers' && hasPermission(userRole, 'divider:view') && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-gray-500 text-xs">Total Dividers</p>
                <p className="text-2xl font-bold text-gray-800">{dividerStats.total}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-gray-500 text-xs">Active</p>
                <p className="text-2xl font-bold text-green-600">{dividerStats.active}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-gray-500 text-xs">Inactive</p>
                <p className="text-2xl font-bold text-gray-500">{dividerStats.inactive}</p>
              </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-xl shadow mb-4">
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search dividers..."
                    value={dividerSearch}
                    onChange={(e) => setDividerSearch(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                  <select
                    value={dividerFilter}
                    onChange={(e) => setDividerFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                {hasPermission(userRole, 'divider:create') && (
                  <button
                    onClick={() => {
                      setEditingDivider(null);
                      setDividerForm(initialDividerForm);
                      setShowDividerModal(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Divider
                  </button>
                )}
              </div>
            </div>

            {/* Dividers List */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dividers.map((divider) => (
                    <tr key={divider.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {divider.dividerCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {divider.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {divider.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {[divider.community, divider.ward, divider.lga].filter(Boolean).join(', ') || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          divider.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {divider.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {hasPermission(userRole, 'divider:edit') && (
                            <>
                              <button
                                onClick={() => handleEditDivider(divider)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleDividerStatus(divider)}
                                className={divider.status === 'active' ? 'text-gray-600 hover:text-gray-900' : 'text-green-600 hover:text-green-900'}
                              >
                                {divider.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dividers.length === 0 && (
                <p className="text-gray-500 text-center py-8">No dividers found</p>
              )}
            </div>
          </div>
        )}

        {/* Volunteers Section */}
        {activeSection === 'volunteers' && hasPermission(userRole, 'volunteer:view') && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-gray-500 text-xs">Total</p>
                <p className="text-2xl font-bold text-gray-800">{volunteerStats.total}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-gray-500 text-xs">Active</p>
                <p className="text-2xl font-bold text-green-600">{volunteerStats.active}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-gray-500 text-xs">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{volunteerStats.pending}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-gray-500 text-xs">Inactive</p>
                <p className="text-2xl font-bold text-gray-500">{volunteerStats.inactive}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-gray-500 text-xs">Trained</p>
                <p className="text-2xl font-bold text-blue-600">{volunteerStats.trained}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-gray-500 text-xs">Untrained</p>
                <p className="text-2xl font-bold text-orange-600">{volunteerStats.untrained}</p>
              </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-xl shadow mb-4">
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search volunteers..."
                    value={volunteerSearch}
                    onChange={(e) => setVolunteerSearch(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                  <select
                    value={volunteerFilter}
                    onChange={(e) => setVolunteerFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                {hasPermission(userRole, 'volunteer:create') && (
                  <button
                    onClick={() => {
                      setEditingVolunteer(null);
                      setVolunteerForm(initialVolunteerForm);
                      setShowVolunteerModal(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Register Volunteer
                  </button>
                )}
              </div>
            </div>

            {/* Volunteers List */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Training</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {volunteers.map((volunteer) => (
                      <tr key={volunteer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {volunteer.volunteerCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {volunteer.fullName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {volunteer.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {volunteer.gender}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {[volunteer.community, volunteer.ward, volunteer.lga].filter(Boolean).join(', ') || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {volunteer.trainingCompleted ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                              Trained
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700">
                              Not Trained
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            volunteer.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : volunteer.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {volunteer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            {hasPermission(userRole, 'volunteer:edit') && (
                              <>
                                <button
                                  onClick={() => handleEditVolunteer(volunteer)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  Edit
                                </button>
                                {!volunteer.trainingCompleted && (
                                  <button
                                    onClick={() => handleMarkTrainingCompleted(volunteer.id)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    Mark Trained
                                  </button>
                                )}
                                <button
                                  onClick={() => handleToggleVolunteerStatus(volunteer)}
                                  className={volunteer.status === 'active' ? 'text-gray-600 hover:text-gray-900' : 'text-green-600 hover:text-green-900'}
                                >
                                  {volunteer.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {volunteers.length === 0 && (
                <p className="text-gray-500 text-center py-8">No volunteers found</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Divider Modal */}
      {showDividerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingDivider ? 'Edit Divider' : 'Add New Divider'}
              </h2>
              <button
                onClick={() => {
                  setShowDividerModal(false);
                  setEditingDivider(null);
                  setDividerError(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleDividerSubmit} className="p-4 space-y-4">
              {dividerError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {dividerError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dividerForm.fullName}
                  onChange={(e) => setDividerForm({ ...dividerForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={dividerForm.phone}
                  onChange={(e) => setDividerForm({ ...dividerForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LGA</label>
                  <input
                    type="text"
                    value={dividerForm.lga}
                    onChange={(e) => setDividerForm({ ...dividerForm, lga: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                  <input
                    type="text"
                    value={dividerForm.ward}
                    onChange={(e) => setDividerForm({ ...dividerForm, ward: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
                <input
                  type="text"
                  value={dividerForm.community}
                  onChange={(e) => setDividerForm({ ...dividerForm, community: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={dividerForm.address}
                  onChange={(e) => setDividerForm({ ...dividerForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={dividerForm.notes}
                  onChange={(e) => setDividerForm({ ...dividerForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDividerModal(false);
                    setEditingDivider(null);
                    setDividerError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={dividerLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dividerLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
                >
                  {dividerLoading ? 'Saving...' : editingDivider ? 'Update' : 'Add Divider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Volunteer Modal */}
      {showVolunteerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">
                {editingVolunteer ? 'Edit Volunteer' : 'Register New Volunteer'}
              </h2>
              <button
                onClick={() => {
                  setShowVolunteerModal(false);
                  setEditingVolunteer(null);
                  setVolunteerError(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleVolunteerSubmit} className="p-4 space-y-4">
              {volunteerError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {volunteerError}
                </div>
              )}

              {/* Personal Information */}
              <div className="border-b pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={volunteerForm.fullName}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={volunteerForm.phone}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alt Phone</label>
                    <input
                      type="tel"
                      value={volunteerForm.altPhone}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, altPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={volunteerForm.email}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={volunteerForm.gender}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, gender: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input
                      type="number"
                      value={volunteerForm.age || ''}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, age: e.target.value ? parseInt(e.target.value) : undefined })}
                      min={16}
                      max={80}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={volunteerForm.dateOfBirth}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="border-b pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LGA</label>
                    <input
                      type="text"
                      value={volunteerForm.lga}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, lga: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                    <input
                      type="text"
                      value={volunteerForm.ward}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, ward: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
                    <input
                      type="text"
                      value={volunteerForm.community}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, community: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={volunteerForm.address}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Background */}
              <div className="border-b pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Background</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                    <input
                      type="text"
                      value={volunteerForm.occupation}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, occupation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Education Level</label>
                    <select
                      value={volunteerForm.educationLevel}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, educationLevel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Select...</option>
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="tertiary">Tertiary</option>
                      <option value="postgraduate">Postgraduate</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                    <textarea
                      value={volunteerForm.skills}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, skills: e.target.value })}
                      rows={2}
                      placeholder="e.g., First aid, Community mobilization, Health education..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="border-b pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin</label>
                    <input
                      type="text"
                      value={volunteerForm.nextOfKin}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, nextOfKin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin Phone</label>
                    <input
                      type="tel"
                      value={volunteerForm.nextOfKinPhone}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, nextOfKinPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={volunteerForm.notes}
                  onChange={(e) => setVolunteerForm({ ...volunteerForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowVolunteerModal(false);
                    setEditingVolunteer(null);
                    setVolunteerError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={volunteerLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={volunteerLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
                >
                  {volunteerLoading ? 'Saving...' : editingVolunteer ? 'Update' : 'Register Volunteer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
