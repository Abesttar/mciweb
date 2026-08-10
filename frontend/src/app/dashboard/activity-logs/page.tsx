'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ActivityLog {
    id: number;
    user_id: number | null;
    action: string;
    module: string;
    description: string;
    ip_address: string;
    created_at: string;
    user?: { name: string; email: string };
}

export default function ActivityLogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/activity-logs');
            setLogs(res.data.data || res.data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Activity Log</h1>
            </div>

            <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Waktu</TableHead>
                            <TableHead>Pengguna</TableHead>
                            <TableHead>Aksi</TableHead>
                            <TableHead>Modul</TableHead>
                            <TableHead>Deskripsi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat data...</TableCell></TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">Belum ada aktivitas</TableCell></TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: id })}</TableCell>
                                    <TableCell className="font-medium">
                                        {log.user ? (
                                            <div>
                                                <div>{log.user.name}</div>
                                                <div className="text-xs text-gray-400">{log.user.email}</div>
                                            </div>
                                        ) : 'System'}
                                    </TableCell>
                                    <TableCell><span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">{log.action}</span></TableCell>
                                    <TableCell>{log.module || '-'}</TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-400 text-sm">{log.description || '-'}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
