'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, FileUp, Eye, Edit2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function ClassGradesPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id as string;

    const [studyClass, setStudyClass] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // UI state
    const [gradeType, setGradeType] = useState('daily');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [chapter, setChapter] = useState('1');
    const [remarks, setRemarks] = useState('Nilai harian');
    
    const [gradesData, setGradesData] = useState<any>({}); 
    // gradesData structure: { [enrollment_id]: { score: number, components: {}, is_passed: boolean } }
    const [attendanceData, setAttendanceData] = useState<any>({});
    // attendanceData structure: { [enrollment_id]: { status: string, notes?: string, document_path?: string, end_date?: string } }

    const [absenceModalOpen, setAbsenceModalOpen] = useState(false);
    const [currentAbsenceStudent, setCurrentAbsenceStudent] = useState<any>(null);
    const [absenceForm, setAbsenceForm] = useState({ notes: '', end_date: '', document: null as File | null });
    const [uploadingAbsence, setUploadingAbsence] = useState(false);

    const isShoChuKou = studyClass && ['shou', 'chuu', 'kou'].includes(studyClass.class_type);
    const isShoChuKouOrJft = studyClass && ['shou', 'chuu', 'kou', 'jft'].includes(studyClass.class_type);
    const isDailyOrWeeklyTypeClass = studyClass && ['shou', 'chuu', 'kou', 'jft', 'kaiwa'].includes(studyClass.class_type);

    const fetchClassAndStudents = useCallback(async () => {
        setLoading(true);
        try {
            const classRes = await axios.get(`/api/study-classes/${classId}`);
            setStudyClass(classRes.data);

            const params = classRes.data.class_type === 'kaiwa'
                ? { class_level: 'kaiwa', status: 'active', per_page: 500 }
                : { batch_id: classRes.data.batch_id, status: 'active', per_page: 500 };
            
            const enrollmentsRes = await axios.get('/api/enrollments', { params });
            setEnrollments(enrollmentsRes.data.data);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [classId]);

    const fetchGrades = useCallback(async () => {
        if (!studyClass) return;
        try {
            const params: any = { study_class_id: classId, type: gradeType, per_page: 500 };
            if (isDailyOrWeeklyTypeClass) {
                if (gradeType === 'daily' || gradeType === 'weekly') {
                    params.date = date;
                }
            }

            const gradesRes = await axios.get('/api/grades', { params });
            const existing = gradesRes.data.data.reduce((acc: any, grade: any) => {
                acc[grade.enrollment_id] = {
                    score: grade.score,
                    components: grade.components || {},
                    is_passed: grade.is_passed
                };
                return acc;
            }, {});
            setGradesData(existing);

            // Fetch Attendances for daily, weekly, and level_exam
            if (gradeType === 'daily' || gradeType === 'weekly' || gradeType === 'level_exam') {
                const attDate = (gradeType === 'daily' || gradeType === 'weekly') ? date : new Date().toISOString().split('T')[0];
                const attParams: any = { study_class_id: classId, per_page: 500 };
                if (gradeType === 'daily' || gradeType === 'weekly') attParams.date = attDate;
                const attRes = await axios.get('/api/attendances', { params: attParams });
                const attExisting = attRes.data.data.reduce((acc: any, att: any) => {
                    acc[att.enrollment_id] = {
                        status: att.status,
                        notes: att.notes,
                        document_path: att.document_path,
                    };
                    return acc;
                }, {});
                setAttendanceData(attExisting);
            } else {
                setAttendanceData({});
            }

            // If there's existing data, pre-fill chapter and remarks from the first found grade
            if (gradesRes.data.data.length > 0) {
                const firstGrade = gradesRes.data.data[0];
                if (firstGrade.chapter) setChapter(firstGrade.chapter);
                if (firstGrade.remarks) setRemarks(firstGrade.remarks);
            }
        } catch (err) {
            console.error('Failed to fetch existing grades', err);
        }
    }, [classId, gradeType, date, studyClass, isDailyOrWeeklyTypeClass]);

    useEffect(() => {
        fetchClassAndStudents();
    }, [fetchClassAndStudents]);

    useEffect(() => {
        fetchGrades();
    }, [fetchGrades]);

    // Handle initial chapter options based on class type
    useEffect(() => {
        if (studyClass) {
            if (studyClass.class_type === 'shou') setChapter('1');
            if (studyClass.class_type === 'chuu') setChapter('18');
            if (studyClass.class_type === 'kou') setChapter('35');
        }
    }, [studyClass]);

    useEffect(() => {
        if (gradeType === 'daily') setRemarks('Nilai harian');
        else if (gradeType === 'weekly') setRemarks('Nilai evaluasi Mingguan');
        else setRemarks('');
    }, [gradeType]);

    const handleComponentChange = (enrollmentId: number, component: string, value: string) => {
        const numVal = value === '' ? '' : Number(value);
        setGradesData((prev: any) => ({
            ...prev,
            [enrollmentId]: {
                ...prev[enrollmentId],
                components: {
                    ...(prev[enrollmentId]?.components || {}),
                    [component]: numVal
                }
            }
        }));
    };

    const handleScoreChange = (enrollmentId: number, value: string) => {
        const numVal = value === '' ? '' : Number(value);
        setGradesData((prev: any) => ({
            ...prev,
            [enrollmentId]: {
                ...prev[enrollmentId],
                score: numVal
            }
        }));
    };

    const handleIsPassedChange = (enrollmentId: number, value: string | null) => {
        setGradesData((prev: any) => ({
            ...prev,
            [enrollmentId]: {
                ...prev[enrollmentId],
                is_passed: value === '1' ? true : value === '0' ? false : undefined
            }
        }));
    };

    const handleAttendanceChange = (enrollmentId: number, value: string) => {
        setAttendanceData((prev: any) => ({
            ...prev,
            [enrollmentId]: { ...prev[enrollmentId], status: value }
        }));
        
        if (value !== 'Hadir' && value !== '-') {
            openAbsenceModal(enrollmentId);
        }
    };

    const openAbsenceModal = (enrollmentId: number) => {
        const enrollment = enrollments.find(e => e.id === enrollmentId);
        const existingData = attendanceData[enrollmentId];
        setCurrentAbsenceStudent(enrollment);
        setAbsenceForm({
            notes: existingData?.notes || '',
            end_date: existingData?.end_date || '',
            document: null,
        });
        setAbsenceModalOpen(true);
    };

    const handleAbsenceSave = async () => {
        if (!currentAbsenceStudent) return;
        setUploadingAbsence(true);
        try {
            let documentPath = attendanceData[currentAbsenceStudent.id]?.document_path;
            
            if (absenceForm.document) {
                const formData = new FormData();
                formData.append('document', absenceForm.document);
                const res = await axios.post('/api/attendances/upload-document', formData);
                documentPath = res.data.path;
            }

            setAttendanceData((prev: any) => ({
                ...prev,
                [currentAbsenceStudent.id]: {
                    ...prev[currentAbsenceStudent.id],
                    notes: absenceForm.notes,
                    end_date: absenceForm.end_date,
                    document_path: documentPath,
                }
            }));
            
            setAbsenceModalOpen(false);
            setCurrentAbsenceStudent(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal mengunggah dokumen');
        } finally {
            setUploadingAbsence(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Save Attendances for daily, weekly, and level_exam
            if (gradeType === 'daily' || gradeType === 'weekly' || gradeType === 'level_exam') {
                const payloadAttendances = enrollments
                    .filter(e => attendanceData[e.id]?.status)
                    .map(e => ({
                        enrollment_id: e.id,
                        status: attendanceData[e.id].status,
                        notes: attendanceData[e.id].notes,
                        document_path: attendanceData[e.id].document_path,
                        end_date: attendanceData[e.id].end_date,
                    }));

                if (payloadAttendances.length > 0) {
                    await axios.post('/api/attendances/class-bulk', {
                        study_class_id: classId,
                        date: (gradeType === 'daily' || gradeType === 'weekly') ? date : new Date().toISOString().split('T')[0],
                        attendances: payloadAttendances
                    });
                }
            }

            // 2. Save Grades
            const payloadGrades = enrollments
                .filter(e => {
                    const data = gradesData[e.id];
                    if (!data) return false;
                    
                    if (gradeType === 'daily') {
                        return data.components && Object.keys(data.components).length > 0;
                    } else {
                        return data.score !== undefined && data.score !== '';
                    }
                })
                .map(e => ({
                    enrollment_id: e.id,
                    score: gradesData[e.id].score,
                    components: gradesData[e.id].components,
                    is_passed: gradesData[e.id].is_passed,
                }));

            if (payloadGrades.length > 0) {
                await axios.post('/api/grades-bulk', {
                    study_class_id: classId,
                    type: gradeType,
                    date: isDailyOrWeeklyTypeClass ? date : undefined,
                    chapter: (isShoChuKou && gradeType === 'daily') ? chapter : undefined,
                    remarks: isDailyOrWeeklyTypeClass ? remarks : undefined,
                    grades: payloadGrades
                });
            }
            
            toast.success('Data berhasil disimpan!');
            fetchGrades();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan data');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Apakah Anda yakin ingin menghapus seluruh nilai pada tanggal ini? Data yang terhapus tidak dapat dikembalikan.')) return;
        setSaving(true);
        try {
            await axios.post('/api/grades-bulk-delete', {
                study_class_id: classId,
                type: gradeType,
                date: (isDailyOrWeeklyTypeClass && (gradeType === 'daily' || gradeType === 'weekly')) ? date : undefined,
            });
            toast.success('Semua nilai pada tanggal tersebut berhasil dihapus!');
            setGradesData({});
            fetchGrades();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus nilai');
        } finally {
            setSaving(false);
        }
    };

    if (loading && !studyClass) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Memuat data...</div>;
    if (!studyClass) return <div className="p-8 text-center text-red-500">Kelas tidak ditemukan.</div>;

    const classType = studyClass.class_type;

    let columns: { key: string, label: string }[] = [];
    if (gradeType === 'daily') {
        if (['shou', 'chuu', 'kou'].includes(classType)) {
            columns = [
                { key: 'kotoba', label: 'Kotoba (20%)' },
                { key: 'kanji', label: 'Kanji (20%)' },
                { key: 'bunpou', label: 'Bunpou (15%)' },
                { key: 'choukai', label: 'Choukai (15%)' },
                { key: 'kaiwa', label: 'Kaiwa (15%)' },
                { key: 'sikap', label: 'Sikap (10%)' },
            ];
        } else if (classType === 'jft') {
            columns = [
                { key: 'kotoba', label: 'Kotoba (15%)' },
                { key: 'kanji', label: 'Kanji (20%)' },
                { key: 'bunpou', label: 'Bunpou (20%)' },
                { key: 'choukai', label: 'Choukai (15%)' },
                { key: 'kaiwa', label: 'Kaiwa (15%)' },
                { key: 'sikap', label: 'Sikap (10%)' },
            ];
        } else if (classType === 'kaiwa') {
            columns = [
                { key: 'jikoshoukai', label: 'Jikoshoukai (10%)' },
                { key: 'sakubun', label: 'Sakubun (30%)' },
                { key: 'kaiwa', label: 'Kaiwa (40%)' },
                { key: 'sikap', label: 'Sikap (10%)' },
            ];
        }
    }

    const calculateTotalScore = (components: any) => {
        if (!components) return '-';
        let score = 0;
        if (['shou', 'chuu', 'kou'].includes(classType)) {
            // Assuming kehadiran is 100 for live preview if not passed
            score += ((components.kehadiran !== undefined ? Number(components.kehadiran) : 100) || 0) * 0.05;
            score += (Number(components.kotoba) || 0) * 0.20;
            score += (Number(components.kanji) || 0) * 0.20;
            score += (Number(components.bunpou) || 0) * 0.15;
            score += (Number(components.choukai) || 0) * 0.15;
            score += (Number(components.kaiwa) || 0) * 0.15;
            score += (Number(components.sikap) || 0) * 0.10;
        } else if (classType === 'jft') {
            score += ((components.kehadiran !== undefined ? Number(components.kehadiran) : 100) || 0) * 0.05;
            score += (Number(components.kotoba) || 0) * 0.15;
            score += (Number(components.kanji) || 0) * 0.20;
            score += (Number(components.bunpou) || 0) * 0.20;
            score += (Number(components.choukai) || 0) * 0.15;
            score += (Number(components.kaiwa) || 0) * 0.15;
            score += (Number(components.sikap) || 0) * 0.10;
        } else if (classType === 'kaiwa') {
            score += ((components.kehadiran !== undefined ? Number(components.kehadiran) : 100) || 0) * 0.10;
            score += (Number(components.jikoshoukai) || 0) * 0.10;
            score += (Number(components.sakubun) || 0) * 0.30;
            score += (Number(components.kaiwa) || 0) * 0.40;
            score += (Number(components.sikap) || 0) * 0.10;
        }
        return Math.round(score * 100) / 100;
    };

    const generateChapterOptions = () => {
        let start = 1; let end = 17;
        if (classType === 'chuu') { start = 18; end = 34; }
        if (classType === 'kou') { start = 35; end = 50; }
        const opts = [];
        for (let i = start; i <= end; i++) {
            opts.push(<SelectItem key={i} value={i.toString()}>Bab {i}</SelectItem>);
        }
        return opts;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/classes')}><ArrowLeft className="w-5 h-5" /></Button>
                <div>
                    <h1 className="text-2xl font-bold">Absensi & Nilai: {studyClass.name}</h1>
                    <p className="text-gray-500 dark:text-gray-400">Jenis: <span className="uppercase font-semibold">{studyClass.class_type}</span> | Batch: {studyClass.batch?.name}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#151a23] p-4 rounded-xl border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="grid gap-2">
                        <Label>Tipe Penilaian</Label>
                        <Select value={gradeType} onValueChange={(value) => { setGradeType(value ?? 'daily'); setGradesData({}); }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Penilaian Harian</SelectItem>
                                {isShoChuKou && (
                                    <>
                                        <SelectItem value="level_exam">Ujian Tingkatan</SelectItem>
                                    </>
                                )}
                                {isDailyOrWeeklyTypeClass && (
                                    <SelectItem value="weekly">Evaluasi Mingguan</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {isDailyOrWeeklyTypeClass && (gradeType === 'daily' || gradeType === 'weekly') && (
                        <div className="grid gap-2">
                            <Label>Tanggal Penilaian</Label>
                            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setGradesData({}); }} />
                        </div>
                    )}

                    {isShoChuKou && gradeType === 'daily' && (
                        <div className="grid gap-2">
                            <Label>Bab</Label>
                            <Select value={chapter} onValueChange={(value) => { setChapter(value ?? '1'); setGradesData({}); }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {generateChapterOptions()}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {isDailyOrWeeklyTypeClass && (gradeType === 'daily' || gradeType === 'weekly') && (
                        <div className="grid gap-2">
                            <Label>Deskripsi</Label>
                            <Input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                        </div>
                    )}

                    <div className="md:col-span-4 flex justify-end mt-4 md:mt-0 gap-2">
                        {Object.keys(gradesData).length > 0 && (
                            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="gap-2">
                                <Trash2 className="w-4 h-4" />
                                {saving ? 'Memproses...' : 'Hapus Nilai Tanggal Ini'}
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            <Save className="w-4 h-4" />
                            {saving ? 'Menyimpan...' : 'Simpan Semua Nilai'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="border rounded-xl bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="text-xs">
                            <TableHead className="sticky left-0 bg-gray-50 dark:bg-[#1a202c] z-10 min-w-[160px] max-w-[200px]">Nama Siswa</TableHead>
                            <TableHead className="min-w-[130px]">Absensi</TableHead>

                            {gradeType === 'daily' && columns.map(c => (
                                <TableHead key={c.key} className="min-w-[90px] text-center">{c.label}</TableHead>
                            ))}

                            {(gradeType === 'weekly' || gradeType === 'level_exam') && (
                                <TableHead className="min-w-[100px]">Nilai (0-100)</TableHead>
                            )}

                            {gradeType === 'level_exam' && (
                                <TableHead className="min-w-[130px]">Status Lulus</TableHead>
                            )}
                            
                            {gradeType === 'daily' && (
                                <TableHead className="min-w-[80px] text-right">Total</TableHead>
                            )}

                            <TableHead className="min-w-[80px] text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {enrollments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    Belum ada siswa di batch ini.
                                </TableCell>
                            </TableRow>
                        ) : enrollments.map((e) => {
                            const attStatus = attendanceData[e.id]?.status;
                            const isAbsent = attStatus && attStatus !== 'Hadir';
                            const absenceBadgeColor = attStatus === 'Sakit'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                                : attStatus === 'Izin'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
                            return (
                            <TableRow key={e.id} className={`align-top ${isAbsent ? 'bg-gray-50/50 dark:bg-gray-800/20' : ''}`}>
                                <TableCell className="sticky left-0 bg-white dark:bg-[#151a23] z-10 font-medium align-top pt-3">
                                    <div className="max-w-[190px]">
                                        <p className="truncate text-sm leading-tight">{e.student?.user?.name || '-'}</p>
                                        {isAbsent && attendanceData[e.id]?.notes && (
                                            <p className="text-xs text-gray-400 truncate mt-0.5" title={attendanceData[e.id]?.notes}>
                                                {attendanceData[e.id]?.notes}
                                            </p>
                                        )}
                                    </div>
                                </TableCell>

                                <TableCell className="align-top pt-2">
                                    <Select 
                                        value={attStatus || ''} 
                                        onValueChange={(val) => handleAttendanceChange(e.id, val)}
                                    >
                                        <SelectTrigger className="w-[110px] h-8 text-xs">
                                            <SelectValue placeholder="— Pilih —" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Hadir">Hadir</SelectItem>
                                            <SelectItem value="Sakit">Sakit</SelectItem>
                                            <SelectItem value="Izin">Izin</SelectItem>
                                            <SelectItem value="Alpa">Alpa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {isAbsent && (
                                        <div className="mt-1.5 flex flex-col gap-1">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${absenceBadgeColor}`}>
                                                {attStatus}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openAbsenceModal(e.id)}
                                                className="h-5 text-[10px] px-1 py-0 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 justify-start"
                                            >
                                                <Edit2 className="w-2.5 h-2.5 mr-1" />
                                                Edit Keterangan
                                            </Button>
                                            {attendanceData[e.id]?.document_path && (
                                                <a
                                                    href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/storage/${attendanceData[e.id].document_path}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                                                >
                                                    <Eye className="w-2.5 h-2.5" />
                                                    Lihat Surat
                                                </a>
                                            )}
                                            {attendanceData[e.id]?.end_date && (
                                                <span className="text-[10px] text-gray-400">
                                                    s/d {attendanceData[e.id].end_date}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </TableCell>
                                
                                {gradeType === 'daily' && columns.map(c => (
                                    <TableCell key={c.key} className="align-top pt-2 text-center">
                                        {isAbsent ? (
                                            <span className="text-xs text-gray-400">—</span>
                                        ) : (
                                            <Input 
                                                type="number" 
                                                min="0" max="100" 
                                                className="w-16 h-8 text-sm text-center px-1"
                                                value={gradesData[e.id]?.components?.[c.key] ?? ''}
                                                onChange={(ev) => handleComponentChange(e.id, c.key, ev.target.value)}
                                            />
                                        )}
                                    </TableCell>
                                ))}

                                {(gradeType === 'weekly' || gradeType === 'level_exam') && (
                                    <TableCell className="align-top pt-2">
                                        {isAbsent ? (
                                            <span className="text-xs text-gray-400">—</span>
                                        ) : (
                                            <Input 
                                                type="number" 
                                                min="0" max="100" 
                                                className="w-20 h-8 text-sm"
                                                value={gradesData[e.id]?.score ?? ''}
                                                onChange={(ev) => handleScoreChange(e.id, ev.target.value)}
                                            />
                                        )}
                                    </TableCell>
                                )}

                                {gradeType === 'level_exam' && (
                                    <TableCell className="align-top pt-2">
                                        {isAbsent ? (
                                            <span className="text-xs text-gray-400">—</span>
                                        ) : (
                                            <Select 
                                                value={gradesData[e.id]?.is_passed === true ? '1' : gradesData[e.id]?.is_passed === false ? '0' : ''} 
                                                onValueChange={(val) => handleIsPassedChange(e.id, val)}
                                            >
                                                <SelectTrigger className="w-[110px] h-8 text-xs">
                                                    <SelectValue placeholder="— Pilih —" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">Lulus</SelectItem>
                                                    <SelectItem value="0">Tidak Lulus</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </TableCell>
                                )}

                                {gradeType === 'daily' && (
                                    <TableCell className="text-right align-top pt-3">
                                        {isAbsent ? (
                                            <span className="text-xs text-gray-400 font-medium">—</span>
                                        ) : (
                                            <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                                                {Object.keys(gradesData[e.id]?.components || {}).length > 0 
                                                    ? calculateTotalScore(gradesData[e.id]?.components) 
                                                    : (gradesData[e.id]?.score ?? '—')}
                                            </span>
                                        )}
                                    </TableCell>
                                )}

                                <TableCell className="text-right align-top pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => window.open(`/dashboard/classes/${classId}/raport/${e.id}`, '_blank')}
                                    >
                                        Raport
                                    </Button>
                                </TableCell>
                            </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={absenceModalOpen} onOpenChange={setAbsenceModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detail Ketidakhadiran - {currentAbsenceStudent?.student?.user?.name}</DialogTitle>
                        <DialogDescription>
                            Lengkapi keterangan ketidakhadiran siswa ini. Anda juga bisa mengatur rentang tanggal izin/sakit.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Keterangan / Alasan</Label>
                            <Textarea 
                                placeholder="Cth: Sakit demam berdarah..." 
                                value={absenceForm.notes} 
                                onChange={(e) => setAbsenceForm({ ...absenceForm, notes: e.target.value })} 
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Berlaku Sampai Tanggal (Opsional)</Label>
                            <Input 
                                type="date" 
                                min={date}
                                value={absenceForm.end_date} 
                                onChange={(e) => setAbsenceForm({ ...absenceForm, end_date: e.target.value })} 
                            />
                            <p className="text-xs text-gray-500">
                                Jika diisi, sistem akan otomatis mengatur status siswa menjadi <b>{currentAbsenceStudent && attendanceData[currentAbsenceStudent.id]?.status}</b> dengan keterangan yang sama untuk jadwal kelas berikutnya hingga tanggal ini.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label>Surat Izin / Bukti Sakit (File PDF, Opsional)</Label>
                            <Input 
                                type="file" 
                                accept="application/pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setAbsenceForm({ ...absenceForm, document: e.target.files[0] });
                                    }
                                }} 
                            />
                            {currentAbsenceStudent && attendanceData[currentAbsenceStudent.id]?.document_path && !absenceForm.document && (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <FileUp className="w-3 h-3" /> Dokumen sudah ada.
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAbsenceModalOpen(false)}>Batal</Button>
                        <Button onClick={handleAbsenceSave} disabled={uploadingAbsence}>
                            {uploadingAbsence ? 'Menyimpan...' : 'Simpan Keterangan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
