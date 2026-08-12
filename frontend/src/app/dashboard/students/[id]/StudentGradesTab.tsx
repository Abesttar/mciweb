import React, { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BookOpen, FileText, ChevronDown, ChevronRight, History, Archive } from 'lucide-react';

interface GradeData {
    id: number;
    enrollment_id: number;
    study_class_id: number;
    score: number;
    type: string;
    date: string | null;
    chapter: string | null;
    components: Record<string, number> | null;
    is_passed: boolean | null;
    grade_letter: string | null;
    remarks: string | null;
    enrollment?: {
        id: number;
        batch?: { name: string; class_level?: string };
        study_class?: { name: string };
    };
    study_class?: { id: number; name: string; class_type: string };
}

interface SnapshotGrade {
    id: number;
    type: string;
    date: string | null;
    chapter: string | null;
    score: number | null;
    grade_letter: string | null;
    components: Record<string, number> | null;
    is_passed: boolean | null;
    remarks: string | null;
    study_class?: { id: number; name: string; class_type: string } | null;
}

interface RaportSnapshot {
    id: number;
    class_level: string;
    class_name: string;
    snapshot_reason: 'class_level_change' | 'batch_transfer';
    grades_snapshot: SnapshotGrade[];
    attendance_summary: { total: number; hadir: number; izin: number; sakit: number; alpha: number } | null;
    snapshotted_at: string;
    snapshotted_by: string | null;
    batch_name: string | null;
}

function getScoreColor(score: number | null): string {
    if (score === null) return 'text-gray-400';
    if (score >= 85) return 'text-green-700 font-bold';
    if (score >= 70) return 'text-yellow-700 font-semibold';
    if (score >= 55) return 'text-orange-700';
    return 'text-red-600 font-semibold';
}

const CLASS_LEVEL_LABELS: Record<string, string> = {
    shou: 'Shou (初級)',
    chuu: 'Chuu (中級)',
    kou: 'Kou (高級)',
    jft: 'JFT',
    kelas_kaiwa: 'Kelas Kaiwa',
};

