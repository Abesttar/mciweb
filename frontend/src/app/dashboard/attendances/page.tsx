'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';

// ... interfaces and colors ...
interface Schedule {
    id: number;
    batch_id?: number | null;
    class_level?: string | null;
    schedule_month?: string | null;
    day_of_week: string;
    start_time: string;
    end_time: string;
    room: string | null;
    batch?: { id: number; name: string; class_level?: string };
    study_class?: {
        id: number;
        name: string;
        teacher?: { name: string };
        batch?: { id: number; name: string; class_level?: string };
    };
}

interface Enrollment {
    id: number;
    student?: { id: number; name?: string; user?: { name: string } };
    batch?: { id: number; name: string };
    status: string;
}

interface AttendanceEntry {
    enrollment_id: number;
    student_name: string;
    status: string;
    notes: string;
}

interface AttendanceRecord {
    id: number;
    enrollment_id: number;
    schedule_id: number;
    date: string;
    status: string;
    notes: string | null;
    enrollment?: { student?: { name?: string; user?: { name: string } }; batch?: { name: string } };
    schedule?: {
        batch?: { name: string; class_level?: string };
        class_level?: string | null;
        study_class?: { batch?: { name: string; class_level?: string } };
        day_of_week: string;
        start_time: string;
    };
}

const STATUS_COLORS: Record<string, string> = {
    Hadir: 'bg-green-100 text-green-800',
    Sakit: 'bg-yellow-100 text-yellow-800',
    Izin: 'bg-red-100 text-red-900',
    Alpa: 'bg-red-100 text-red-800',
};

const LEVEL_LABELS: Record<string, string> = {
    shou: 'Shou',
    chuu: 'Chuu',
    kou: 'Kou',
    jft: 'JFT',
    kelas_kaiwa: 'Kaiwa (percakapan)',
};

const getLevelLabel = (level?: string | null) => level ? (LEVEL_LABELS[level] || level) : '-';

