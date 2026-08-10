'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/context/LanguageContext';

interface Student {
    id: number;
    name: string;
    user?: { name: string };
}

interface Company {
    id: number;
    name: string;
}

interface Matching {
    id: number;
    student_id: number;
    company_id: number;
    status: string;
    interview_date: string | null;
    student?: { user: { name: string } };
    company?: { name: string };
}

export default function MatchingPage() {
    const { t } = useLanguage();
    const [matchings, setMatchings] = useState<Matching[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMatching, setEditingMatching] = useState<Matching | null>(null);
    const [form, setForm] = useState({ student_id: '', company_id: '', status: 'applied', interview_date: '' });
    
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingMatching, setDeletingMatching] = useState<Matching | null>(null);

    const [filterStudentId, setFilterStudentId] = useState('');
    const [filterCompanyId, setFilterCompanyId] = useState('');

    const fetchMatchings = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterStudentId && filterStudentId !== 'all') params.student_id = filterStudentId;
            if (filterCompanyId && filterCompanyId !== 'all') params.company_id = filterCompanyId;
            const res = await axios.get('/api/matchings', { params });
            setMatchings(res.data.data || res.data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    }, [filterStudentId, filterCompanyId]);

    const fetchDependencies = useCallback(async () => {
        try {
            const [stdRes, compRes] = await Promise.all([
                axios.get('/api/students', { params: { per_page: 500 } }),
                axios.get('/api/companies', { params: { limit: 500 } })
            ]);
            setStudents(stdRes.data.data || stdRes.data);
            setCompanies(compRes.data.data || compRes.data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => { fetchMatchings(); }, [fetchMatchings]);
    useEffect(() => { fetchDependencies(); }, [fetchDependencies]);

    const openCreate = () => {
        setEditingMatching(null);
        setForm({ student_id: '', company_id: '', status: 'applied', interview_date: '' });
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (m: Matching) => {
        setEditingMatching(m);
        setForm({
            student_id: m.student_id.toString(),
            company_id: m.company_id.toString(),
            status: m.status,
            interview_date: m.interview_date || ''
        });
        setError('');
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        setSaving(true); setError('');
        try {
            const payload = {
                student_id: parseInt(form.student_id),
                company_id: parseInt(form.company_id),
                status: form.status,
                interview_date: form.interview_date || null
            };
            if (editingMatching) {
                await axios.put(`/api/matchings/${editingMatching.id}`, payload);
            } else {
                await axios.post('/api/matchings', payload);
            }
            setDialogOpen(false);
            fetchMatchings();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal menyimpan');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deletingMatching) return;
        try {
            await axios.delete(`/api/matchings/${deletingMatching.id}`);
            setDeleteDialogOpen(false);
            fetchMatchings();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus');
        }
    };

    const statusLabel = (s: string) => {
        switch (s) {
            case 'applied': return <span className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded">{t.statusApplied}</span>;
            case 'interview': return <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded">{t.statusInterview}</span>;
            case 'accepted': return <span className="text-green-600 bg-green-50 px-2 py-1 rounded">{t.statusAccepted}</span>;
            case 'rejected': return <span className="text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded">{t.statusRejected}</span>;
            default: return s;
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t.matchingTitle}</h1>
                <Button onClick={openCreate}>{t.addMatching}</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <div className="grid gap-2">
                    <Label>{t.filterStudent}</Label>
                    <Select value={filterStudentId} onValueChange={(v) => setFilterStudentId(v ?? '')}>
                        <SelectTrigger><SelectValue placeholder={t.allStudents} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.allStudents}</SelectItem>
                            {students.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.user?.name || s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>{t.filterCompany}</Label>
                    <Select value={filterCompanyId} onValueChange={(v) => setFilterCompanyId(v ?? '')}>
                        <SelectTrigger><SelectValue placeholder={t.allCompanies} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.allCompanies}</SelectItem>
                            {companies.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.studentName}</TableHead>
                            <TableHead>{t.companies}</TableHead>
                            <TableHead>{t.interviewDate}</TableHead>
                            <TableHead>{t.status}</TableHead>
                            <TableHead className="text-right">{t.action}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.loading}</TableCell></TableRow>
                        ) : matchings.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noMatchingData}</TableCell></TableRow>
                        ) : (
                            matchings.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell className="font-medium">{m.student?.user?.name}</TableCell>
                                    <TableCell>{m.company?.name}</TableCell>
                                    <TableCell>{m.interview_date || '-'}</TableCell>
                                    <TableCell>{statusLabel(m.status)}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => openEdit(m)}>{t.edit}</Button>
                                        <Button variant="destructive" size="sm" onClick={() => { setDeletingMatching(m); setDeleteDialogOpen(true); }}>{t.delete}</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingMatching ? t.editMatching : t.addNewMatching}</DialogTitle>
                        <DialogDescription>{t.matchingDesc}</DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t.studentName} *</Label>
                            <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v ?? '' })}>
                                <SelectTrigger><SelectValue placeholder={t.allStudents} /></SelectTrigger>
                                <SelectContent>
                                    {students.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.user?.name || s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.companies} *</Label>
                            <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v ?? '' })}>
                                <SelectTrigger><SelectValue placeholder={t.allCompanies} /></SelectTrigger>
                                <SelectContent>
                                    {companies.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.status} *</Label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? 'applied' })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="applied">{t.statusApplied}</SelectItem>
                                    <SelectItem value="interview">{t.statusInterview}</SelectItem>
                                    <SelectItem value="accepted">{t.statusAccepted}</SelectItem>
                                    <SelectItem value="rejected">{t.statusRejected}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.interviewDate}</Label>
                            <Input type="date" value={form.interview_date} onChange={(e) => setForm({ ...form, interview_date: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.cancel}</Button>
                        <Button onClick={handleSubmit} disabled={saving}>{saving ? t.saving : t.save}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.deleteMatching}</AlertDialogTitle>
                        <AlertDialogDescription>{t.deleteMatchingDesc}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t.delete}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
