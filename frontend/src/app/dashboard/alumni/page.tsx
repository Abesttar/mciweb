'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutGrid, List, Search, UserPlus, MoreVertical, Edit, Trash2, ArrowRight, Users, CreditCard, Activity, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import JapaneseOrnament from '@/components/JapaneseOrnament';
import { AddressSelector } from '@/components/AddressSelector';
import { Checkbox } from '@/components/ui/checkbox';

interface Student {
    id: number;
    user_id: number;
    nis: string | null;
    date_of_birth: string | null;
    address: string | null;
    phone: string | null;
    emergency_contact: string | null;
    gender: string | null;
    status: string;
    payments_sum_amount: number | null;
    training_program_id: number | null;
    training_program?: {
        id: number;
        name: string;
        stages: { name: string; amount: number }[];
    } | null;
    user: { id: number; name: string; email: string; profile_photo_url?: string };
    roadmaps?: { id: number; status: string; roadmap_stage?: { name: string } }[];
    class_level: string | null;
}

function PaymentProgress({ student }: { student: Student }) {
    const paid = student.payments_sum_amount || 0;
    
    // Default fallback if no program is assigned
    let targetAmount = 7000000;
    if (student.training_program && student.training_program.stages) {
        targetAmount = student.training_program.stages.reduce((sum: number, stage: any) => sum + Number(stage.amount), 0);
    }
    
    const pct = Math.min(100, Math.round((paid / (targetAmount || 1)) * 100));
    return (
        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800/50">
            <div className="flex items-center justify-between mb-1">
                <span className="flex items-center text-xs text-gray-400">
                    <CreditCard className="w-3 h-3 mr-1" /> Pembayaran
                </span>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${
                        pct >= 100 ? 'bg-green-500' : pct > 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="text-xs text-gray-400 mt-1">Rp {new Intl.NumberFormat('id-ID').format(paid)} / Rp {new Intl.NumberFormat('id-ID').format(targetAmount)}</p>
        </div>
    );
}

function RoadmapProgress({ roadmaps }: { roadmaps?: any[] }) {
    if (!roadmaps || roadmaps.length === 0) return null;
    const current = roadmaps.find(r => r.status === 'in_progress') || roadmaps.filter(r => r.status === 'completed').pop() || roadmaps[0];
    
    return (
        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800/50">
            <div className="flex items-center justify-between mb-1">
                <span className="flex items-center text-xs text-gray-400">
                    <Activity className="w-3 h-3 mr-1" /> Roadmap
                </span>
                <span className={`text-[10px] font-semibold px-1.5 rounded-sm ${current?.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : current?.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 dark:text-gray-400'}`}>
                    {current?.status === 'completed' ? 'Completed' : current?.status === 'in_progress' ? 'In Progress' : current?.status === 'cancelled' ? 'Canceled' : 'Pending'}
                </span>
            </div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{current?.roadmap_stage?.name || '-'}</p>
        </div>
    );
}

export default function AlumniPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name_asc');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
    const [form, setForm] = useState({ name: '', email: '', password: '', nis: '', gender: '', date_of_birth: '', address: '', phone: '', emergency_contact: '', status: 'active', batch_id: '', training_program_id: '', class_level: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [batches, setBatches] = useState<{ id: number; name: string }[]>([]);
    const [programs, setPrograms] = useState<{ id: number; name: string }[]>([]);

    // === State: Bulk Kenaikan Tingkatan ===
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkLevelDialogOpen, setBulkLevelDialogOpen] = useState(false);
    const [bulkTargetLevel, setBulkTargetLevel] = useState('');
    const [savingBulkLevel, setSavingBulkLevel] = useState(false);

    const handleBulkLevelSubmit = async () => {
        if (!bulkTargetLevel) { toast.error('Pilih tingkatan tujuan.'); return; }
        if (selectedIds.length === 0) { toast.error('Pilih minimal 1 siswa.'); return; }
        setSavingBulkLevel(true);
        try {
            await axios.post('/api/students/bulk-level-update', {
                student_ids: selectedIds,
                class_level: bulkTargetLevel,
            });
            toast.success(`Tingkatan ${selectedIds.length} siswa berhasil diperbarui!`);
            setBulkLevelDialogOpen(false);
            setSelectedIds([]);
            setBulkTargetLevel('');
            fetchStudents();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal memperbarui tingkatan.');
        } finally {
            setSavingBulkLevel(false);
        }
    };

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/students', { params: { search: search || undefined, per_page: 1000, status: 'graduated' } });
            setStudents(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [search]);

    // Fetch batches and programs once
    useEffect(() => {
        axios.get('/api/batches').then(res => {
            setBatches(res.data.data || res.data || []);
        }).catch(() => {});
        axios.get('/api/training-programs', { params: { active_only: 1 } }).then(res => {
            setPrograms(res.data || []);
        }).catch(() => {});
    }, []);

    useEffect(() => { 
        // Debounce search
        const timeout = setTimeout(fetchStudents, 300);
        return () => clearTimeout(timeout);
    }, [search, fetchStudents]);

    const openCreate = () => {
        setEditingStudent(null);
        setForm({ name: '', email: '', password: '', nis: '', gender: '', date_of_birth: '', address: '', phone: '', emergency_contact: '', status: 'graduated', batch_id: '', training_program_id: '', class_level: '' });
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (s: Student, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingStudent(s);
        const activeEnrollment = s.enrollments?.[0];
        setForm({
            name: s.user.name, email: s.user.email, password: '',
            nis: s.nis || '', gender: s.gender || '', date_of_birth: s.date_of_birth || '',
            address: s.address || '', phone: s.phone || '',
            emergency_contact: s.emergency_contact || '', status: s.status || 'active',
            batch_id: activeEnrollment?.batch?.id ? String(activeEnrollment.batch.id) : 'none',
            training_program_id: s.training_program_id ? String(s.training_program_id) : '',
            class_level: s.class_level || '',
        });
        setError('');
        setDialogOpen(true);
    };

    const confirmDelete = (s: Student, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDeletingStudent(s);
        setDeleteDialogOpen(true);
    };

    const handleSubmit = async () => {
        setSaving(true); setError('');
        try {
            if (editingStudent) {
                // Update student data
                await axios.put(`/api/students/${editingStudent.id}`, {
                    name: form.name, email: form.email,
                    nis: form.nis || null, date_of_birth: form.date_of_birth || null,
                    gender: form.gender || null,
                    address: form.address || null, phone: form.phone || null,
                    emergency_contact: form.emergency_contact || null,
                    status: form.status || 'active',
                    class_level: form.class_level || null,
                    training_program_id: form.training_program_id ? parseInt(form.training_program_id) : null,
                });
                // Handle batch enrollment
                if (form.batch_id && form.batch_id !== 'none') {
                    const existingEnrollment = editingStudent.enrollments?.[0];
                    const currentBatchId = existingEnrollment?.batch?.id?.toString();
                    if (existingEnrollment && currentBatchId !== form.batch_id) {
                        // Update existing enrollment to new batch using enrollment's own id
                        await axios.put(`/api/enrollments/${existingEnrollment.id}`, {
                            batch_id: parseInt(form.batch_id),
                            student_id: editingStudent.id,
                            status: 'active',
                        }).catch(async () => {
                            // If update fails, try creating new enrollment
                            await axios.post('/api/enrollments', {
                                student_id: editingStudent.id,
                                batch_id: parseInt(form.batch_id),
                                status: 'active',
                            }).catch(() => {});
                        });
                    } else if (!existingEnrollment) {
                        // No enrollment yet, create one
                        await axios.post('/api/enrollments', {
                            student_id: editingStudent.id,
                            batch_id: parseInt(form.batch_id),
                            status: 'active',
                        }).catch(() => {});
                    }
                }
            } else {
                // Create student
                const res = await axios.post('/api/students', {
                    name: form.name, email: form.email, password: form.password,
                    nis: form.nis || null, date_of_birth: form.date_of_birth || null,
                    gender: form.gender || null,
                    address: form.address || null, phone: form.phone || null,
                    emergency_contact: form.emergency_contact || null,
                    status: form.status || 'active',
                    class_level: form.class_level || null,
                    training_program_id: form.training_program_id ? parseInt(form.training_program_id) : undefined,
                });
                // Enroll in batch if selected
                if (form.batch_id && res.data?.id) {
                    await axios.post('/api/enrollments', {
                        student_id: res.data.id,
                        batch_id: parseInt(form.batch_id),
                        status: 'active',
                    }).catch(() => {});
                }
            }
            setDialogOpen(false); fetchStudents();
        } catch (err: any) { setError(err.response?.data?.message || 'Gagal menyimpan data'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deletingStudent) return;
        try {
            await axios.delete(`/api/students/${deletingStudent.id}`);
            setDeleteDialogOpen(false); setDeletingStudent(null); fetchStudents();
        } catch (err: any) { toast.error(err.response?.data?.message || 'Gagal menghapus data'); }
    };

    // Helper for initials
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const getCurrentBatch = (student: Student) => student.enrollments?.[0]?.batch;

    const sortedStudents = [...students].sort((a, b) => {
        if (sortBy === 'name_asc') {
            return a.user.name.localeCompare(b.user.name);
        } else if (sortBy === 'name_desc') {
            return b.user.name.localeCompare(a.user.name);
        } else if (sortBy === 'nis_asc') {
            return (a.nis || '').localeCompare(b.nis || '');
        } else if (sortBy === 'nis_desc') {
            return (b.nis || '').localeCompare(a.nis || '');
        } else if (sortBy === 'batch_asc') {
            const batchA = getCurrentBatch(a)?.name || '';
            const batchB = getCurrentBatch(b)?.name || '';
            return batchA.localeCompare(batchB);
        } else if (sortBy === 'payment_desc') {
            const payA = a.payments_sum_amount || 0;
            const payB = b.payments_sum_amount || 0;
            return payB - payA;
        } else if (sortBy === 'payment_asc') {
            const payA = a.payments_sum_amount || 0;
            const payB = b.payments_sum_amount || 0;
            return payA - payB;
        } else if (sortBy === 'roadmap') {
            const getRoadmapStatusScore = (s: Student) => {
                const roadmaps = s.roadmaps || [];
                if (roadmaps.length === 0) return 0;
                const current = roadmaps.find(r => r.status === 'in_progress') || roadmaps.filter(r => r.status === 'completed').pop() || roadmaps[0];
                if (current?.status === 'completed') return 3;
                if (current?.status === 'in_progress') return 2;
                return 1;
            };
            return getRoadmapStatusScore(b) - getRoadmapStatusScore(a);
        }
        return 0;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 dark:bg-red-950/40 rounded-full blur-3xl opacity-50 pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute -top-10 -right-10 text-red-100 opacity-30 group-hover:opacity-50 transition-all duration-700 group-hover:rotate-12 group-hover:scale-110 pointer-events-none">
                    <JapaneseOrnament type="wave" className="w-64 h-64" />
                </div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t.studentData}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">{t.studentDataDesc}</p>
                </div>
                <div className="mt-4 sm:mt-0 relative z-10 flex gap-2">
                    {selectedIds.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => setBulkLevelDialogOpen(true)}
                            className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700/50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Kenaikan Tingkatan ({selectedIds.length})
                        </Button>
                    )}
                    <Button onClick={() => openCreate()} className="bg-red-700 hover:bg-red-800 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <UserPlus className="w-4 h-4 mr-2" />
                        {t.addStudent}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl backdrop-blur-md p-3 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm relative z-10">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input 
                        type="text" 
                        placeholder={t.searchStudent || "Cari nama, NIS, atau email..."} 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-500 rounded-xl bg-gray-50/50 dark:bg-gray-800/50"
                    />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <Select value={sortBy} onValueChange={(val) => setSortBy(val || 'name_asc')}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600/50">
                            <SelectValue placeholder="Urutkan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name_asc">Nama (A-Z)</SelectItem>
                            <SelectItem value="name_desc">Nama (Z-A)</SelectItem>
                            <SelectItem value="nis_asc">NIS (A-Z)</SelectItem>
                            <SelectItem value="nis_desc">NIS (Z-A)</SelectItem>
                            <SelectItem value="batch_asc">Batch / Kelas</SelectItem>
                            <SelectItem value="payment_desc">Pembayaran Lunas</SelectItem>
                            <SelectItem value="payment_asc">Pembayaran Sedikit</SelectItem>
                            <SelectItem value="roadmap">Roadmap</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-full sm:w-auto">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md flex items-center transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl shadow-sm text-red-700' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'}`}
                        title="Grid View"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md flex items-center transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl shadow-sm text-red-700' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'}`}
                        title="List View"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
                </div>
            ) : students.length === 0 ? (
                <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 py-16 text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Tidak ada alumni ditemukan</h3>
                    <p className="text-gray-500 dark:text-gray-400">Belum ada data alumni yang tersedia.</p>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {sortedStudents.map((s, idx) => (
                                <Link href={`/dashboard/students/${s.id}`} key={s.id} className="group block h-full">
                                    <div className="bg-white dark:bg-card rounded-2xl sm:rounded-[2rem] border border-red-100 dark:border-red-900/50 dark:border-red-900/50 overflow-hidden hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 relative flex flex-col h-full hover:-translate-y-1">
                                        {/* Bulk Selection Checkbox */}
                                        <div className="absolute top-4 left-4 z-30" onClick={e => e.preventDefault()}>
                                            <Checkbox 
                                                checked={selectedIds.includes(s.id)} 
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedIds(prev => [...prev, s.id]);
                                                    else setSelectedIds(prev => prev.filter(id => id !== s.id));
                                                }}
                                                className="bg-white/80 backdrop-blur-sm border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                            />
                                        </div>
                                        
                                        {/* Watermark Ornament */}
                                        <div className="absolute -left-12 -bottom-12 w-48 h-48 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500 z-0 text-red-500">
                                            <JapaneseOrnament type="sakura" className="w-full h-full" />
                                        </div>

                                        <div className="p-4 sm:p-6 pb-2 flex-1 relative z-10">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-14 h-14 rounded-full overflow-hidden bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl shadow-sm border border-gray-100 dark:border-gray-700/50 flex items-center justify-center">
                                                {s.user.profile_photo_url ? (
                                                    <Image src={s.user.profile_photo_url} alt={s.user.name} width={56} height={56} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 flex items-center justify-center font-bold text-xl">
                                                        {getInitials(s.user.name)}
                                                    </div>
                                                )}
                                                </div>
                                                {s.status === 'active' && (
                                                    <div className="px-3 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 text-xs font-medium rounded-full border border-red-100 dark:border-red-900/50">
                                                        active
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <h3 className="font-extrabold text-gray-900 dark:text-gray-100 text-xl tracking-tight truncate">{s.user.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{s.nis || 'Belum ada NIS'}</p>
                                            
                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between border-t border-gray-50 dark:border-gray-800/50 pt-4">
                                                    <span className="text-gray-400">{t.batch}</span>
                                                    <span className="font-medium text-gray-900 dark:text-gray-200">{getCurrentBatch(s)?.name || '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Tingkat</span>
                                                    <span className="font-medium text-gray-900 dark:text-gray-200 capitalize">{s.class_level?.replace('_', ' ') || '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">{t.gender}</span>
                                                    <span className="font-medium text-gray-900 dark:text-gray-200">{s.gender || '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">{t.email}</span>
                                                    <span className="font-medium text-gray-500 dark:text-gray-400 truncate ml-2 text-right" title={s.user.email}>{s.user.email}</span>
                                                </div>
                                            </div>
                                            <PaymentProgress student={s} />
                                            <RoadmapProgress roadmaps={s.roadmaps} />
                                        </div>
                                        
                                        <div className="px-6 py-4 mt-4 flex items-center justify-between border-t border-gray-50 dark:border-gray-800/50 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl/50 dark:bg-card/50 group-hover:bg-red-50 dark:bg-red-950/40/50 dark:group-hover:bg-red-900/10 transition-colors z-10 relative">
                                            <span className="text-sm font-semibold text-red-700 dark:text-red-400 dark:text-red-500">{t.viewProfile || 'Lihat Profil'}</span>
                                            <ArrowRight className="w-4 h-4 text-red-700 dark:text-red-400 dark:text-red-500 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                        
                                        {/* Quick Actions (Absolute) */}
                                        <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                            <button onClick={(e) => openEdit(s, e)} className="p-2 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl/90 dark:bg-black/50 backdrop-blur rounded-full shadow-sm text-gray-500 dark:text-gray-400 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-950/40">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => confirmDelete(s, e)} className="p-2 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl/90 dark:bg-black/50 backdrop-blur rounded-full shadow-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:bg-red-950/40">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl">
                                    <TableRow>
                                        <TableHead className="w-[40px] text-center">
                                            <Checkbox 
                                                checked={sortedStudents.length > 0 && selectedIds.length === sortedStudents.length}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedIds(sortedStudents.map(s => s.id));
                                                    else setSelectedIds([]);
                                                }}
                                            />
                                        </TableHead>
                                        <TableHead>Siswa</TableHead>
                                        <TableHead>NIS</TableHead>
                                        <TableHead>Batch</TableHead>
                                        <TableHead>Tingkat</TableHead>
                                        <TableHead>Kontak</TableHead>
                                        <TableHead>Pembayaran</TableHead>
                                        <TableHead>Roadmap</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedStudents.map((s) => (
                                        <TableRow key={s.id} className={`hover:bg-gray-50/50 dark:bg-gray-800/50 group cursor-pointer relative ${selectedIds.includes(s.id) ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`} onClick={() => router.push(`/dashboard/students/${s.id}`)}>
                                            <TableCell onClick={e => e.stopPropagation()}>
                                                <Checkbox 
                                                    checked={selectedIds.includes(s.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) setSelectedIds(prev => [...prev, s.id]);
                                                        else setSelectedIds(prev => prev.filter(id => id !== s.id));
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 flex items-center justify-center font-bold text-sm">
                                                        {s.user.profile_photo_url ? (
                                                            <Image src={s.user.profile_photo_url} alt={s.user.name} width={40} height={40} className="w-full h-full object-cover" />
                                                        ) : (
                                                            getInitials(s.user.name)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white group-hover:text-red-700 dark:text-red-400 transition-colors">{s.user.name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{s.user.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{s.nis || '-'}</TableCell>
                                            <TableCell>{getCurrentBatch(s)?.name || '-'}</TableCell>
                                            <TableCell className="capitalize">{s.class_level?.replace('_', ' ') || '-'}</TableCell>
                                            <TableCell>{s.phone || '-'}</TableCell>
                                            <TableCell>
                                                <div className="min-w-[120px]">
                                                    {(() => {
                                                        const paid = s.payments_sum_amount || 0;
                                                        const target = s.training_program?.stages?.reduce((sum: number, stage: any) => sum + Number(stage.amount), 0) || 7000000;
                                                        const pct = Math.min(100, Math.round((paid / target) * 100));
                                                        return (
                                                            <>
                                                                <div className="flex justify-between text-xs mb-1">
                                                                    <span className="text-gray-500 dark:text-gray-400">Rp {new Intl.NumberFormat('id-ID').format(paid)}</span>
                                                                    <span className={`font-bold ${pct >= 100 ? 'text-green-600' : 'text-red-600'}`}>{pct}%</span>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-green-500' : pct > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const roadmaps = s.roadmaps || [];
                                                    if (roadmaps.length === 0) return <span className="text-xs text-gray-400">-</span>;
                                                    const current = roadmaps.find(r => r.status === 'in_progress') || roadmaps.filter(r => r.status === 'completed').pop() || roadmaps[0];
                                                    return (
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[120px]">{current?.roadmap_stage?.name || '-'}</span>
                                                            <span className={`text-[10px] w-max mt-0.5 font-semibold px-1.5 rounded-sm ${current?.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : current?.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 dark:text-gray-400'}`}>
                                                                {current?.status === 'completed' ? 'Completed' : current?.status === 'in_progress' ? 'In Progress' : current?.status === 'cancelled' ? 'Canceled' : 'Pending'}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className={s.status === 'active' ? 'bg-red-50 text-red-800 hover:bg-red-100 border-none' : ''}>
                                                    {s.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="sm" onClick={(e) => openEdit(s, e)} className="h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-950/40">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={(e) => confirmDelete(s, e)} className="h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:bg-red-950/40">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </>
            )}

            {/* ===== Dialog Kenaikan Tingkatan ===== */}
            <Dialog open={bulkLevelDialogOpen} onOpenChange={setBulkLevelDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-amber-600" />
                            Kenaikan Tingkatan Massal
                        </DialogTitle>
                        <DialogDescription>
                            Tentukan tingkatan baru untuk {selectedIds.length} siswa yang Anda pilih.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label className="font-semibold">Tingkatan Tujuan <span className="text-red-500">*</span></Label>
                            <Select value={bulkTargetLevel} onValueChange={setBulkTargetLevel}>
                                <SelectTrigger className="bg-gray-50 dark:bg-[#1e2532]/90 border-gray-200 dark:border-gray-600/50">
                                    <SelectValue placeholder="Pilih tingkatan tujuan..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="shou">Shou (Dasar)</SelectItem>
                                    <SelectItem value="chuu">Chuu (Menengah)</SelectItem>
                                    <SelectItem value="kou">Kou (Lanjutan)</SelectItem>
                                    <SelectItem value="jft">JFT</SelectItem>
                                    <SelectItem value="kaiwa">Kelas Kaiwa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setBulkLevelDialogOpen(false)} className="hover:bg-gray-100 dark:bg-gray-800">Batal</Button>
                        <Button onClick={handleBulkLevelSubmit} disabled={savingBulkLevel || !bulkTargetLevel} className="bg-amber-600 hover:bg-amber-700 text-white">
                            {savingBulkLevel ? 'Memproses...' : `Terapkan ke ${selectedIds.length} Siswa`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Edit / Create remains largely the same, just slightly modernized borders */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[550px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</DialogTitle>
                        <DialogDescription>{editingStudent ? 'Ubah informasi detail siswa.' : 'Lengkapi form untuk mendaftarkan kenshusei baru.'}</DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-lg text-sm border border-red-100 dark:border-red-900/50">{error}</div>}
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Nama Lengkap *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-600" /></div>
                            <div className="grid gap-2"><Label>NIS</Label><Input value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-600" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-600" /></div>
                            {!editingStudent && <div className="grid gap-2"><Label>Password Login *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-600" /></div>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Tanggal Lahir</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-600" /></div>
                            <div className="grid gap-2"><Label>No. Telepon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-600" /></div>
                        </div>
                        <div className="grid gap-2"><Label>Jenis Kelamin</Label><Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="Laki-laki / Perempuan" className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-600" /></div>
                        <div className="grid gap-2">
                            <Label>Status Siswa</Label>
                            <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value ?? 'active' })}>
                                <SelectTrigger className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-600">
                                    <SelectValue placeholder="Pilih status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Aktif</SelectItem>
                                    <SelectItem value="inactive">Non-Aktif (Berhenti / Lulus tanpa Job)</SelectItem>
                                    <SelectItem value="graduated">Alumni (Lolos Job / Berangkat)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>Alamat Tinggal</Label>
                            <AddressSelector 
                                value={form.address} 
                                onChange={(val) => setForm({ ...form, address: val })} 
                            />
                        </div>
                        <div className="grid gap-2"><Label>Kontak Darurat (Ortu/Wali)</Label><Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-600" /></div>
                        <div className="grid gap-2">
                            <Label>Program Pelatihan <span className="text-red-500">*</span></Label>
                            <Select value={form.training_program_id ? String(form.training_program_id) : ''} onValueChange={(value) => setForm({ ...form, training_program_id: value ?? '' })}>
                                <SelectTrigger className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-600">
                                    <SelectValue placeholder="Pilih program...">
                                        {form.training_program_id 
                                            ? programs.find(p => p.id.toString() === String(form.training_program_id))?.name 
                                            : "Pilih program..."}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {programs.map(p => (
                                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Batch / Kelas</Label>
                            <Select value={form.batch_id ? String(form.batch_id) : ''} onValueChange={(value) => setForm({ ...form, batch_id: value ?? '' })}>
                                <SelectTrigger className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-600">
                                    <SelectValue placeholder="Pilih batch...">
                                        {form.batch_id && form.batch_id !== 'none' 
                                            ? batches.find(b => b.id.toString() === String(form.batch_id))?.name 
                                            : (form.batch_id === 'none' ? "— Tidak ada batch —" : "Pilih batch...")}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">— Tidak ada batch —</SelectItem>
                                    {batches.map(b => (
                                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Tingkatan Kelas</Label>
                            <Select value={form.class_level || 'none'} onValueChange={(value) => setForm({ ...form, class_level: value === 'none' ? '' : value })}>
                                <SelectTrigger className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 focus-visible:ring-red-600">
                                    <SelectValue placeholder="Pilih tingkatan..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">— Belum Ada Tingkatan —</SelectItem>
                                    <SelectItem value="shou">Shou</SelectItem>
                                    <SelectItem value="chuu">Chuu</SelectItem>
                                    <SelectItem value="kou">Kou</SelectItem>
                                    <SelectItem value="jft">JFT</SelectItem>
                                    <SelectItem value="kaiwa">Kelas Kaiwa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} className="hover:bg-gray-100 dark:bg-gray-800">Batal</Button>
                        <Button onClick={handleSubmit} disabled={saving} className="bg-red-700 hover:bg-red-800">{saving ? 'Menyimpan...' : 'Simpan Data'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Siswa Kenshusei?</AlertDialogTitle>
                        <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan. Data <strong>{deletingStudent?.user?.name}</strong> akan dihapus permanen dari sistem beserta seluruh riwayat akademiknya.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-gray-100 dark:bg-gray-800">Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white border-none">Ya, Hapus Permanen</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
