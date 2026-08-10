'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Calendar, Search } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
    Hadir: 'bg-green-100 text-green-800',
    Sakit: 'bg-yellow-100 text-yellow-800',
    Izin: 'bg-red-100 text-red-900',
    Alpa: 'bg-red-100 text-red-800',
};

function getScoreColor(score: number): string {
    if (score >= 85) return 'text-green-700 font-bold dark:text-green-500'; // A
    if (score >= 70) return 'text-yellow-600 font-bold dark:text-yellow-500'; // B
    return 'text-red-600 font-bold dark:text-red-500'; // C & D
}

const LEVEL_LABELS: Record<string, string> = {
    shou: 'Shou',
    chuu: 'Chuu',
    kou: 'Kou',
    jft: 'JFT',
    kelas_kaiwa: 'Kaiwa (percakapan)',
};
const getLevelLabel = (level?: string | null) => level ? (LEVEL_LABELS[level] || level) : '-';

export default function SenseiHistoryPage() {
    const { hasRole } = useAuth();
    const { t } = useLanguage();
    
    const isSensei = hasRole('Sensei');

    // --- State: Attendances ---
    const [attendances, setAttendances] = useState<any[]>([]);
    const [loadingAttendances, setLoadingAttendances] = useState(false);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [filterScheduleId, setFilterScheduleId] = useState('');
    const [filterDate, setFilterDate] = useState('');

    // --- State: Grades ---
    const [grades, setGrades] = useState<any[]>([]);
    const [loadingGrades, setLoadingGrades] = useState(false);
    const [searchStudent, setSearchStudent] = useState('');
    const [filterDateGrades, setFilterDateGrades] = useState('');

    useEffect(() => {
        const fetchSchedules = async () => {
            try {
                const res = await axios.get('/api/schedules?limit=1000');
                setSchedules(res.data.data || res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchSchedules();
    }, []);

    const fetchAttendances = useCallback(async () => {
        setLoadingAttendances(true);
        try {
            const params: any = {};
            if (filterDate) params.date = filterDate;
            if (filterScheduleId && filterScheduleId !== 'all') params.schedule_id = filterScheduleId;
            // Optimally, backend limits by teacher_id automatically, or we fetch all if Sensei can see all
            const res = await axios.get('/api/attendances', { params });
            setAttendances(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingAttendances(false);
        }
    }, [filterDate, filterScheduleId]);

    const fetchGrades = useCallback(async () => {
        setLoadingGrades(true);
        try {
            const params: any = {};
            if (searchStudent) params.search = searchStudent;
            if (filterDateGrades) params.date = filterDateGrades;
            const res = await axios.get('/api/grades', { params });
            setGrades(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingGrades(false);
        }
    }, [searchStudent, filterDateGrades]);

    // Initial load for both
    useEffect(() => {
        fetchAttendances();
        fetchGrades();
    }, [fetchAttendances, fetchGrades]);

    // Auth Check
    if (!isSensei) {
        return <div className="p-8 text-center text-red-500">Akses ditolak. Halaman ini hanya untuk Sensei.</div>;
    }

    const getScheduleLabel = (s: any) => {
        const batch = s.batch || s.study_class?.batch;
        return `${batch?.name || 'Batch'} - ${getLevelLabel(s.class_level || batch?.class_level)} ${s.start_time?.substring(0, 5)}-${s.end_time?.substring(0, 5)}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Riwayat Mengajar</h1>
            </div>
            
            <p className="text-gray-500 dark:text-gray-400 -mt-4 mb-6">
                Lihat kembali seluruh data kehadiran dan nilai siswa yang pernah Anda berikan.
            </p>

            <Tabs defaultValue="absensi" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-1 md:grid-cols-2 mb-8 bg-red-100/50 dark:bg-red-950/20 p-1 rounded-xl">
                    <TabsTrigger value="absensi" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm">
                        <Calendar className="w-4 h-4 mr-2" /> Riwayat Absensi
                    </TabsTrigger>
                    <TabsTrigger value="grades" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm">
                        <BookOpen className="w-4 h-4 mr-2" /> Riwayat Nilai
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="absensi" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 border border-gray-100 dark:border-gray-700/50 rounded-xl bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl shadow-sm">
                        <div className="grid gap-2">
                            <Label className="text-gray-700 dark:text-gray-300 font-semibold">{t.filterSchedule}</Label>
                            <Select value={filterScheduleId} onValueChange={(v) => setFilterScheduleId(v ?? '')}>
                                <SelectTrigger className="border-gray-200 dark:border-gray-600/50"><SelectValue placeholder={t.allSchedules} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t.allSchedules}</SelectItem>
                                    {schedules.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {getScheduleLabel(s)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-gray-700 dark:text-gray-300 font-semibold">{t.filterDate}</Label>
                            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="border-gray-200 dark:border-gray-600/50" />
                        </div>
                    </div>

                    <div className="border border-gray-100 dark:border-gray-700/50 rounded-xl bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                                <TableRow>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">{t.date}</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">{t.studentName}</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">{t.classLevel2}</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">{t.status}</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">{t.notes}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingAttendances ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">{t.loading}</TableCell>
                                    </TableRow>
                                ) : attendances.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">{t.noAttendanceData}</TableCell>
                                    </TableRow>
                                ) : (
                                    attendances.map((record) => (
                                        <TableRow key={record.id} className="hover:bg-gray-50/50 dark:bg-gray-800/50">
                                            <TableCell className="font-medium text-gray-900 dark:text-white">{format(new Date(record.date), 'dd MMM yyyy', { locale: idLocale })}</TableCell>
                                            <TableCell className="font-medium text-gray-900 dark:text-white">{record.enrollment?.student?.user?.name || record.enrollment?.student?.name}</TableCell>
                                            <TableCell className="text-gray-600 dark:text-gray-400">{getLevelLabel(record.schedule?.class_level || record.schedule?.batch?.class_level || record.schedule?.study_class?.batch?.class_level)}</TableCell>
                                            <TableCell>
                                                <Badge className={`${STATUS_COLORS[record.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'} border-0 px-3 py-1 font-semibold`}>{record.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-500 dark:text-gray-400 text-sm">{record.notes || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="grades" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-5 border border-gray-100 dark:border-gray-700/50 rounded-xl bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl shadow-sm">
                        <div className="grid gap-2">
                            <Label className="text-gray-700 dark:text-gray-300 font-semibold">Cari Siswa</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <Input
                                    placeholder="Cari nama siswa..."
                                    value={searchStudent}
                                    onChange={(e) => setSearchStudent(e.target.value)}
                                    className="pl-10 border-gray-200 dark:border-gray-600/50"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-gray-700 dark:text-gray-300 font-semibold">Filter Tanggal</Label>
                            <Input type="date" value={filterDateGrades} onChange={(e) => setFilterDateGrades(e.target.value)} className="border-gray-200 dark:border-gray-600/50" />
                        </div>
                    </div>

                    <div className="border border-gray-100 dark:border-gray-700/50 rounded-xl bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                                <TableRow>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">Siswa</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">Angkatan</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">Tingkat Kelas</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">Tipe Ujian</TableHead>
                                    <TableHead className="text-center font-bold text-gray-600 dark:text-gray-400">Skor</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">Catatan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingGrades ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">Memuat data...</TableCell>
                                    </TableRow>
                                ) : grades.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">Belum ada data nilai</TableCell>
                                    </TableRow>
                                ) : (
                                    grades.map((grade) => (
                                        <TableRow key={grade.id} className="hover:bg-gray-50/50 dark:bg-gray-800/50">
                                            <TableCell className="font-medium text-gray-900 dark:text-white">{grade.enrollment?.student?.user?.name || grade.enrollment?.student?.name}</TableCell>
                                            <TableCell className="text-gray-600 dark:text-gray-400">{grade.enrollment?.batch?.name}</TableCell>
                                            <TableCell className="text-gray-600 dark:text-gray-400">{getLevelLabel(grade.studyClass?.class_type || grade.enrollment?.batch?.class_level)}</TableCell>
                                            <TableCell className="text-gray-600 dark:text-gray-400">
                                                <Badge variant="outline" className="font-medium bg-white dark:bg-gray-800 border-gray-200">
                                                    {grade.type === 'daily' ? 'Harian' : grade.type === 'weekly' ? 'Mingguan' : grade.type === 'level_exam' ? 'Kenaikan Kelas' : grade.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`text-center ${getScoreColor(grade.score)} text-lg`}>{grade.score}</TableCell>
                                            <TableCell className="text-gray-500 dark:text-gray-400 text-sm max-w-xs truncate">{grade.remarks || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
