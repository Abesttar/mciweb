'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

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
    // attendanceData structure: { [enrollment_id]: string } (e.g., 'Hadir')

    const isShoChuKou = studyClass && ['shou', 'chuu', 'kou'].includes(studyClass.class_type);
    const isShoChuKouOrJft = studyClass && ['shou', 'chuu', 'kou', 'jft'].includes(studyClass.class_type);
    const isDailyOrWeeklyTypeClass = studyClass && ['shou', 'chuu', 'kou', 'jft', 'kaiwa'].includes(studyClass.class_type);

    const fetchClassAndStudents = useCallback(async () => {
        setLoading(true);
        try {
            const classRes = await axios.get(`/api/study-classes/${classId}`);
            setStudyClass(classRes.data);

            const enrollmentsRes = await axios.get('/api/enrollments', { params: { batch_id: classRes.data.batch_id, per_page: 500 } });
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

            // Fetch Attendances if it's daily
            if (gradeType === 'daily') {
                const attParams = { study_class_id: classId, date, per_page: 500 };
                const attRes = await axios.get('/api/attendances', { params: attParams });
                const attExisting = attRes.data.data.reduce((acc: any, att: any) => {
                    acc[att.enrollment_id] = att.status;
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
            [enrollmentId]: value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Save Attendances if daily
            if (gradeType === 'daily') {
                const payloadAttendances = enrollments
                    .filter(e => attendanceData[e.id])
                    .map(e => ({
                        enrollment_id: e.id,
                        status: attendanceData[e.id]
                    }));

                if (payloadAttendances.length > 0) {
                    await axios.post('/api/attendances/class-bulk', {
                        study_class_id: classId,
                        date: date,
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

    if (loading && !studyClass) return <div className="p-8 text-center text-gray-500">Memuat data...</div>;
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
                    <p className="text-gray-500">Jenis: <span className="uppercase font-semibold">{studyClass.class_type}</span> | Batch: {studyClass.batch?.name}</p>
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
                <Table className="min-w-max">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 bg-gray-50 dark:bg-[#1a202c] z-10 w-48">Nama Siswa</TableHead>
                            
                            {gradeType === 'daily' && (
                                <TableHead className="w-32">Absensi</TableHead>
                            )}

                            {/* Daily logic components */}
                            {gradeType === 'daily' && columns.map(c => (
                                <TableHead key={c.key} className="w-32">{c.label}</TableHead>
                            ))}

                            {/* Weekly or Level Exam logic */}
                            {(gradeType === 'weekly' || gradeType === 'level_exam') && (
                                <TableHead className="w-48">Nilai (1-100)</TableHead>
                            )}

                            {gradeType === 'level_exam' && (
                                <TableHead className="w-48">Keterangan Lulus</TableHead>
                            )}
                            
                            {gradeType === 'daily' && (
                                <TableHead className="w-24 text-right">Total Index</TableHead>
                            )}

                            <TableHead className="w-24 text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {enrollments.length === 0 ? (
                            <TableRow><TableCell colSpan={10} className="text-center py-8 text-gray-500">Belum ada siswa di batch ini.</TableCell></TableRow>
                        ) : enrollments.map((e) => (
                            <TableRow key={e.id}>
                                <TableCell className="sticky left-0 bg-white dark:bg-[#151a23] z-10 font-medium whitespace-nowrap">
                                    {e.student?.user?.name || '-'}
                                </TableCell>

                                {gradeType === 'daily' && (
                                    <TableCell>
                                        <Select 
                                            value={attendanceData[e.id] || ''} 
                                            onValueChange={(val) => handleAttendanceChange(e.id, val)}
                                        >
                                            <SelectTrigger className="w-28 h-9"><SelectValue placeholder="-" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Hadir">Hadir</SelectItem>
                                                <SelectItem value="Sakit">Sakit</SelectItem>
                                                <SelectItem value="Izin">Izin</SelectItem>
                                                <SelectItem value="Alpa">Alpa</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                )}
                                
                                {gradeType === 'daily' && columns.map(c => (
                                    <TableCell key={c.key}>
                                        <Input 
                                            type="number" 
                                            min="0" max="100" 
                                            className="w-24 h-9"
                                            value={gradesData[e.id]?.components?.[c.key] ?? ''}
                                            onChange={(ev) => handleComponentChange(e.id, c.key, ev.target.value)}
                                        />
                                    </TableCell>
                                ))}

                                {(gradeType === 'weekly' || gradeType === 'level_exam') && (
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            min="0" max="100" 
                                            className="w-32"
                                            value={gradesData[e.id]?.score ?? ''}
                                            onChange={(ev) => handleScoreChange(e.id, ev.target.value)}
                                        />
                                    </TableCell>
                                )}

                                {gradeType === 'level_exam' && (
                                    <TableCell>
                                        <Select 
                                            value={gradesData[e.id]?.is_passed === true ? '1' : gradesData[e.id]?.is_passed === false ? '0' : ''} 
                                            onValueChange={(val) => handleIsPassedChange(e.id, val)}
                                        >
                                            <SelectTrigger className="w-32"><SelectValue placeholder="-" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Lulus</SelectItem>
                                                <SelectItem value="0">Tidak Lulus</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                )}

                                {gradeType === 'daily' && (
                                    <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                                        {Object.keys(gradesData[e.id]?.components || {}).length > 0 
                                            ? calculateTotalScore(gradesData[e.id]?.components) 
                                            : (gradesData[e.id]?.score ?? '-')}
                                    </TableCell>
                                )}

                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => window.open(`/dashboard/classes/${classId}/raport/${e.id}`, '_blank')}>Raport</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
