'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressSelector } from '@/components/AddressSelector';
import { ArrowLeft, Users, Calendar, MapPin, GraduationCap, UserPlus, FileCheck2, ArrowRight, Pencil } from 'lucide-react';
import JapaneseOrnament from '@/components/JapaneseOrnament';
import Link from 'next/link';
import { motion } from 'framer-motion';

const MAX_DOCUMENT_SIZE_MB = 500;
const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

export default function BatchDetail() {
    const params = useParams();
    const router = useRouter();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('siswa');
    const [batch, setBatch] = useState<any>(null);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingLevel, setSavingLevel] = useState(false);
    const [savingTeacher, setSavingTeacher] = useState(false);
    const [studentDialogOpen, setStudentDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [savingStudent, setSavingStudent] = useState(false);
    const [studentError, setStudentError] = useState('');
    const [studentForm, setStudentForm] = useState({
        name: '',
        email: '',
        password: '',
        nis: '',
        gender: '',
        date_of_birth: '',
        phone: '',
        address: '',
        emergency_contact: '',
    });
    const [studentFiles, setStudentFiles] = useState<Record<string, File | null>>({
        ijazah: null,
        ktp: null,
        akte_kelahiran: null,
        kk: null,
        jft_jlpt: null,
        ssw: null,
        cv: null,
        visa_document: null,
        coe: null,
        work_contract: null,
    });

    const fetchBatch = useCallback(async () => {
        try {
            const res = await axios.get(`/api/batches/${params.id}`);
            setBatch(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchBatch();
    }, [fetchBatch]);

    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const res = await axios.get('/api/teachers', { params: { per_page: 1000 } });
                setTeachers(res.data.data || res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchTeachers();
    }, []);

    const changeClassLevel = async (newLevel: string | null) => {
        if (!newLevel) return;

        setSavingLevel(true);
        try {
            await axios.put(`/api/batches/${params.id}`, { class_level: newLevel });
            setBatch({ ...batch, class_level: newLevel });
        } catch (err) {
            console.error(err);
            toast.error('Gagal mengubah tingkatan kelas.');
        } finally {
            setSavingLevel(false);
        }
    };

    const changeTeacher = async (teacherId: string | null) => {
        setSavingTeacher(true);
        try {
            await axios.put(`/api/batches/${params.id}`, { teacher_id: teacherId ? parseInt(teacherId) : null });
            fetchBatch();
        } catch (err) {
            console.error(err);
            toast.error('Gagal mengatur sensei untuk angkatan ini.');
        } finally {
            setSavingTeacher(false);
        }
    };

    const resetStudentForm = () => {
        setStudentForm({
            name: '',
            email: '',
            password: '',
            nis: '',
            gender: '',
            date_of_birth: '',
            phone: '',
            address: '',
            emergency_contact: '',
        });
        setStudentFiles({
            ijazah: null,
            ktp: null,
            akte_kelahiran: null,
            kk: null,
            jft_jlpt: null,
            ssw: null,
            cv: null,
            visa_document: null,
            coe: null,
            work_contract: null,
        });
        setStudentError('');
    };

    const openStudentDialog = () => {
        resetStudentForm();
        setEditingStudent(null);
        setStudentDialogOpen(true);
    };

    const openEditStudentDialog = (e: React.MouseEvent, s: any) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingStudent(s);
        setStudentForm({
            name: s.user.name,
            email: s.user.email,
            password: '',
            nis: s.nis || '',
            gender: s.gender || '',
            date_of_birth: s.date_of_birth || '',
            phone: s.phone || '',
            address: s.address || '',
            emergency_contact: s.emergency_contact || '',
        });
        setStudentError('');
        setStudentDialogOpen(true);
    };

    const handleFileChange = (field: string, file: File | null, label: string) => {
        if (file && file.size > MAX_DOCUMENT_SIZE_BYTES) {
            setStudentFiles(prev => ({ ...prev, [field]: null }));
            setStudentError(`${label} terlalu besar. Maksimal ukuran tiap dokumen ${MAX_DOCUMENT_SIZE_MB} MB.`);
            return false;
        }

        setStudentFiles(prev => ({ ...prev, [field]: file }));
        setStudentError('');
        return true;
    };

    const addStudentToBatch = async () => {
        if (!editingStudent) {
            const requiredDocs = ['ijazah', 'ktp', 'akte_kelahiran', 'kk'];
            const missingDocs = requiredDocs.filter(field => !studentFiles[field]);
            const oversizedDoc = Object.entries(studentFiles).find(([, file]) => file && file.size > MAX_DOCUMENT_SIZE_BYTES);

            if (!studentForm.name || !studentForm.email || !studentForm.password || !studentForm.gender) {
                setStudentError('Nama, email, password, dan jenis kelamin wajib diisi.');
                return;
            }

            if (missingDocs.length > 0) {
                setStudentError('Dokumen wajib belum lengkap: ijazah, KTP, akte kelahiran, dan KK harus diunggah.');
                return;
            }

            if (oversizedDoc) {
                const docLabel = documentFields.find(doc => doc.key === oversizedDoc[0])?.label || 'Dokumen';
                setStudentError(`${docLabel} terlalu besar. Maksimal ukuran tiap dokumen ${MAX_DOCUMENT_SIZE_MB} MB.`);
                return;
            }
        } else {
            if (!studentForm.name || !studentForm.email) {
                setStudentError('Nama dan email wajib diisi.');
                return;
            }
        }

        setSavingStudent(true);
        setStudentError('');
        try {
            if (editingStudent) {
                await axios.put(`/api/students/${editingStudent.id}`, {
                    name: studentForm.name,
                    email: studentForm.email,
                    nis: studentForm.nis || null,
                    date_of_birth: studentForm.date_of_birth || null,
                    gender: studentForm.gender || null,
                    address: studentForm.address || null,
                    phone: studentForm.phone || null,
                    emergency_contact: studentForm.emergency_contact || null,
                });
            } else {
                const payload = new FormData();
            payload.append('name', studentForm.name);
            payload.append('email', studentForm.email);
            payload.append('password', studentForm.password);
            payload.append('gender', studentForm.gender);
            payload.append('batch_id', String(params.id));
            payload.append('require_documents', '1');

            Object.entries(studentForm).forEach(([key, value]) => {
                if (!['name', 'email', 'password', 'gender'].includes(key) && value) {
                    payload.append(key, value);
                }
            });

                Object.entries(studentFiles).forEach(([key, file]) => {
                    if (file) {
                        payload.append(key, file);
                    }
                });

                await axios.post('/api/students', payload);
            }
            setStudentDialogOpen(false);
            fetchBatch();
        } catch (err: any) {
            if (err.response?.status === 413) {
                setStudentError('Ukuran total dokumen terlalu besar. Maksimal total upload adalah 500 MB.');
                return;
            }

            const errors = err.response?.data?.errors;
            const firstError = errors ? Object.values(errors).flat()[0] : null;
            setStudentError(String(firstError || err.response?.data?.message || err.message || 'Gagal menambahkan siswa.'));
        } finally {
            setSavingStudent(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
            </div>
        );
    }

    if (!batch) {
        return <div className="text-center py-20 text-gray-500 dark:text-gray-400">Data angkatan tidak ditemukan.</div>;
    }

    const students = batch.enrollments?.map((e: any) => e.student) || [];
    const maxStudents = Math.min(batch.quota || 20, 20);
    const isBatchFull = students.length >= maxStudents;
    const getInitials = (name: string = '') => {
        if (!name) return 'U';
        const parts = name.split(' ').filter(Boolean);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header Actions */}
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/batches')} className="hover:bg-gray-100 dark:bg-gray-800">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Detail Angkatan</h1>
            </div>

            {/* Batch Info Card */}
            <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="flex-1 z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{batch.name}</h2>
                        <Badge variant={batch.status === 'active' ? 'default' : 'secondary'} className="bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 hover:bg-red-100 dark:bg-red-900/40 border-none px-3 py-1">
                            {batch.status.toUpperCase()}
                        </Badge>
                    </div>
                    <div className="flex items-center text-gray-500 dark:text-gray-400 space-x-4 text-sm">
                        <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {batch.start_date ? new Date(batch.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} s/d {batch.end_date ? new Date(batch.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                        <span className="flex items-center"><Users className="w-4 h-4 mr-1" /> {batch.enrollments_count || 0} / {batch.quota || '∞'} Siswa</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-full md:min-w-[520px] z-10">
                    <div className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Tingkatan Kelas Saat Ini</label>
                        <Select value={batch.class_level || ''} onValueChange={changeClassLevel} disabled={savingLevel}>
                            <SelectTrigger className="w-full bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl font-medium">
                                <SelectValue placeholder="Pilih Tingkatan">
                                    {batch.class_level === 'shou' ? 'Shou (Dasar)' : 
                                     batch.class_level === 'chuu' ? 'Chuu (Tengah)' :
                                     batch.class_level === 'kou' ? 'Kou (Atas)' :
                                     batch.class_level === 'jft' ? 'JFT' :
                                     batch.class_level === 'kelas_kaiwa' ? 'Kaiwa (percakapan)' : "Pilih Tingkatan"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="shou">Shou (Dasar)</SelectItem>
                                <SelectItem value="chuu">Chuu (Tengah)</SelectItem>
                                <SelectItem value="kou">Kou (Atas)</SelectItem>
                                <SelectItem value="jft">JFT</SelectItem>
                                <SelectItem value="kelas_kaiwa">Kaiwa (percakapan)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Sensei Pengajar</label>
                        <Select value={batch.teacher_id ? String(batch.teacher_id) : ''} onValueChange={changeTeacher} disabled={savingTeacher}>
                            <SelectTrigger className="w-full bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl font-medium">
                                <SelectValue placeholder="Pilih Sensei">
                                    {batch.teacher_id ? (teachers.find(tc => tc.id.toString() === String(batch.teacher_id))?.user?.name || teachers.find(tc => tc.id.toString() === String(batch.teacher_id))?.name) : "Pilih Sensei"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {teachers.map((teacher) => (
                                    <SelectItem key={teacher.id} value={String(teacher.id)}>
                                        {teacher.user?.name || teacher.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {/* Decorative background */}
                <div className="absolute left-0 bottom-0 w-full h-1/2 bg-gradient-to-t from-red-50/20 to-transparent pointer-events-none"></div>
            </div>

            {/* Interactive Animated Tabs */}
            <div className="mt-6">
                <div className="relative bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl backdrop-blur-sm border border-gray-200 dark:border-gray-600/50 rounded-full w-full sm:w-fit p-1.5 flex shadow-sm mb-6">
                    <button
                        onClick={() => setActiveTab('siswa')}
                        className={`relative z-10 rounded-full px-6 py-2.5 font-bold text-sm transition-colors duration-300 ${activeTab === 'siswa' ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:text-red-700'}`}
                    >
                        {activeTab === 'siswa' && (
                            <motion.div
                                layoutId="activeBatchTab"
                                className="absolute inset-0 bg-red-700 rounded-full -z-10 shadow-md"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        Daftar Siswa ({students.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`relative z-10 rounded-full px-6 py-2.5 font-bold text-sm transition-colors duration-300 ${activeTab === 'info' ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:text-red-700'}`}
                    >
                        {activeTab === 'info' && (
                            <motion.div
                                layoutId="activeBatchTab"
                                className="absolute inset-0 bg-red-700 rounded-full -z-10 shadow-md"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        Info Angkatan
                    </button>
                </div>

                <div className="relative">
                    {activeTab === 'siswa' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {students.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-700/50">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">Belum ada siswa di angkatan ini.</p>
                            <Button variant="outline" className="mt-4" onClick={openStudentDialog}>Tambahkan Siswa</Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-700/50 rounded-xl p-4">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{students.length} dari {maxStudents} siswa terdaftar</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Setiap angkatan dibatasi maksimal 20 siswa.</p>
                                </div>
                                <Button onClick={openStudentDialog} disabled={isBatchFull}>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Tambah Siswa
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {students.map((student: any) => (
                                <Link href={`/dashboard/students/${student.id}`} key={student.id} className="group block h-full">
                                    <div className="bg-white dark:bg-card rounded-[2rem] border border-red-100 dark:border-red-900/50 dark:border-red-900/50 overflow-hidden hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 relative flex flex-col h-full hover:-translate-y-1">
                                        {/* Watermark Ornament */}
                                        <div className="absolute -left-12 -bottom-12 w-48 h-48 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500 z-0 text-red-500">
                                            <JapaneseOrnament type="sakura" className="w-full h-full" />
                                        </div>

                                        <div className="p-6 pb-2 flex-1 relative z-10">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-14 h-14 rounded-full overflow-hidden bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl shadow-sm border border-gray-100 dark:border-gray-700/50 flex items-center justify-center">
                                                    {student.user.profile_photo_url ? (
                                                        <Image src={student.user.profile_photo_url} alt={student.user.name} width={56} height={56} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 flex items-center justify-center font-bold text-xl">
                                                            {getInitials(student.user.name)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="px-3 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 text-xs font-medium rounded-full border border-red-100 dark:border-red-900/50">
                                                        {student.status || 'active'}
                                                    </div>
                                                    <button 
                                                        onClick={(e) => openEditStudentDialog(e, student)}
                                                        className="p-1.5 bg-gray-50 dark:bg-[#1e2532]/90 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors z-20 relative border border-gray-100 dark:border-gray-800/50"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <h3 className="font-extrabold text-gray-900 dark:text-gray-100 text-xl tracking-tight truncate">{student.user.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{student.nis || 'Belum ada NIS'}</p>
                                            
                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between border-t border-gray-50 dark:border-gray-800/50 pt-4">
                                                    <span className="text-gray-400">Gender</span>
                                                    <span className="font-medium text-gray-900 dark:text-gray-200">{student.gender || '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Email</span>
                                                    <span className="font-medium text-gray-500 dark:text-gray-400 truncate ml-2 text-right" title={student.user.email}>{student.user.email}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-4 mt-4 border-t border-gray-50 dark:border-gray-800/50">
                                                <Badge variant={student.jft_jlpt ? 'default' : 'outline'} className={student.jft_jlpt ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none justify-center' : 'justify-center'}>
                                                    JFT/JLPT
                                                </Badge>
                                                <Badge variant={student.ssw ? 'default' : 'outline'} className={student.ssw ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none justify-center' : 'justify-center'}>
                                                    SSW
                                                </Badge>
                                            </div>
                                        </div>
                                        
                                        <div className="px-6 py-4 mt-2 flex items-center justify-between border-t border-gray-50 dark:border-gray-800/50 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl/50 dark:bg-card/50 group-hover:bg-red-50 dark:bg-red-950/40/50 dark:group-hover:bg-red-900/10 transition-colors z-10 relative">
                                            <span className="text-sm font-semibold text-red-700 dark:text-red-400 dark:text-red-500">Lihat Profil</span>
                                            <ArrowRight className="w-4 h-4 text-red-700 dark:text-red-400 dark:text-red-500 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                </div>
                                </Link>
                            ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {activeTab === 'info' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700/50 max-w-2xl">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b pb-4">Pengaturan Angkatan</h3>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800">
                                        <span className="text-gray-500 dark:text-gray-400">Kuota Maksimal</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{batch.quota || 'Tidak Terbatas'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800">
                                        <span className="text-gray-500 dark:text-gray-400">Tanggal Mulai</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{batch.start_date ? new Date(batch.start_date).toLocaleDateString() : '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800">
                                        <span className="text-gray-500 dark:text-gray-400">Tanggal Selesai (Estimasi)</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{batch.end_date ? new Date(batch.end_date).toLocaleDateString() : '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-gray-500 dark:text-gray-400">Total Terdaftar</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{batch.enrollments_count || 0} Siswa</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-t border-gray-50 dark:border-gray-800">
                                        <span className="text-gray-500 dark:text-gray-400">Sensei Pengajar</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{batch.teacher?.user?.name || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">{editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</DialogTitle>
                        <DialogDescription>{editingStudent ? 'Ubah informasi detail siswa.' : 'Isi data dan unggah dokumen untuk mendaftarkan siswa ke angkatan ini.'}</DialogDescription>
                    </DialogHeader>
                    {studentError && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-100 dark:border-red-900/50 p-3 rounded-md text-sm">{studentError}</div>}
                    <div className="grid gap-5 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Nama Lengkap *</Label>
                                <Input value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>NIS</Label>
                                <Input value={studentForm.nis} onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Email *</Label>
                                <Input type="email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} />
                            </div>
                            {!editingStudent && (
                                <div className="grid gap-2">
                                    <Label>Password Login *</Label>
                                    <Input type="password" value={studentForm.password} onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} />
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label>Jenis Kelamin *</Label>
                                <Select value={studentForm.gender} onValueChange={(value) => setStudentForm({ ...studentForm, gender: value ?? '' })}>
                                    <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                        <SelectItem value="Perempuan">Perempuan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Tanggal Lahir</Label>
                                <Input type="date" value={studentForm.date_of_birth} onChange={(e) => setStudentForm({ ...studentForm, date_of_birth: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>No. Telepon</Label>
                                <Input value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Kontak Darurat</Label>
                                <Input value={studentForm.emergency_contact} onChange={(e) => setStudentForm({ ...studentForm, emergency_contact: e.target.value })} />
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                                <Label>Alamat</Label>
                                <AddressSelector 
                                    value={studentForm.address} 
                                    onChange={(val) => setStudentForm({ ...studentForm, address: val })} 
                                />
                            </div>
                        </div>

                        {!editingStudent && (
                            <div className="border border-gray-100 dark:border-gray-700/50 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <FileCheck2 className="w-5 h-5 text-red-700 dark:text-red-400" />
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Dokumen Siswa</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {documentFields.map((doc) => (
                                        <div key={doc.key} className="grid gap-2">
                                            <Label className="flex justify-between items-center text-xs">
                                                <span>{doc.label}{doc.required ? ' *' : ''}</span>
                                                {studentFiles[doc.key] && (
                                                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full font-medium">
                                                        Terpilih ({(studentFiles[doc.key]!.size / 1024 / 1024).toFixed(1)} MB)
                                                    </span>
                                                )}
                                            </Label>
                                            <Input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                className="cursor-pointer file:cursor-pointer file:bg-red-50 file:text-red-700 file:border-0 file:mr-4 file:py-1 file:px-3 file:rounded-full file:text-xs file:font-semibold hover:file:bg-red-100 text-xs dark:bg-[#151a23]/90"
                                                onChange={(e) => {
                                                    const accepted = handleFileChange(doc.key, e.target.files?.[0] || null, doc.label);
                                                    if (!accepted) e.target.value = '';
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStudentDialogOpen(false)}>Batal</Button>
                        <Button onClick={addStudentToBatch} disabled={savingStudent || isBatchFull}>
                            {savingStudent ? 'Menyimpan...' : 'Simpan Siswa'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
