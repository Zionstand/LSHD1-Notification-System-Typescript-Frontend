'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type {
  Screening,
  Patient,
  PathwayDataResponse,
  CreateHypertensionScreeningDto,
  CreateDiabetesScreeningDto,
  CreateCervicalScreeningDto,
  CreateBreastScreeningDto,
  CreatePsaScreeningDto,
  BpPosition,
  ArmUsed,
  DiabetesTestType,
  CervicalScreeningMethod,
  CervicalResult,
  LymphNodeStatus,
  BreastRiskLevel,
  Laterality,
} from '@/types';

interface ScreeningDetail extends Screening {
  patient?: Patient;
  vitals?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    temperature?: number;
    pulseRate?: number;
    respiratoryRate?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  };
  results?: {
    diagnosis?: string;
    recommendations?: string;
  };
}

export default function ScreeningDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [screening, setScreening] = useState<ScreeningDetail | null>(null);
  const [pathwayData, setPathwayData] = useState<PathwayDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPathwayForm, setShowPathwayForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Form states for different pathways
  const [hypertensionForm, setHypertensionForm] = useState<CreateHypertensionScreeningDto>({
    systolicBp1: 0,
    diastolicBp1: 0,
    position1: 'sitting',
    armUsed1: 'left',
  });

  const [diabetesForm, setDiabetesForm] = useState<CreateDiabetesScreeningDto>({
    testType: 'random',
    bloodSugarLevel: 0,
    testTime: new Date().toTimeString().slice(0, 5),
  });

  const [cervicalForm, setCervicalForm] = useState<CreateCervicalScreeningDto>({
    screeningMethod: 'via',
    screeningResult: 'negative',
  });

  const [breastForm, setBreastForm] = useState<CreateBreastScreeningDto>({
    lumpPresent: false,
    dischargePresent: false,
    nippleInversion: false,
    lymphNodeStatus: 'normal',
    summaryFindings: '',
    riskAssessment: 'low',
  });

  const [psaForm, setPsaForm] = useState<CreatePsaScreeningDto>({
    psaLevel: 0,
    collectionTime: new Date().toTimeString().slice(0, 5),
    patientAge: 0,
    normalRangeMax: 4.0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/');
          return;
        }

        const screeningData = await api.getScreening(params.id as string);
        setScreening(screeningData as ScreeningDetail);

        // Try to fetch pathway data
        try {
          const pathway = await api.getPathwayData(Number(params.id));
          setPathwayData(pathway);
        } catch {
          // Pathway data doesn't exist yet, that's ok
          setPathwayData({ pathway: null, data: null });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch screening details');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id, router]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPathwayColor = (pathway: string): string => {
    switch (pathway) {
      case 'hypertension':
        return 'bg-red-600';
      case 'diabetes':
        return 'bg-blue-600';
      case 'cervical':
        return 'bg-purple-600';
      case 'breast':
        return 'bg-pink-600';
      case 'psa':
        return 'bg-teal-600';
      default:
        return 'bg-gray-600';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmitPathwayForm = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const pathway = screening?.notificationType?.pathway;
    const screeningId = Number(params.id);

    try {
      switch (pathway) {
        case 'hypertension':
          await api.createHypertensionScreening(screeningId, hypertensionForm);
          setSubmitSuccess('Hypertension screening completed successfully!');
          break;
        case 'diabetes':
          await api.createDiabetesScreening(screeningId, diabetesForm);
          setSubmitSuccess('Diabetes screening completed successfully!');
          break;
        case 'cervical':
          await api.createCervicalScreening(screeningId, cervicalForm);
          setSubmitSuccess('Cervical cancer screening completed successfully!');
          break;
        case 'breast':
          await api.createBreastScreening(screeningId, breastForm);
          setSubmitSuccess('Breast cancer screening completed successfully!');
          break;
        case 'psa':
          await api.createPsaScreening(screeningId, psaForm);
          setSubmitSuccess('PSA screening completed successfully!');
          break;
      }

      // Refresh data
      const screeningData = await api.getScreening(params.id as string);
      setScreening(screeningData as ScreeningDetail);
      const pathwayDataResult = await api.getPathwayData(screeningId);
      setPathwayData(pathwayDataResult);
      setShowPathwayForm(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit screening data');
    } finally {
      setSubmitting(false);
    }
  };

  // Render pathway-specific form
  const renderPathwayForm = () => {
    const pathway = screening?.notificationType?.pathway;

    switch (pathway) {
      case 'hypertension':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Hypertension Screening Form</h3>

            {/* BP Reading 1 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Blood Pressure Reading 1 (Required)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Systolic (mmHg) *</label>
                  <input
                    type="number"
                    required
                    value={hypertensionForm.systolicBp1 || ''}
                    onChange={(e) => setHypertensionForm({ ...hypertensionForm, systolicBp1: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="120"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diastolic (mmHg) *</label>
                  <input
                    type="number"
                    required
                    value={hypertensionForm.diastolicBp1 || ''}
                    onChange={(e) => setHypertensionForm({ ...hypertensionForm, diastolicBp1: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="80"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                  <select
                    value={hypertensionForm.position1}
                    onChange={(e) => setHypertensionForm({ ...hypertensionForm, position1: e.target.value as BpPosition })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="sitting">Sitting</option>
                    <option value="standing">Standing</option>
                    <option value="lying">Lying</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arm Used *</label>
                  <select
                    value={hypertensionForm.armUsed1}
                    onChange={(e) => setHypertensionForm({ ...hypertensionForm, armUsed1: e.target.value as ArmUsed })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BP Reading 2 (Optional) */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Blood Pressure Reading 2 (Optional)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Systolic (mmHg)</label>
                  <input
                    type="number"
                    value={hypertensionForm.systolicBp2 || ''}
                    onChange={(e) => setHypertensionForm({ ...hypertensionForm, systolicBp2: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diastolic (mmHg)</label>
                  <input
                    type="number"
                    value={hypertensionForm.diastolicBp2 || ''}
                    onChange={(e) => setHypertensionForm({ ...hypertensionForm, diastolicBp2: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select
                    value={hypertensionForm.position2 || ''}
                    onChange={(e) => setHypertensionForm({ ...hypertensionForm, position2: e.target.value as BpPosition || undefined })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select</option>
                    <option value="sitting">Sitting</option>
                    <option value="standing">Standing</option>
                    <option value="lying">Lying</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arm Used</label>
                  <select
                    value={hypertensionForm.armUsed2 || ''}
                    onChange={(e) => setHypertensionForm({ ...hypertensionForm, armUsed2: e.target.value as ArmUsed || undefined })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Observations</label>
              <textarea
                value={hypertensionForm.clinicalObservations || ''}
                onChange={(e) => setHypertensionForm({ ...hypertensionForm, clinicalObservations: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Enter any clinical observations..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
              <textarea
                value={hypertensionForm.recommendations || ''}
                onChange={(e) => setHypertensionForm({ ...hypertensionForm, recommendations: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Enter recommendations..."
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={hypertensionForm.referToDoctor || false}
                  onChange={(e) => setHypertensionForm({ ...hypertensionForm, referToDoctor: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Refer to Doctor</span>
              </label>
            </div>

            {hypertensionForm.referToDoctor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referral Reason</label>
                <textarea
                  value={hypertensionForm.referralReason || ''}
                  onChange={(e) => setHypertensionForm({ ...hypertensionForm, referralReason: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Reason for referral..."
                />
              </div>
            )}
          </div>
        );

      case 'diabetes':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Diabetes Screening Form</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Type *</label>
                <select
                  value={diabetesForm.testType}
                  onChange={(e) => setDiabetesForm({ ...diabetesForm, testType: e.target.value as DiabetesTestType })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="random">Random Blood Sugar</option>
                  <option value="fasting">Fasting Blood Sugar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Sugar Level (mg/dL) *</label>
                <input
                  type="number"
                  required
                  value={diabetesForm.bloodSugarLevel || ''}
                  onChange={(e) => setDiabetesForm({ ...diabetesForm, bloodSugarLevel: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter blood sugar level"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Time *</label>
                <input
                  type="time"
                  required
                  value={diabetesForm.testTime}
                  onChange={(e) => setDiabetesForm({ ...diabetesForm, testTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {diabetesForm.testType === 'fasting' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fasting Duration (hours)</label>
                  <input
                    type="number"
                    value={diabetesForm.fastingDurationHours || ''}
                    onChange={(e) => setDiabetesForm({ ...diabetesForm, fastingDurationHours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 8"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Observations</label>
              <textarea
                value={diabetesForm.clinicalObservations || ''}
                onChange={(e) => setDiabetesForm({ ...diabetesForm, clinicalObservations: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={diabetesForm.referToDoctor || false}
                  onChange={(e) => setDiabetesForm({ ...diabetesForm, referToDoctor: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Refer to Doctor</span>
              </label>
            </div>

            {diabetesForm.referToDoctor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referral Reason</label>
                <textarea
                  value={diabetesForm.referralReason || ''}
                  onChange={(e) => setDiabetesForm({ ...diabetesForm, referralReason: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        );

      case 'cervical':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Cervical Cancer Screening Form</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Screening Method *</label>
                <select
                  value={cervicalForm.screeningMethod}
                  onChange={(e) => setCervicalForm({ ...cervicalForm, screeningMethod: e.target.value as CervicalScreeningMethod })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="via">VIA (Visual Inspection with Acetic Acid)</option>
                  <option value="vili">VILI (Visual Inspection with Lugol Iodine)</option>
                  <option value="pap_smear">Pap Smear</option>
                  <option value="hpv_test">HPV Test</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Screening Result *</label>
                <select
                  value={cervicalForm.screeningResult}
                  onChange={(e) => setCervicalForm({ ...cervicalForm, screeningResult: e.target.value as CervicalResult })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="negative">Negative</option>
                  <option value="positive">Positive</option>
                  <option value="suspicious">Suspicious</option>
                  <option value="inconclusive">Inconclusive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visual Inspection Findings</label>
              <textarea
                value={cervicalForm.visualInspectionFindings || ''}
                onChange={(e) => setCervicalForm({ ...cervicalForm, visualInspectionFindings: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cervicalForm.specimenCollected || false}
                  onChange={(e) => setCervicalForm({ ...cervicalForm, specimenCollected: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Specimen Collected</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cervicalForm.followUpRequired || false}
                  onChange={(e) => setCervicalForm({ ...cervicalForm, followUpRequired: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Follow-up Required</span>
              </label>
            </div>

            {cervicalForm.followUpRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={cervicalForm.followUpDate || ''}
                  onChange={(e) => setCervicalForm({ ...cervicalForm, followUpDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                value={cervicalForm.remarks || ''}
                onChange={(e) => setCervicalForm({ ...cervicalForm, remarks: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        );

      case 'breast':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Breast Cancer Screening Form</h3>

            {/* Lump Assessment */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Lump Assessment</h4>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={breastForm.lumpPresent}
                    onChange={(e) => setBreastForm({ ...breastForm, lumpPresent: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Lump Present</span>
                </label>

                {breastForm.lumpPresent && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={breastForm.lumpLocation || ''}
                        onChange={(e) => setBreastForm({ ...breastForm, lumpLocation: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Upper outer quadrant"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                      <input
                        type="text"
                        value={breastForm.lumpSize || ''}
                        onChange={(e) => setBreastForm({ ...breastForm, lumpSize: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., 2cm x 2cm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Characteristics</label>
                      <input
                        type="text"
                        value={breastForm.lumpCharacteristics || ''}
                        onChange={(e) => setBreastForm({ ...breastForm, lumpCharacteristics: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Hard, mobile"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Discharge */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Breast Discharge</h4>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={breastForm.dischargePresent}
                    onChange={(e) => setBreastForm({ ...breastForm, dischargePresent: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Discharge Present</span>
                </label>

                {breastForm.dischargePresent && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <input
                        type="text"
                        value={breastForm.dischargeType || ''}
                        onChange={(e) => setBreastForm({ ...breastForm, dischargeType: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Clear, bloody"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <select
                        value={breastForm.dischargeLocation || ''}
                        onChange={(e) => setBreastForm({ ...breastForm, dischargeLocation: e.target.value as Laterality })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Select</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="bilateral">Bilateral</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Other Findings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={breastForm.nippleInversion}
                    onChange={(e) => setBreastForm({ ...breastForm, nippleInversion: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Nipple Inversion</span>
                </label>
                {breastForm.nippleInversion && (
                  <select
                    value={breastForm.nippleInversionLaterality || ''}
                    onChange={(e) => setBreastForm({ ...breastForm, nippleInversionLaterality: e.target.value as Laterality })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select laterality</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="bilateral">Bilateral</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lymph Node Status *</label>
                <select
                  value={breastForm.lymphNodeStatus}
                  onChange={(e) => setBreastForm({ ...breastForm, lymphNodeStatus: e.target.value as LymphNodeStatus })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                >
                  <option value="normal">Normal</option>
                  <option value="enlarged">Enlarged</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary Findings *</label>
              <textarea
                required
                value={breastForm.summaryFindings}
                onChange={(e) => setBreastForm({ ...breastForm, summaryFindings: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                placeholder="Enter detailed summary of examination findings..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Risk Assessment *</label>
                <select
                  value={breastForm.riskAssessment}
                  onChange={(e) => setBreastForm({ ...breastForm, riskAssessment: e.target.value as BreastRiskLevel })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                >
                  <option value="low">Low Risk</option>
                  <option value="moderate">Moderate Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>

              <div>
                <label className="flex items-center h-full">
                  <input
                    type="checkbox"
                    checked={breastForm.referralRequired || false}
                    onChange={(e) => setBreastForm({ ...breastForm, referralRequired: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Referral Required</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
              <textarea
                value={breastForm.recommendations || ''}
                onChange={(e) => setBreastForm({ ...breastForm, recommendations: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
        );

      case 'psa':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">PSA Screening Form</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PSA Level (ng/mL) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={psaForm.psaLevel || ''}
                  onChange={(e) => setPsaForm({ ...psaForm, psaLevel: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., 2.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Age *</label>
                <input
                  type="number"
                  required
                  value={psaForm.patientAge || ''}
                  onChange={(e) => setPsaForm({ ...psaForm, patientAge: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Collection Time *</label>
                <input
                  type="time"
                  required
                  value={psaForm.collectionTime}
                  onChange={(e) => setPsaForm({ ...psaForm, collectionTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Normal Range Max (ng/mL) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={psaForm.normalRangeMax || ''}
                  onChange={(e) => setPsaForm({ ...psaForm, normalRangeMax: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., 4.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Method</label>
                <input
                  type="text"
                  value={psaForm.testMethod || ''}
                  onChange={(e) => setPsaForm({ ...psaForm, testMethod: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., Immunoassay"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sample Quality</label>
                <select
                  value={psaForm.sampleQuality || 'adequate'}
                  onChange={(e) => setPsaForm({ ...psaForm, sampleQuality: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="adequate">Adequate</option>
                  <option value="suboptimal">Suboptimal</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Result Interpretation</label>
              <textarea
                value={psaForm.resultInterpretation || ''}
                onChange={(e) => setPsaForm({ ...psaForm, resultInterpretation: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Observations</label>
              <textarea
                value={psaForm.clinicalObservations || ''}
                onChange={(e) => setPsaForm({ ...psaForm, clinicalObservations: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={psaForm.referToDoctor || false}
                  onChange={(e) => setPsaForm({ ...psaForm, referToDoctor: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Refer to Doctor</span>
              </label>
            </div>

            {psaForm.referToDoctor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referral Reason</label>
                <textarea
                  value={psaForm.referralReason || ''}
                  onChange={(e) => setPsaForm({ ...psaForm, referralReason: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-gray-500">Unknown screening pathway</p>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading screening details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!screening) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Not Found</h2>
          <p className="text-gray-600 mb-4">Screening not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const pathway = screening.notificationType?.pathway;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Screening Details</h1>
                <p className="text-sm text-gray-500">Session ID: {screening.sessionId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getPathwayColor(pathway || '')}`}>
                {screening.notificationType?.name || 'General'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(screening.status)}`}>
                {screening.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Success/Error Messages */}
        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {submitSuccess}
          </div>
        )}
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
              Patient Information
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">
                  {screening.client ? `${screening.client.firstName} ${screening.client.lastName}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Client ID:</span>
                <span className="font-medium">{screening.client?.clientId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{formatDate(screening.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Vitals */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
              Vital Signs
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Blood Pressure</p>
                <p className="text-lg font-semibold">
                  {screening.vitals?.bloodPressureSystolic && screening.vitals?.bloodPressureDiastolic
                    ? `${screening.vitals.bloodPressureSystolic}/${screening.vitals.bloodPressureDiastolic} mmHg`
                    : 'Not recorded'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Pulse Rate</p>
                <p className="text-lg font-semibold">
                  {screening.vitals?.pulseRate ? `${screening.vitals.pulseRate} bpm` : 'Not recorded'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Temperature</p>
                <p className="text-lg font-semibold">
                  {screening.vitals?.temperature ? `${screening.vitals.temperature}°C` : 'Not recorded'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Weight</p>
                <p className="text-lg font-semibold">
                  {screening.vitals?.weight ? `${screening.vitals.weight} kg` : 'Not recorded'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pathway-Specific Data or Form */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          {pathwayData?.data ? (
            // Show existing pathway data
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                {screening.notificationType?.name} Results
              </h2>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800 font-medium">Screening Completed</p>
                <p className="text-sm text-green-600 mt-1">
                  Result: {(pathwayData.data as { screeningResult?: string }).screeningResult?.replace('_', ' ').toUpperCase() || 'N/A'}
                </p>
                {screening.results?.diagnosis && (
                  <p className="text-sm text-gray-700 mt-2">{screening.results.diagnosis}</p>
                )}
              </div>
            </div>
          ) : screening.status === 'pending' ? (
            // Show form to complete screening
            <div>
              {!showPathwayForm ? (
                <div className="text-center py-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Ready to Complete {screening.notificationType?.name}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Click the button below to enter the screening results.
                  </p>
                  <button
                    onClick={() => setShowPathwayForm(true)}
                    className={`px-6 py-3 text-white rounded-lg font-medium ${getPathwayColor(pathway || '')} hover:opacity-90`}
                  >
                    Start {screening.notificationType?.name}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitPathwayForm}>
                  {renderPathwayForm()}

                  <div className="mt-6 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowPathwayForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`flex-1 px-4 py-2 text-white rounded-lg ${getPathwayColor(pathway || '')} hover:opacity-90 disabled:opacity-50`}
                    >
                      {submitting ? 'Submitting...' : 'Complete Screening'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No pathway data available</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
