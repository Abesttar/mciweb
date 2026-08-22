'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '@/lib/axios';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/context/LanguageContext';

export default function ClassRekapGradesPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id as string;
    const { t } = useLanguage();

    const [studyClass, setStudyClass] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Class Data
            const classRes = await axios.get(`/api/study-classes/${classId}`);
            setStudyClass(classRes.data);

            // 2. Fetch Enrollments
            const enrollParams = classRes.data.class_type === 'kaiwa'
                ? { class_level: 'kaiwa', status: 'active', per_page: 500 }
                : { batch_id: classRes.data.batch_id, status: 'active', per_page: 500 };
            
            const enrollmentsRes = await axios.get('/api/enrollments', { params: enrollParams });
            setEnrollments(enrollmentsRes.data.data || []);

            // 3. Fetch All Grades for this class
            const gradesRes = await axios.get('/api/grades', { 
                params: { study_class_id: classId, per_page: 1000 }
            });
            setGrades(gradesRes.data.data || []);

        } catch (err) {
            console.error('Error fetching rekap data:', err);
        } finally {
            setLoading(false);
        }
    }, [classId]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Process data into matrix
    const { columns, matrix } = useMemo(() => {
        if (!enrollments.length) return { columns: [], matrix: {} };

        // Determine unique columns based on grades
        // Format: { id: "daily_1", label: "Bab 1 (Harian)", type: "daily", sortKey: 1 }
        const colsMap = new Map<string, any>();

        grades.forEach(g => {
            let colId = '';
            let label = '';
            let sortKey = 0;

            if (g.type === 'daily') {
                colId = `daily_${g.chapter}`;
                label = `Bab ${g.chapter} (Harian)`;
                sortKey = parseInt(g.chapter) || 0;
            } else if (g.type === 'weekly') {
                colId = `weekly_${g.date}`;
                label = `Mingguan (${g.date})`;
                sortKey = 1000 + new Date(g.date).getTime();
            } else if (g.type === 'level_exam') {
                colId = `level_exam`;
                label = `Ujian Level`;
                sortKey = 9999999;
            } else {
                colId = `other_${g.id}`;
                label = `Lainnya`;
            }

            if (!colsMap.has(colId)) {
                colsMap.set(colId, { id: colId, label, type: g.type, sortKey });
            }
        });

        const sortedColumns = Array.from(colsMap.values()).sort((a, b) => a.sortKey - b.sortKey);

        // Build matrix: { [enrollment_id]: { [colId]: grade_object } }
        const mat: any = {};
        enrollments.forEach(e => {
            mat[e.id] = {};
        });

        grades.forEach(g => {
            if (!mat[g.enrollment_id]) mat[g.enrollment_id] = {};
            
            let colId = '';
            if (g.type === 'daily') colId = `daily_${g.chapter}`;
            else if (g.type === 'weekly') colId = `weekly_${g.date}`;
            else if (g.type === 'level_exam') colId = `level_exam`;
            else colId = `other_${g.id}`;

            mat[g.enrollment_id][colId] = g;
        });

        return { columns: sortedColumns, matrix: mat };
    }, [enrollments, grades]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div className="p-8 text-center animate-pulse">Memuat data rekap nilai...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push('/dashboard/classes')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-indigo-600" />
                            Rekap Nilai: {studyClass?.name}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {studyClass?.class_type?.toUpperCase()} | Angkatan {studyClass?.batch?.name || '-'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handlePrint}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center gap-2 text-sm transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Cetak / PDF
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                <div className="overflow-x-auto print:overflow-visible">
                    <Table className="min-w-max">
                        <TableHeader className="bg-gray-50 dark:bg-[#1e2532]/90 border-b border-gray-200 dark:border-gray-700/50">
                            <TableRow>
                                <TableHead className="font-bold text-gray-900 dark:text-white w-[50px] text-center">No</TableHead>
                                <TableHead className="font-bold text-gray-900 dark:text-white min-w-[200px] sticky left-0 bg-gray-50 dark:bg-[#1e2532] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Siswa</TableHead>
                                {columns.map(col => (
                                    <TableHead key={col.id} className="font-bold text-gray-900 dark:text-white text-center min-w-[120px]">
                                        {col.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrollments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length + 2} className="text-center py-8 text-gray-500">
                                        Tidak ada siswa di kelas ini.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                enrollments.map((enr, idx) => (
                                    <TableRow key={enr.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <TableCell className="text-center font-medium text-gray-500">{idx + 1}</TableCell>
                                        <TableCell className="font-semibold text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-[#151a23] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            {enr.student?.user?.name || enr.student?.nis}
                                        </TableCell>
                                        {columns.map(col => {
                                            const grade = matrix[enr.id]?.[col.id];
                                            let scoreDisplay = '-';
                                            let isWarning = false;
                                            
                                            if (grade) {
                                                scoreDisplay = grade.score !== null ? grade.score.toString() : '-';
                                                // If score is below 60 (or not passed), highlight it
                                                if (grade.score !== null && (grade.score < 60 || grade.is_passed === 0)) {
                                                    isWarning = true;
                                                }
                                            }

                                            return (
                                                <TableCell key={col.id} className="text-center">
                                                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-sm font-semibold min-w-[3rem] ${
                                                        isWarning 
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' 
                                                        : grade 
                                                            ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                                                            : 'text-gray-400'
                                                    }`}>
                                                        {scoreDisplay}
                                                    </span>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            
            {/* Custom print styles to ensure table displays well on PDF/Print */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { size: landscape; margin: 1cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    nav, header, .sidebar, button { display: none !important; }
                    .sticky { position: static !important; box-shadow: none !important; }
                    .overflow-x-auto { overflow: visible !important; }
                    main { padding: 0 !important; margin: 0 !important; }
                }
            `}} />
        </div>
    );
}
