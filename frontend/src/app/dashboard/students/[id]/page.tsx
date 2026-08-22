'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
    ArrowLeft, User, MapPin, Phone, Mail, Calendar, 
    FileText, CheckCircle2, Circle, XCircle, Clock,
    GraduationCap, BookOpen, AlertCircle, Download, PlaneTakeoff, Upload, X,
    Eye, LayoutGrid, List, CheckCheck, AlertTriangle
} from 'lucide-react';
import StudentGradesTab from './StudentGradesTab';
import StudentPaymentTab from './PaymentTab';

const MAX_DOCUMENT_SIZE_MB = 500;
const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

export default function StudentDetail() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { hasRole } = useAuth();
    const { t } = useLanguage();
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [documentError, setDocumentError] = useState('');
    const [savingDocumentKey, setSavingDocumentKey] = useState<string | null>(null);
    const [savingPlacement, setSavingPlacement] = useState(false);
    const [placementError, setPlacementError] = useState('');
    const [placementForm, setPlacementForm] = useState({
        work_placement: '',
        job_type: '',
        visa_type: '',
    });
    const [masterStages, setMasterStages] = useState<any[]>([]);
    const [roadmapDialogOpen, setRoadmapDialogOpen] = useState(false);
    const [editingRoadmap, setEditingRoadmap] = useState<any>(null);
    const [roadmapForm, setRoadmapForm] = useState({
        roadmap_stage_id: '',
        status: 'pending',
        notes: '',
    });
    const [savingRoadmap, setSavingRoadmap] = useState(false);
    const [showLightbox, setShowLightbox] = useState(false);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'biodata');
    const [docViewMode, setDocViewMode] = useState<'card' | 'list'>('card');
    const fetchStudent = useCallback(async () => {
        try {
            const res = await axios.get(`/api/students/${params.id}`);
            setStudent(res.data);
            setPlacementForm({
                work_placement: res.data.work_placement || '',
                job_type: res.data.job_type || '',
                visa_type: res.data.visa_type || '',
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    const fetchMasterStages = useCallback(async () => {
        try {
            const res = await axios.get('/api/roadmap-stages');
            setMasterStages(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchStudent();
        fetchMasterStages();
    }, [fetchStudent, fetchMasterStages]);

    const uploadDocument = async (field: string, label: string, file: File | null) => {
        if (!file) return;

        if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
            setDocumentError(`${label} terlalu besar. Maksimal ukuran tiap dokumen ${MAX_DOCUMENT_SIZE_MB} MB.`);
            return;
        }

        setSavingDocumentKey(field);
        setDocumentError('');

        try {
            const formData = new FormData();
            formData.append('_method', 'PUT');
            formData.append(field, file);

            await axios.post(`/api/students/${params.id}`, formData);
            await fetchStudent();
        } catch (err: any) {
            if (err.response?.status === 413) {
                setDocumentError('Ukuran total dokumen terlalu besar. Maksimal total upload adalah 500 MB.');
                return;
            }

            const errors = err.response?.data?.errors;
            const firstError = errors ? Object.values(errors).flat()[0] : null;
            setDocumentError(String(firstError || err.response?.data?.message || err.message || 'Gagal mengunggah dokumen.'));
        } finally {
            setSavingDocumentKey(null);
        }
    };

    const savePlacement = async () => {
        setSavingPlacement(true);
        setPlacementError('');

        try {
            const res = await axios.put(`/api/students/${params.id}`, placementForm);
            setStudent((prev: any) => ({ ...prev, ...res.data }));
        } catch (err: any) {
            setPlacementError(err.response?.data?.message || 'Gagal menyimpan penempatan kerja.');
        } finally {
            setSavingPlacement(false);
        }
    };

    const openRoadmapDialog = (stageId: string, existingRm?: any) => {
        if (existingRm) {
            setEditingRoadmap(existingRm);
            setRoadmapForm({
                roadmap_stage_id: stageId,
                status: existingRm.status,
                notes: existingRm.notes || '',
            });
        } else {
            setEditingRoadmap(null);
            setRoadmapForm({
                roadmap_stage_id: stageId,
                status: 'pending',
                notes: '',
            });
        }
        setRoadmapDialogOpen(true);
    };

    const handleSaveRoadmap = async () => {
        setSavingRoadmap(true);
        try {
            await axios.post('/api/student-roadmaps', {
                student_id: student.id,
                ...roadmapForm,
            });
            setRoadmapDialogOpen(false);
            fetchStudent();
        } catch(err) {
            console.error(err);
            toast.error('Gagal menyimpan roadmap');
        } finally {
            setSavingRoadmap(false);
        }
    };

    const handleDownload = async (docKey: string, docLabel: string) => {
        const toastId = toast.loading(`Mengunduh ${docLabel}...`);
        try {
            const res = await axios.get(`/api/students/${student.id}/download/${docKey}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Coba ambil nama file dari header, fallback ke nama default
            let fileName = `${docLabel} ${student.user?.name || student.name || ''}`;
            const contentDisposition = res.headers['content-disposition'];
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2) {
                    fileName = fileNameMatch[1];
                }
            } else {
                // If backend didn't provide extension, we don't know it, but usually backend provides header.
                const filePath = student[docKey];
                const ext = filePath ? filePath.split('.').pop() : 'pdf';
                fileName = `${fileName}.${ext}`;
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Berhasil diunduh', { id: toastId });
        } catch (error) {
            console.error('Download failed', error);
            toast.error('Gagal mengunduh dokumen', { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
            </div>
        );
    }

    if (!student) {
        return <div className="text-center py-20 text-gray-500 dark:text-gray-400">Data siswa tidak ditemukan.</div>;
    }

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const documentFields = [
        { key: 'ijazah', label: 'Ijazah', required: true },
        { key: 'ktp', label: 'KTP', required: true },
        { key: 'akte_kelahiran', label: 'Akte Kelahiran', required: true },
        { key: 'kk', label: 'Kartu Keluarga', required: true },
        { key: 'jft_jlpt', label: 'JFT/JLPT', required: false },
        { key: 'ssw', label: 'SSW', required: false },
        { key: 'cv', label: 'CV', required: false },
        { key: 'visa_document', label: 'Visa', required: false },
        { key: 'coe', label: 'COE', required: false },
        { key: 'work_contract', label: 'Kontrak Kerja', required: false },
    ];

    const hasDepartureRoadmap = student.roadmaps?.some((roadmap: any) => {
        const stageName = (roadmap.stage?.name || roadmap.roadmap_stage?.name || roadmap.roadmapStage?.name || '').toLowerCase();
        return stageName.includes('keberangkatan') && ['in_progress', 'completed'].includes(roadmap.status);
    });
    const hasPlacementData = Boolean(student.work_placement || student.job_type || student.visa_type);
    const showPlacementCard = hasDepartureRoadmap || hasPlacementData;
    const canEditPlacement = !hasRole('Siswa');

    // Helper for Roadmap Status Icon
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-6 h-6 text-red-700" />;
            case 'in_progress': return <Clock className="w-6 h-6 text-red-600" />;
            case 'canceled': return <XCircle className="w-6 h-6 text-red-500" />;
            default: return <Circle className="w-6 h-6 text-gray-300" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header Actions */}
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/students')} className="hover:bg-gray-100 dark:bg-gray-800">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profil Kenshusei</h1>
            </div>

            {/* Profile Header Card */}
            <div className="bg-white/80 dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-2xl p-5 md:p-8 flex flex-col md:flex-row items-center text-center md:text-left gap-5 md:gap-6 relative overflow-hidden">
                <button 
                    onClick={() => { if (student.user.profile_photo_url) setShowLightbox(true); }}
                    title={student.user.profile_photo_url ? 'Perbesar foto profil' : ''}
                    className={`w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gradient-to-br from-red-100 to-indigo-100 flex items-center justify-center text-2xl md:text-3xl font-bold text-red-800 shadow-inner z-10 ${student.user.profile_photo_url ? 'cursor-pointer hover:ring-4 hover:ring-red-200 transition-all' : ''}`}
                >
                    {student.user.profile_photo_url ? (
                        <Image src={student.user.profile_photo_url} alt={student.user.name} width={96} height={96} className="w-full h-full object-cover" />
                    ) : (
                        getInitials(student.user.name)
                    )}
                </button>
                <div className="flex-1 z-10 flex flex-col items-center md:items-start">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-3 mb-2">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{student.user.name}</h2>
                        <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className="bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 hover:bg-red-100 dark:bg-red-900/40 border-none px-3 py-1">
                            {student.status.toUpperCase()}
                        </Badge>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm md:text-base">{student.user.email} &bull; NIS: {student.nis || 'Belum diatur'}</p>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {student.enrollments?.length > 0 && (
                            <div className="flex items-center bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
                                <GraduationCap className="w-4 h-4 mr-1.5 md:mr-2 text-gray-400" />
                                {student.enrollments[0]?.batch?.name}
                            </div>
                        )}
                        <div className="flex items-center bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
                            <Phone className="w-4 h-4 mr-1.5 md:mr-2 text-gray-400" />
                            {student.phone || 'Belum ada nomor'}
                        </div>
                    </div>
                </div>
                {/* Decorative background */}
                <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-red-50/30 to-transparent pointer-events-none"></div>
            </div>

            {/* LIGHTBOX MODAL */}
            {showLightbox && student.user.profile_photo_url && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowLightbox(false)}
                >
                    <button
                        onClick={() => setShowLightbox(false)}
                        className="absolute top-4 right-4 z-50 p-2 bg-white/10 dark:bg-gray-900/10 hover:bg-white/20 dark:bg-gray-900/20 text-white rounded-full transition-colors"
                        title="Tutup"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <div
                        className="relative max-w-2xl max-h-[85vh] mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Image
                            src={student.user.profile_photo_url}
                            alt={student.user.name}
                            width={800}
                            height={800}
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg p-4">
                            <p className="text-white font-semibold text-lg">{student.user.name}</p>
                            <p className="text-white/70 text-sm">NIS: {student.nis}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs Content */}
            <div className="mt-6 md:mt-8">
                <div className="relative bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl backdrop-blur-sm border border-gray-200 dark:border-gray-600/50 rounded-2xl sm:rounded-full w-full sm:w-fit p-1.5 flex shadow-sm mb-6 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {['biodata', 'roadmap', 'akademik', 'raport', 'pembayaran', 'dokumen'].filter(tab => {
                        if (hasRole('Staff Akademik') && tab === 'pembayaran') return false;
                        return true;
                    }).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                router.replace(`/dashboard/students/${params.id}?tab=${tab}`, { scroll: false });
                            }}
                            className={`relative z-10 rounded-full px-5 py-2.5 font-bold text-sm transition-colors duration-300 capitalize whitespace-nowrap flex-shrink-0 ${activeTab === tab ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:text-red-700'}`}
                        >
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeStudentTab"
                                    className="absolute inset-0 bg-red-700 rounded-full -z-10 shadow-md"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    {activeTab === 'biodata' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                    <div className="bg-white/80 dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                            <User className="w-5 h-5 mr-2 text-red-700 dark:text-red-400" />
                            Informasi Personal
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Jenis Kelamin</p>
                                <p className="font-medium text-gray-900 dark:text-white flex items-center">
                                    <User className="w-4 h-4 mr-2 text-gray-400" />
                                    {student.gender || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Tanggal Lahir</p>
                                <p className="font-medium text-gray-900 dark:text-white flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                    {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Kontak Darurat</p>
                                <p className="font-medium text-gray-900 dark:text-white flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-2 text-red-400" />
                                    {student.emergency_contact || '-'}
                                </p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-sm text-gray-400 mb-1">Alamat Tinggal</p>
                                <p className="font-medium text-gray-900 dark:text-white flex items-start">
                                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400" />
                                    {student.address || '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {showPlacementCard && (
                        <div className="bg-white/80 dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-6 sm:p-8 mt-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                                <PlaneTakeoff className="w-5 h-5 mr-2 text-red-700" />
                                Penempatan Kerja
                            </h3>
                            {placementError && <div className="mb-4 bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{placementError}</div>}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Penempatan Kerja</label>
                                    <Input
                                        value={placementForm.work_placement}
                                        onChange={(e) => setPlacementForm({ ...placementForm, work_placement: e.target.value })}
                                        readOnly={!canEditPlacement}
                                        placeholder="Contoh: Osaka, Jepang"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jenis Pekerjaan</label>
                                    <Input
                                        value={placementForm.job_type}
                                        onChange={(e) => setPlacementForm({ ...placementForm, job_type: e.target.value })}
                                        readOnly={!canEditPlacement}
                                        placeholder="Contoh: Kaigo"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipe Visa</label>
                                    {canEditPlacement ? (
                                        <Select value={placementForm.visa_type} onValueChange={(value) => setPlacementForm({ ...placementForm, visa_type: value ?? '' })}>
                                            <SelectTrigger><SelectValue placeholder="Pilih tipe visa" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Tokutei Ginou">Tokutei Ginou</SelectItem>
                                                <SelectItem value="Magang">Magang</SelectItem>
                                                <SelectItem value="Lainnya">Lainnya</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input value={placementForm.visa_type || '-'} readOnly />
                                    )}
                                </div>
                                {canEditPlacement && (
                                    <div className="md:col-span-3 flex justify-end">
                                        <Button onClick={savePlacement} disabled={savingPlacement}>
                                            {savingPlacement ? 'Menyimpan...' : 'Simpan Penempatan'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    </motion.div>
                    )}
                    {activeTab === 'roadmap' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="mt-6"
                        >
                    <div className="bg-white/80 dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-6 sm:p-8">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-8 flex items-center justify-between">
                            <div className="flex items-center">
                                <PlaneTakeoff className="w-5 h-5 mr-2 text-red-700" />
                                Roadmap Keberangkatan
                            </div>
                        </h3>
                        
                        {masterStages && masterStages.length > 0 ? (
                            <div className="relative">
                                {/* Vertical Line */}
                                <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-100 dark:bg-gray-800"></div>
                                
                                <div className="space-y-8 relative max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                                    {masterStages.map((stage: any, idx: number) => {
                                        const studentRm = student.roadmaps?.find((r: any) => r.roadmap_stage_id === stage.id);
                                        const status = studentRm ? studentRm.status : 'pending';
                                        
                                        return (
                                            <div key={stage.id} className="flex gap-6 items-start group">
                                                <div className="relative bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl z-10 pt-1">
                                                    {getStatusIcon(status)}
                                                </div>
                                                <div className="flex-1 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 group-hover:border-red-200 dark:border-red-800/50 transition-colors">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
                                                        <h4 className="font-bold text-gray-900 dark:text-white text-base">{stage.name}</h4>
                                                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                                            {studentRm && (
                                                                <span className="text-xs font-medium bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl px-2 py-1 rounded-md border text-gray-500 dark:text-gray-400">
                                                                    {new Date(studentRm.updated_at).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                            {!hasRole('Siswa') && (
                                                                <Button variant="outline" size="sm" onClick={() => openRoadmapDialog(stage.id, studentRm)}>
                                                                    {studentRm ? 'Update' : 'Tambah'}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{stage.description}</p>
                                                    
                                                    {studentRm?.notes && (
                                                        <div className="bg-yellow-50 text-yellow-800 text-sm p-3 rounded-lg border border-yellow-100 mt-3">
                                                            <strong>Catatan:</strong> {studentRm.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <div className="mx-auto w-16 h-16 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl rounded-full flex items-center justify-center mb-4">
                                    <PlaneTakeoff className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">Belum ada master tahapan roadmap yang dibuat.</p>
                            </div>
                        )}
                    </div>
                        </motion.div>
                    )}
                    {activeTab === 'akademik' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="mt-6 space-y-6"
                        >
                            {student.enrollments?.map((enr: any) => (
                                <div key={enr.id} className="bg-white/80 dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="bg-red-50 dark:bg-red-950/40 px-6 py-4 border-b border-red-100 dark:border-red-900/50 flex items-center justify-between">
                                        <h3 className="font-bold text-red-900 dark:text-red-100 flex items-center">
                                            <BookOpen className="w-5 h-5 mr-2 text-red-700 dark:text-red-400" />
                                            {enr.study_class?.name || (enr.batch ? `Kelas ${enr.batch.name}` : 'Belum Ada Kelas')}
                                        </h3>
                                        <Badge className="bg-red-100 text-red-800 dark:text-red-200 hover:bg-red-100 dark:bg-red-900/40 border-none">{enr.status}</Badge>
                                    </div>
                                    
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Kehadiran */}
                                        <div>
                                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b pb-2">Riwayat Kehadiran</h4>
                                    {enr.attendances && enr.attendances.length > 0 ? (
                                        <div className="space-y-3">
                                            {enr.attendances.slice(0, 5).map((att: any) => (
                                                <div key={att.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl rounded-lg">
                                                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                                                        <Calendar className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                                        {new Date(att.date).toLocaleDateString()}
                                                    </span>
                                                    <Badge variant="outline" className={
                                                        att.status?.toLowerCase() === 'hadir' ? 'text-red-700 border-emerald-200 bg-emerald-50' :
                                                        att.status?.toLowerCase() === 'sakit' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                                                        'text-red-600 border-red-200 bg-red-50'
                                                    }>{att.status}</Badge>
                                                </div>
                                            ))}
                                            {enr.attendances.length > 5 && (
                                                <div className="text-center text-xs text-red-700 dark:text-red-400 font-medium cursor-pointer py-1">Lihat Semua Kehadiran</div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data kehadiran.</p>
                                    )}
                                </div>

                                {/* Nilai */}
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b pb-2">Riwayat Nilai</h4>
                                    {enr.grades && enr.grades.length > 0 ? (
                                        <div className="space-y-3">
                                            {enr.grades.slice(0, 5).map((grade: any) => (
                                                <div key={grade.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl rounded-lg">
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{grade.type || 'Nilai'}</span>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="font-bold text-gray-900 dark:text-white">{grade.score}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data nilai.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!student.enrollments || student.enrollments.length === 0) && (
                        <div className="bg-white/80 dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
                            Siswa belum didaftarkan ke kelas manapun.
                        </div>
                    )}
                        </motion.div>
                    )}
                {/* RAPORT TAB */}
                    {activeTab === 'raport' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="mt-6"
                        >
                    <StudentGradesTab studentId={params.id as string} enrollments={student.enrollments || []} />
                        </motion.div>
                    )}
                {/* PEMBAYARAN TAB */}
                    {activeTab === 'pembayaran' && !hasRole('Staff Akademik') && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <StudentPaymentTab studentId={params.id as string} studentInfo={student} />
                        </motion.div>
                    )}
                {/* INVOICE TAB */}
                {/* DOKUMEN TAB */}
                    {activeTab === 'dokumen' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="mt-6"
                        >
                    <div className="bg-white/80 dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-6 sm:p-8">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-500" />
                                    Dokumen Administratif
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {documentFields.filter(d => student[d.key]).length}/{documentFields.length} dokumen telah diunggah
                                </p>
                            </div>
                            {/* View Toggle */}
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                <button
                                    onClick={() => setDocViewMode('card')}
                                    className={`p-1.5 rounded-md transition-all ${
                                        docViewMode === 'card'
                                            ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400'
                                            : 'text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                                    title="Tampilan Kartu"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDocViewMode('list')}
                                    className={`p-1.5 rounded-md transition-all ${
                                        docViewMode === 'list'
                                            ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400'
                                            : 'text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                                    title="Tampilan List"
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {documentError && (
                            <div className="mb-5 bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-100 dark:border-red-900/50 p-3 rounded-md text-sm">
                                {documentError}
                            </div>
                        )}

                        {/* CARD VIEW */}
                        {docViewMode === 'card' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {documentFields.map((doc) => {
                                    const filePath = student[doc.key];
                                    const isSaving = savingDocumentKey === doc.key;
                                    const inputId = `student-document-${doc.key}`;
                                    const fileUrl = filePath ? `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/storage/${filePath}` : null;

                                    return (
                                        <div key={doc.key} className={`relative border rounded-xl p-4 flex flex-col justify-between group transition-all duration-200 ${
                                            filePath
                                                ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/10'
                                                : doc.required
                                                    ? 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10 hover:border-red-300'
                                                    : 'border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#1e2532]/80 hover:border-indigo-200 hover:shadow-sm'
                                        }`}>
                                            {/* Status badge */}
                                            <div className="absolute top-3 right-3">
                                                {filePath ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                                        <CheckCheck className="w-3 h-3" /> Ada
                                                    </span>
                                                ) : doc.required ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                                                        <AlertTriangle className="w-3 h-3" /> Wajib
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                                                        Opsional
                                                    </span>
                                                )}
                                            </div>

                                            {/* Icon & name */}
                                            <div className="mb-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                                                    filePath ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-indigo-100 dark:bg-indigo-900/30'
                                                }`}>
                                                    <FileText className={`w-5 h-5 ${ filePath ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-500' }`} />
                                                </div>
                                                <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{doc.label}</h4>
                                                <p className={`text-xs mt-0.5 ${ filePath ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500 dark:text-gray-400' }`}>
                                                    {filePath ? '✓ Sudah diunggah' : 'Belum diunggah'}
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            <div className="space-y-2">
                                                {fileUrl && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {/* Preview */}
                                                        <a
                                                            href={fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-center gap-1.5 text-xs font-medium h-8 rounded-lg border border-indigo-200 dark:border-indigo-700/50 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" /> Preview
                                                        </a>
                                                        {/* Download */}
                                                        <button
                                                            onClick={() => handleDownload(doc.key, doc.label)}
                                                            className="flex items-center justify-center gap-1.5 text-xs font-medium h-8 rounded-lg border border-gray-200 dark:border-gray-600/50 bg-white dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                                                        >
                                                            <Download className="w-3.5 h-3.5" /> Unduh
                                                        </button>
                                                    </div>
                                                )}
                                                <Input
                                                    id={inputId}
                                                    type="file"
                                                    className="hidden"
                                                    disabled={isSaving}
                                                    onChange={(e) => {
                                                        uploadDocument(doc.key, doc.label, e.target.files?.[0] || null);
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <label
                                                    htmlFor={inputId}
                                                    className={`w-full h-8 gap-1.5 rounded-lg text-xs inline-flex items-center justify-center font-medium border cursor-pointer transition-all ${
                                                        isSaving
                                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-600 pointer-events-none'
                                                            : filePath
                                                                ? 'bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white border-transparent'
                                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-sm shadow-indigo-500/30'
                                                    }`}
                                                >
                                                    <Upload className="w-3.5 h-3.5" />
                                                    {isSaving ? 'Mengunggah...' : filePath ? 'Ganti' : 'Unggah Dokumen'}
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* LIST VIEW */}
                        {docViewMode === 'list' && (
                            <div className="space-y-2">
                                {documentFields.map((doc) => {
                                    const filePath = student[doc.key];
                                    const isSaving = savingDocumentKey === doc.key;
                                    const inputId = `list-doc-${doc.key}`;
                                    const fileUrl = filePath ? `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/storage/${filePath}` : null;

                                    return (
                                        <div key={doc.key} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                                            filePath
                                                ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/10'
                                                : doc.required
                                                    ? 'border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10'
                                                    : 'border-gray-200 dark:border-gray-700/40 bg-gray-50/50 dark:bg-[#1e2532]/50 hover:border-gray-300'
                                        }`}>
                                            {/* Status dot + icon */}
                                            <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                                                filePath ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-100 dark:bg-gray-800'
                                            }`}>
                                                <FileText className={`w-4 h-4 ${ filePath ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400' }`} />
                                            </div>

                                            {/* Name & status */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{doc.label}</p>
                                                <p className={`text-xs ${ filePath ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400' }`}>
                                                    {filePath ? 'Sudah diunggah' : 'Belum diunggah'}
                                                </p>
                                            </div>

                                            {/* Badge */}
                                            <div className="flex-shrink-0">
                                                {filePath ? (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Ada</span>
                                                ) : doc.required ? (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">Wajib</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">Opsional</span>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex-shrink-0 flex items-center gap-2">
                                                {fileUrl && (
                                                    <>
                                                        <a
                                                            href={fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-xs font-medium h-8 px-3 rounded-lg border border-indigo-200 dark:border-indigo-700/50 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" /> Preview
                                                        </a>
                                                        <button
                                                            onClick={() => handleDownload(doc.key, doc.label)}
                                                            className="flex items-center gap-1.5 text-xs font-medium h-8 px-3 rounded-lg border border-gray-200 dark:border-gray-600/50 bg-white dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
                                                        >
                                                            <Download className="w-3.5 h-3.5" /> Unduh
                                                        </button>
                                                    </>
                                                )}
                                                <Input
                                                    id={inputId}
                                                    type="file"
                                                    className="hidden"
                                                    disabled={isSaving}
                                                    onChange={(e) => {
                                                        uploadDocument(doc.key, doc.label, e.target.files?.[0] || null);
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <label
                                                    htmlFor={inputId}
                                                    className={`flex items-center gap-1.5 text-xs font-medium h-8 px-3 rounded-lg cursor-pointer border transition-all ${
                                                        isSaving
                                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 pointer-events-none'
                                                            : filePath
                                                                ? 'bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 text-white border-transparent'
                                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
                                                    }`}
                                                >
                                                    <Upload className="w-3.5 h-3.5" />
                                                    {isSaving ? 'Mengunggah...' : filePath ? 'Ganti' : 'Unggah'}
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Roadmap Edit Dialog */}
            <Dialog open={roadmapDialogOpen} onOpenChange={setRoadmapDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Status Roadmap</DialogTitle>
                        <DialogDescription>
                            Perbarui status atau tambahkan catatan untuk tahapan ini.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select 
                                value={roadmapForm.status} 
                                onValueChange={(val) => setRoadmapForm(prev => ({ ...prev, status: val ?? 'pending' }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending / Belum Mulai</SelectItem>
                                    <SelectItem value="in_progress">Sedang Berlangsung (In Progress)</SelectItem>
                                    <SelectItem value="completed">Selesai (Completed)</SelectItem>
                                    <SelectItem value="canceled">Dibatalkan / Canceled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Catatan Tambahan (Opsional)</Label>
                            <Textarea 
                                placeholder="Tulis catatan jika ada kendala atau progres..." 
                                value={roadmapForm.notes}
                                onChange={(e) => setRoadmapForm(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRoadmapDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSaveRoadmap} disabled={savingRoadmap}>
                            {savingRoadmap ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