export default function AttendancesPage() {
    const { hasRole } = useAuth();
    const { t } = useLanguage();
    const isStudent = hasRole('Siswa');
    const isSensei = hasRole('Sensei');
    const isAdmin = hasRole('Admin') || hasRole('Sachou') || hasRole('Staff Akademik') || hasRole('Super Admin');
    
    // Tab state: 'calendar', 'input', 'history'
    const [view, setView] = useState<'calendar' | 'input' | 'history'>(isSensei ? 'calendar' : 'history');

    // --- Calendar State ---
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // --- Bulk Input State ---
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [selectedScheduleId, setSelectedScheduleId] = useState('');
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [entries, setEntries] = useState<AttendanceEntry[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // --- History State ---
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [filterDate, setFilterDate] = useState('');
    const [filterScheduleId, setFilterScheduleId] = useState('');
    const [focusedStudentId, setFocusedStudentId] = useState('');

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

    // When schedule is selected, load enrollments for that class's batch
    const loadEnrollments = useCallback(async () => {
        if (!selectedScheduleId || !selectedDate) return;
        setLoadingEnrollments(true);
        setSuccessMessage('');
        try {
            const schedule = schedules.find(s => s.id === parseInt(selectedScheduleId));
            const batchId = schedule?.batch?.id || schedule?.study_class?.batch?.id;
            if (!batchId) {
                setEnrollments([]);
                setEntries([]);
                setLoadingEnrollments(false);
                return;
            }
            const res = await axios.get(`/api/enrollments?batch_id=${batchId}&status=active&limit=1000`);
            const enrollmentList: Enrollment[] = res.data.data || res.data;
            setEnrollments(enrollmentList);

            const dateString = format(selectedDate, 'yyyy-MM-dd');
            // Check if attendance already exists for this schedule+date
            const existingRes = await axios.get(`/api/attendances?schedule_id=${selectedScheduleId}&date=${dateString}`);
            const existing: AttendanceRecord[] = existingRes.data.data || existingRes.data;

            // Build entries with pre-filled data if available
            const newEntries = enrollmentList.map(e => {
                const found = existing.find(a => a.enrollment_id === e.id);
                return {
                    enrollment_id: e.id,
                    student_name: e.student?.user?.name || e.student?.name || `Siswa #${e.id}`,
                    status: found ? found.status : 'Hadir',
                    notes: found ? (found.notes || '') : '',
                };
            });
            setEntries(newEntries);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingEnrollments(false);
        }
    }, [selectedScheduleId, selectedDate, schedules]);

    useEffect(() => {
        if (selectedScheduleId && selectedDate && view === 'input') {
            loadEnrollments();
        }
    }, [selectedScheduleId, selectedDate, view, loadEnrollments]);

    const updateEntry = (index: number, field: 'status' | 'notes', value: string) => {
        setEntries(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleBulkSave = async () => {
        if (!selectedScheduleId || entries.length === 0 || !selectedDate) return;
        setSaving(true);
        setSuccessMessage('');
        try {
            await axios.post('/api/attendances-bulk', {
                schedule_id: parseInt(selectedScheduleId),
                date: format(selectedDate, 'yyyy-MM-dd'),
                attendances: entries.map(e => ({
                    enrollment_id: e.enrollment_id,
                    status: e.status,
                    notes: e.notes || null,
                })),
            });
            setSuccessMessage(`Absensi berhasil disimpan untuk ${entries.length} siswa.`);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan absensi');
        } finally {
            setSaving(false);
        }
    };

    // --- History ---
    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const params: any = {};
            if (filterDate) params.date = filterDate;
            if (filterScheduleId && filterScheduleId !== 'all') params.schedule_id = filterScheduleId;
            if (focusedStudentId) params.student_id = focusedStudentId;
            const res = await axios.get('/api/attendances', { params });
            setAttendanceRecords(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingHistory(false);
        }
    }, [filterDate, filterScheduleId, focusedStudentId]);

    useEffect(() => {
        if (view === 'history') {
            fetchHistory();
        }
    }, [view, fetchHistory]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const studentId = params.get('student_id') || '';
        setFocusedStudentId(studentId);
        if (studentId || isStudent) {
            setView('history');
        }
    }, [isStudent]);

    const getScheduleLabel = (s: Schedule) => {
        const batch = s.batch || s.study_class?.batch;
        return `${batch?.name || 'Batch'} - ${getLevelLabel(s.class_level || batch?.class_level)} ${s.start_time?.substring(0, 5)}-${s.end_time?.substring(0, 5)}`;
    };

    // Calendar Helper
    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });
    
    // To pad the start of the calendar with empty spaces
    const firstDayOfMonth = startOfMonth(currentMonth).getDay(); // 0 is Sunday
    const paddingDays = Array.from({ length: firstDayOfMonth }).map((_, i) => i);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.attendanceTitle}</h1>
            </div>

            {/* View Navigation for Admin */}
            {!isStudent && isAdmin && (
                <div className="flex gap-2">
                    <Button variant={view === 'calendar' || view === 'input' ? 'default' : 'outline'} onClick={() => { setView('calendar'); setSelectedDate(null); }}>
                        {t.attendanceCalendar}
                    </Button>
                    <Button variant={view === 'history' ? 'default' : 'outline'} onClick={() => setView('history')}>
                        {t.attendanceHistory2}
                    </Button>
                </div>
            )}

            {/* 1. Calendar View */}
            {view === 'calendar' && (
                <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                            <CalendarIcon className="w-6 h-6 mr-2 text-red-700 dark:text-red-400" />
                            {t.selectDate}
                        </h2>
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="font-semibold text-lg w-40 text-center">
                                {format(currentMonth, 'MMMM yyyy', { locale: id })}
                            </span>
                            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-4 mb-4">
                        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                            <div key={day} className="text-center font-bold text-gray-400 text-sm">{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-4">
                        {paddingDays.map(p => (
                            <div key={`empty-${p}`} className="h-24 rounded-xl border border-transparent"></div>
                        ))}
                        {daysInMonth.map(date => {
                            const today = isToday(date);
                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => {
                                        setSelectedDate(date);
                                        setView('input');
                                    }}
                                    className={`h-24 flex flex-col items-center justify-center rounded-xl border transition-all hover:border-red-300 hover:shadow-md hover:-translate-y-1 ${today ? 'bg-red-50 border-red-200' : 'bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border-gray-100 dark:border-gray-700/50'}`}
                                >
                                    <span className={`text-xl font-bold ${today ? 'text-red-800' : 'text-gray-700 dark:text-gray-300'}`}>{format(date, 'd')}</span>
                                    {today && <span className="text-xs font-semibold text-red-600 mt-1">{t.today}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 2. Input View */}
            {view === 'input' && selectedDate && (
                <div className="space-y-6">
                    <div className="bg-red-50 dark:bg-red-950/40 p-6 rounded-2xl border border-red-100 dark:border-red-900/50 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-red-900 dark:text-red-100 mb-1">{t.inputAttendance}</h2>
                            <p className="text-red-800 dark:text-red-200 font-medium">{t.attendanceDate} {format(selectedDate, 'dd MMMM yyyy', { locale: id })}</p>
                        </div>
                        <Button variant="outline" onClick={() => setView('calendar')} className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl hover:bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/50">
                            <ArrowLeft className="w-4 h-4 mr-2" /> {t.backToCalendar}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 p-5 border border-gray-100 dark:border-gray-700/50 rounded-xl bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl shadow-sm">
                        <div className="grid gap-2">
                            <Label className="text-gray-700 dark:text-gray-300 font-semibold">{t.selectSchedule}</Label>
                            <Select value={selectedScheduleId} onValueChange={(v) => setSelectedScheduleId(v ?? '')}>
                                <SelectTrigger className="border-gray-200 dark:border-gray-600/50 focus:ring-red-600">
                                    <SelectValue placeholder={t.selectSchedulePlaceholder}>
                                        {selectedScheduleId && schedules.some(s => s.id.toString() === selectedScheduleId)
                                            ? getScheduleLabel(schedules.find(s => s.id.toString() === selectedScheduleId)!)
                                            : undefined}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {schedules.filter(s => {
                                        const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                                        const selectedDayName = selectedDate ? daysOfWeek[selectedDate.getDay()] : '';
                                        return s.day_of_week === selectedDayName || s.day_of_week === 'Bulanan';
                                    }).map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {getScheduleLabel(s)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {successMessage && (
                        <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-medium border border-green-200">{successMessage}</div>
                    )}

                    {/* Attendance Checklist */}
                    {loadingEnrollments ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-xl border border-gray-100 dark:border-gray-700/50">Memuat data siswa...</div>
                    ) : entries.length > 0 ? (
                        <div className="border border-gray-100 dark:border-gray-700/50 rounded-xl bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                                    <TableRow>
                                        <TableHead className="w-12 font-bold text-gray-600 dark:text-gray-400">#</TableHead>
                                        <TableHead className="font-bold text-gray-600 dark:text-gray-400">{t.studentName}</TableHead>
                                        <TableHead className="w-40 font-bold text-gray-600 dark:text-gray-400">{t.status}</TableHead>
                                        <TableHead className="font-bold text-gray-600 dark:text-gray-400">{t.notes}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entries.map((entry, idx) => (
                                        <TableRow key={entry.enrollment_id} className="hover:bg-gray-50/50 dark:bg-gray-800/50">
                                            <TableCell className="text-gray-500 dark:text-gray-400">{idx + 1}</TableCell>
                                            <TableCell className="font-semibold text-gray-900 dark:text-white">{entry.student_name}</TableCell>
                                            <TableCell>
                                                <Select value={entry.status} onValueChange={(v) => updateEntry(idx, 'status', v ?? 'Hadir')}>
                                                    <SelectTrigger className={`w-32 border-0 font-medium ${STATUS_COLORS[entry.status]?.split(' ')[0] || 'bg-gray-100 dark:bg-gray-800'}`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Hadir">✅ Hadir</SelectItem>
                                                        <SelectItem value="Sakit">🤒 Sakit</SelectItem>
                                                        <SelectItem value="Izin">📋 Izin</SelectItem>
                                                        <SelectItem value="Alpa">❌ Alpa</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={entry.notes}
                                                    onChange={(e) => updateEntry(idx, 'notes', e.target.value)}
                                                    placeholder="Tambahkan catatan (opsional)..."
                                                    className="max-w-xs border-gray-200 dark:border-gray-600/50 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl focus:bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl transition-colors"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="p-5 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl flex justify-end">
                                <Button onClick={handleBulkSave} disabled={saving} className="bg-red-700 hover:bg-red-800 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm">
                                    {saving ? t.saving : `${t.saveAttendance} (${entries.length})`}
                                </Button>
                            </div>
                        </div>
                    ) : selectedScheduleId ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700/50 rounded-xl bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                            {t.noStudentsInClass}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400 border border-gray-100 dark:border-gray-700/50 rounded-xl bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border-dashed">
                            Silakan pilih jadwal kelas terlebih dahulu untuk mengisi absensi pada {format(selectedDate, 'dd MMMM yyyy', { locale: id })}.
                        </div>
                    )}
                </div>
            )}

            {/* 3. History View */}
            {view === 'history' && (
                <div className="space-y-6">
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
                                {loadingHistory ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">{t.loading}</TableCell>
                                    </TableRow>
                                ) : attendanceRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">{t.noAttendanceData}</TableCell>
                                    </TableRow>
                                ) : (
                                    attendanceRecords.map((record) => (
                                        <TableRow key={record.id} className="hover:bg-gray-50/50 dark:bg-gray-800/50">
                                            <TableCell className="font-medium text-gray-900 dark:text-white">{format(new Date(record.date), 'dd MMM yyyy', { locale: id })}</TableCell>
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
                </div>
            )}
        </div>
    );
}
