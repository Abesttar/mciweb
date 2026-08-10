'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Student {
    id: number;
    user?: { name: string };
    batch?: { name: string };
    study_class?: { name: string };
}

export default function ReportsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterBatchId, setFilterBatchId] = useState('');

    const fetchBatches = useCallback(async () => {
        try {
            const res = await axios.get('/api/batches');
            setBatches(res.data.data || res.data);
        } catch (err) { console.error(err); }
    }, []);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterBatchId && filterBatchId !== 'all') params.batch_id = filterBatchId;
            const res = await axios.get('/api/reports/students', { params });
            setStudents(res.data.data || res.data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    }, [filterBatchId]);

    useEffect(() => { fetchBatches(); }, [fetchBatches]);
    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    const handleDownloadPdf = async (studentId: number) => {
        try {
            const response = await axios.get(`/api/reports/students/${studentId}`, {
                params: { download: 'pdf' },
                responseType: 'blob', // Important for downloading files
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Rapor_${studentId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Download failed', err);
            toast.error('Gagal mendownload rapor PDF');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Laporan & Rapor Akademik</h1>
            </div>

            <div className="mb-6 p-4 border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl max-w-sm">
                <Label>Filter Batch</Label>
                <Select value={filterBatchId} onValueChange={(v) => setFilterBatchId(v ?? '')}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Semua Batch" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Batch</SelectItem>
                        {batches.map(b => (
                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Siswa</TableHead>
                            <TableHead>Batch</TableHead>
                            <TableHead>Kelas</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat data...</TableCell></TableRow>
                        ) : students.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">Belum ada data siswa</TableCell></TableRow>
                        ) : (
                            students.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.user?.name}</TableCell>
                                    <TableCell>{s.batch?.name || '-'}</TableCell>
                                    <TableCell>{s.study_class?.name || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => handleDownloadPdf(s.id)}
                                            className="text-red-700 dark:text-red-400 border-red-700 hover:bg-red-50 dark:bg-red-950/40"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                            </svg>
                                            Download Rapor (PDF)
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