export default function StudentGradesTab({ studentId, enrollments }: { studentId: string, enrollments: any[] }) {
    const { hasRole } = useAuth();
    const [grades, setGrades] = useState<GradeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set());

    // Raport history (snapshots)
    const [snapshots, setSnapshots] = useState<RaportSnapshot[]>([]);
    const [snapshotsLoading, setSnapshotsLoading] = useState(true);
    const [expandedSnapshots, setExpandedSnapshots] = useState<Set<number>>(new Set());

    const fetchGrades = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/grades', { params: { student_id: studentId, per_page: 500 } });
            setGrades(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    const fetchSnapshots = useCallback(async () => {
        setSnapshotsLoading(true);
        try {
            const res = await axios.get(`/api/students/${studentId}/raport-snapshots`);
            setSnapshots(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSnapshotsLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        fetchGrades();
        fetchSnapshots();
    }, [fetchGrades, fetchSnapshots]);

    const formatType = (type: string) => {
        if (type === 'daily') return 'Penilaian Harian';
        if (type === 'weekly') return 'Evaluasi Mingguan';
        if (type === 'level_exam') return 'Ujian Tingkatan';
        return type;
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatDatetime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Group current grades by study_class_id
    const groupedByClass: Record<number, { className: string; classType: string; grades: GradeData[]; enrollmentId: number }> = {};
    grades.forEach(g => {
        const key = g.study_class_id;
        if (!groupedByClass[key]) {
            groupedByClass[key] = {
                className: g.study_class?.name || g.enrollment?.study_class?.name || g.enrollment?.batch?.name || '-',
                classType: g.study_class?.class_type || '',
                grades: [],
                enrollmentId: g.enrollment_id,
            };
        }
        groupedByClass[key].grades.push(g);
    });

    const toggleClass = (classId: number) => {
        setExpandedClasses(prev => {
            const next = new Set(prev);
            if (next.has(classId)) next.delete(classId);
            else next.add(classId);
            return next;
        });
    };

    const toggleSnapshot = (snapId: number) => {
        setExpandedSnapshots(prev => {
            const next = new Set(prev);
            if (next.has(snapId)) next.delete(snapId);
            else next.add(snapId);
            return next;
        });
    };

    const getClassHeaderColor = (classType: string) => {
        if (['shou', 'chuu', 'kou'].includes(classType)) return "bg-red-50/80 hover:bg-red-100/80 dark:bg-red-950/40 dark:hover:bg-red-900/40 border-l-4 border-l-red-500";
        if (['jft', 'jlpt'].includes(classType)) return "bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 border-l-4 border-l-blue-500";
        if (['kelas_kaiwa', 'kaiwa'].includes(classType)) return "bg-yellow-50/80 hover:bg-yellow-100/80 dark:bg-yellow-950/40 dark:hover:bg-yellow-900/40 border-l-4 border-l-yellow-500";
        return "bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-100/80 dark:hover:bg-gray-700/50";
    };

    const getSnapshotHeaderColor = (classLevel: string) => {
        if (['shou', 'chuu', 'kou'].includes(classLevel)) return "border-l-4 border-l-red-300 bg-red-50/50 dark:bg-red-950/20";
        if (classLevel === 'jft') return "border-l-4 border-l-blue-300 bg-blue-50/50 dark:bg-blue-950/20";
        if (classLevel === 'kelas_kaiwa') return "border-l-4 border-l-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20";
        return "border-l-4 border-l-gray-300 bg-gray-50/50 dark:bg-gray-800/30";
    };

    const reasonLabel = (reason: string) => {
        if (reason === 'class_level_change') return { label: 'Naik Kelas', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
        if (reason === 'batch_transfer') return { label: 'Pindah Batch', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
        return { label: reason, color: 'bg-gray-100 text-gray-700 dark:text-gray-300' };
    };

    return (
        <div className="space-y-6 mt-6">
            {/* ── RAPORT AKTIF ────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-red-700 dark:text-red-400" />
                        Riwayat Penilaian &amp; Raport
                    </h3>
                </div>

                {enrollments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 border rounded-xl border-dashed">
                        Siswa belum didaftarkan ke kelas manapun.
                    </div>
                ) : loading ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat data...</div>
                ) : Object.keys(groupedByClass).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 border rounded-xl border-dashed">
                        Belum ada data nilai.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(groupedByClass).map(([classIdStr, group]) => {
                            const classId = Number(classIdStr);
                            const isShoChuKou = ['shou', 'chuu', 'kou'].includes(group.classType);
                            const isExpanded = expandedClasses.has(classId);
                            const examGrade = group.grades.find(g => g.type === 'level_exam');
                            const dailyCount = group.grades.filter(g => g.type === 'daily').length;
                            const weeklyCount = group.grades.filter(g => g.type === 'weekly').length;

                            return (
                                <div key={classId} className="border border-gray-100 dark:border-gray-700/50 rounded-xl overflow-hidden mb-4">
                                    <div
                                        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${getClassHeaderColor(group.classType)}`}
                                        onClick={() => toggleClass(classId)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{group.className}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {dailyCount} nilai harian · {weeklyCount} evaluasi mingguan
                                                    {examGrade && (
                                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${examGrade.is_passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            Ujian: {examGrade.score} ({examGrade.is_passed ? 'LULUS' : 'TIDAK LULUS'})
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 shrink-0"
                                            onClick={(e) => { e.stopPropagation(); window.open(`/dashboard/classes/${classId}/raport/${group.enrollmentId}`, '_blank'); }}
                                        >
                                            <FileText className="w-4 h-4" /> Lihat Raport
                                        </Button>
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-gray-100 dark:border-gray-700/50">
                                            {isShoChuKou ? (
                                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                                    <Table>
                                                        <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                                                            <TableRow>
                                                                <TableHead className="font-bold text-gray-600 dark:text-gray-400 w-10">No</TableHead>
                                                                <TableHead className="font-bold text-gray-600 dark:text-gray-400">Tanggal</TableHead>
                                                                <TableHead className="font-bold text-gray-600 dark:text-gray-400">Tipe</TableHead>
                                                                <TableHead className="font-bold text-gray-600 dark:text-gray-400">Bab</TableHead>
                                                                <TableHead className="font-bold text-gray-600 dark:text-gray-400">Deskripsi</TableHead>
                                                                <TableHead className="font-bold text-gray-600 dark:text-gray-400 text-right">Nilai</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {group.grades
                                                                .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                                                                .map((grade, idx) => (
                                                                <TableRow key={grade.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                                                                    <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                                                                    <TableCell className="text-sm">{formatDate(grade.date)}</TableCell>
                                                                    <TableCell>
                                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                                            grade.type === 'daily' ? 'bg-blue-100 text-blue-700' :
                                                                            grade.type === 'weekly' ? 'bg-amber-100 text-amber-700' :
                                                                            'bg-red-100 text-red-700'
                                                                        }`}>
                                                                            {formatType(grade.type)}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="font-medium">{grade.chapter || '-'}</TableCell>
                                                                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">{grade.remarks || '-'}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <span className={`text-lg ${getScoreColor(grade.score)}`}>
                                                                            {grade.score ?? '-'}
                                                                        </span>
                                                                        {grade.type === 'level_exam' && grade.is_passed !== null && (
                                                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${grade.is_passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                                {grade.is_passed ? 'LULUS' : 'TIDAK LULUS'}
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                                    <Table>
                                                        <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                                                            <TableRow>
                                                                <TableHead className="font-bold text-gray-600 dark:text-gray-400">Tipe Ujian</TableHead>
                                                                <TableHead className="font-bold text-gray-600 dark:text-gray-400">Nilai Akhir</TableHead>
                                                                <TableHead className="font-bold text-gray-600 dark:text-gray-400">Rincian</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {group.grades.map((grade) => (
                                                                <TableRow key={grade.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                                                                    <TableCell>{formatType(grade.type)}</TableCell>
                                                                    <TableCell>
                                                                        <div className={`text-lg ${getScoreColor(grade.score)}`}>
                                                                            {grade.score ?? '-'}
                                                                            {grade.grade_letter && ` (${grade.grade_letter})`}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                                                        {grade.components ? Object.entries(grade.components).map(([k, v]) => `${k}:${v}`).join(', ') : '-'}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── RIWAYAT RAPORT (SNAPSHOTS) ────────────────────────── */}
            {(snapshotsLoading || snapshots.length > 0) && (
                <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-2 mb-6">
                        <Archive className="w-5 h-5 text-amber-500" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Riwayat Raport</h3>
                        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">Raport yang telah diarsipkan otomatis</span>
                    </div>

                    {snapshotsLoading ? (
                        <div className="text-center py-6 text-gray-400">Memuat riwayat raport...</div>
                    ) : (
                        <div className="space-y-3">
                            {snapshots.map((snap) => {
                                const isExpanded = expandedSnapshots.has(snap.id);
                                const reason = reasonLabel(snap.snapshot_reason);
                                const isShoChuKou = ['shou', 'chuu', 'kou'].includes(snap.class_level);
                                const dailyCount = snap.grades_snapshot?.filter(g => g.type === 'daily').length ?? 0;
                                const weeklyCount = snap.grades_snapshot?.filter(g => g.type === 'weekly').length ?? 0;
                                const examGrade = snap.grades_snapshot?.find(g => g.type === 'level_exam');
                                const att = snap.attendance_summary;

                                return (
                                    <div key={snap.id} className={`border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden ${getSnapshotHeaderColor(snap.class_level)}`}>
                                        {/* Snapshot Header */}
                                        <div
                                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                            onClick={() => toggleSnapshot(snap.id)}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{snap.class_name}</p>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reason.color}`}>
                                                            {reason.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {CLASS_LEVEL_LABELS[snap.class_level] ?? snap.class_level} · Diarsipkan {formatDatetime(snap.snapshotted_at)}
                                                        {snap.snapshotted_by && ` oleh ${snap.snapshotted_by}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-4 text-xs text-gray-500 dark:text-gray-400">
                                                {att && (
                                                    <div className="hidden sm:flex items-center gap-2">
                                                        <span className="text-green-600 font-medium">{att.hadir}H</span>
                                                        <span className="text-yellow-600">{att.izin}I</span>
                                                        <span className="text-blue-600">{att.sakit}S</span>
                                                        <span className="text-red-600">{att.alpha}A</span>
                                                    </div>
                                                )}
                                                {examGrade && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${examGrade.is_passed ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>
                                                        {examGrade.is_passed ? 'LULUS' : 'TIDAK LULUS'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Snapshot Expanded Detail */}
                                        {isExpanded && snap.grades_snapshot && snap.grades_snapshot.length > 0 && (
                                            <div className="border-t border-gray-200 dark:border-gray-700/50">
                                                {/* Attendance summary */}
                                                {att && (
                                                    <div className="flex gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/30 text-xs flex-wrap">
                                                        <span className="text-gray-500 dark:text-gray-400 font-semibold">Kehadiran:</span>
                                                        <span className="text-green-600 font-medium">Hadir: {att.hadir}</span>
                                                        <span className="text-yellow-600">Izin: {att.izin}</span>
                                                        <span className="text-blue-600">Sakit: {att.sakit}</span>
                                                        <span className="text-red-600">Alpha: {att.alpha}</span>
                                                        <span className="text-gray-400">Total: {att.total}</span>
                                                    </div>
                                                )}
                                                <div className="px-1 pb-1 max-h-[350px] overflow-y-auto custom-scrollbar">
                                                    <Table>
                                                        <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                                                            <TableRow>
                                                                <TableHead className="font-bold text-gray-500 dark:text-gray-400 w-8">No</TableHead>
                                                                {isShoChuKou && <TableHead className="font-bold text-gray-500 dark:text-gray-400">Tanggal</TableHead>}
                                                                <TableHead className="font-bold text-gray-500 dark:text-gray-400">Tipe</TableHead>
                                                                {isShoChuKou && <TableHead className="font-bold text-gray-500 dark:text-gray-400">Bab</TableHead>}
                                                                <TableHead className="font-bold text-gray-500 dark:text-gray-400 text-right">Nilai</TableHead>
                                                                <TableHead className="font-bold text-gray-500 dark:text-gray-400">Status</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {snap.grades_snapshot
                                                                .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                                                                .map((g, idx) => (
                                                                <TableRow key={g.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 opacity-90">
                                                                    <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                                                                    {isShoChuKou && <TableCell className="text-xs text-gray-500 dark:text-gray-400">{formatDate(g.date)}</TableCell>}
                                                                    <TableCell>
                                                                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                                                            g.type === 'daily' ? 'bg-blue-100 text-blue-700' :
                                                                            g.type === 'weekly' ? 'bg-amber-100 text-amber-700' :
                                                                            'bg-red-100 text-red-700'
                                                                        }`}>
                                                                            {formatType(g.type)}
                                                                        </span>
                                                                    </TableCell>
                                                                    {isShoChuKou && <TableCell className="text-xs text-gray-500 dark:text-gray-400">{g.chapter || '-'}</TableCell>}
                                                                    <TableCell className="text-right">
                                                                        <span className={`font-bold ${getScoreColor(g.score)}`}>
                                                                            {g.score ?? '-'}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {g.is_passed !== null ? (
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${g.is_passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                                {g.is_passed ? 'LULUS' : 'TIDAK LULUS'}
                                                                            </span>
                                                                        ) : <span className="text-gray-400">-</span>}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )}

                                        {isExpanded && (!snap.grades_snapshot || snap.grades_snapshot.length === 0) && (
                                            <div className="text-center py-4 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700/50">
                                                Tidak ada data nilai yang tersimpan dalam snapshot ini.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
