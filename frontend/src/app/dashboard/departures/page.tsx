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

interface Departure {
    id: number;
    student_id: number;
    departure_date: string;
    flight_number: string | null;
    destination: string | null;
    placement: string | null;
    job: string | null;
    company_id: number | null;
    status: string;
    student?: { user: { name: string } };
    company?: { name: string };
}

export default function DeparturesPage() {
    const { t } = useLanguage();
    const [departures, setDepartures] = useState<Departure[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingDeparture, setEditingDeparture] = useState<Departure | null>(null);
    const [form, setForm] = useState({ student_id: '', departure_date: '', flight_number: '', destination: '', placement: '', job: '', company_id: '', status: 'scheduled' });
    
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingDeparture, setDeletingDeparture] = useState<Departure | null>(null);

    const [filterStatus, setFilterStatus] = useState('');

    const fetchDepartures = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
            const res = await axios.get('/api/departures', { params });
            setDepartures(res.data.data || res.data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    }, [filterStatus]);

    const fetchStudents = useCallback(async () => {
        try {
            const res = await axios.get('/api/students', { params: { per_page: 500 } });
            setStudents(res.data.data || res.data);
        } catch (err) { console.error(err); }
    }, []);

    const fetchCompanies = useCallback(async () => {
        try {
            const res = await axios.get('/api/companies', { params: { per_page: 1000 } });
            setCompanies(res.data.data || res.data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => { fetchDepartures(); }, [fetchDepartures]);
    useEffect(() => { fetchStudents(); }, [fetchStudents]);
    useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

    const openCreate = () => {
        setEditingDeparture(null);
        setForm({ student_id: '', departure_date: '', flight_number: '', destination: '', placement: '', job: '', company_id: '', status: 'scheduled' });
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (d: Departure) => {
        setEditingDeparture(d);
        setForm({
            student_id: d.student_id.toString(),
            departure_date: d.departure_date,
            flight_number: d.flight_number || '',
            destination: d.destination || '',
            placement: d.placement || '',
            job: d.job || '',
            company_id: d.company_id ? String(d.company_id) : '',
            status: d.status
        });
        setError('');
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        setSaving(true); setError('');
        try {
            const payload = {
                student_id: parseInt(form.student_id),
                departure_date: form.departure_date,
                flight_number: form.flight_number || null,
                destination: form.destination || null,
                placement: form.placement || null,
                job: form.job || null,
                company_id: form.company_id ? parseInt(form.company_id) : null,
                status: form.status
            };
            if (editingDeparture) {
                await axios.put(`/api/departures/${editingDeparture.id}`, payload);
            } else {
                await axios.post('/api/departures', payload);
            }
            setDialogOpen(false);
            fetchDepartures();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal menyimpan');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deletingDeparture) return;
        try {
            await axios.delete(`/api/departures/${deletingDeparture.id}`);
            setDeleteDialogOpen(false);
            fetchDepartures();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus');
        }
    };

    const statusLabel = (s: string) => {
        switch (s) {
            case 'scheduled': return <span className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded">{t.statusScheduled}</span>;
            case 'departed': return <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded">{t.statusDeparted}</span>;
            case 'arrived': return <span className="text-green-600 bg-green-50 px-2 py-1 rounded">{t.statusArrived}</span>;
            default: return s;
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t.departuresTitle}</h1>
                <Button onClick={openCreate}>{t.addDeparture}</Button>
            </div>

            <div className="mb-4 p-4 border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl max-w-sm">
                <Label>{t.filterSchedule}</Label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? '')}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder={t.allSchedules} /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t.allSchedules}</SelectItem>
                        <SelectItem value="scheduled">{t.statusScheduled}</SelectItem>
                        <SelectItem value="departed">{t.statusDeparted}</SelectItem>
                        <SelectItem value="arrived">{t.statusArrived}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.studentName}</TableHead>
                            <TableHead>{t.date}</TableHead>
                            <TableHead>{t.flightNumber}</TableHead>
                            <TableHead>{t.destination}</TableHead>
                            <TableHead>Penempatan</TableHead>
                            <TableHead>Pekerjaan</TableHead>
                            <TableHead>{t.companies}</TableHead>
                            <TableHead>{t.status}</TableHead>
                            <TableHead className="text-right">{t.action}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.loading}</TableCell></TableRow>
                        ) : departures.length === 0 ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noDepartureData}</TableCell></TableRow>
                        ) : (
                            departures.map((d) => (
                                <TableRow key={d.id}>
                                    <TableCell className="font-medium">{d.student?.user?.name}</TableCell>
                                    <TableCell>{d.departure_date}</TableCell>
                                    <TableCell>{d.flight_number || '-'}</TableCell>
                                    <TableCell>{d.destination || '-'}</TableCell>
                                    <TableCell>{d.placement || '-'}</TableCell>
                                    <TableCell>{d.job || '-'}</TableCell>
                                    <TableCell>{d.company?.name || '-'}</TableCell>
                                    <TableCell>{statusLabel(d.status)}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => openEdit(d)}>{t.edit}</Button>
                                        <Button variant="destructive" size="sm" onClick={() => { setDeletingDeparture(d); setDeleteDialogOpen(true); }}>{t.delete}</Button>
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
                        <DialogTitle>{editingDeparture ? t.editDeparture : t.addNewDeparture}</DialogTitle>
                        <DialogDescription>{t.departureDesc}</DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t.studentName} *</Label>
                            <Select value={form.student_id ? String(form.student_id) : ''} onValueChange={(v) => setForm({ ...form, student_id: v ?? '' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t.allStudents}>
                                        {form.student_id
                                            ? (students.find(s => String(s.id) === String(form.student_id))?.user?.name
                                               || students.find(s => String(s.id) === String(form.student_id))?.name
                                               || `Siswa #${form.student_id}`)
                                            : t.allStudents}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.user?.name || s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.departureDate} *</Label>
                            <Input type="date" value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.flightNumber}</Label>
                            <Input value={form.flight_number} onChange={(e) => setForm({ ...form, flight_number: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.destination}</Label>
                            <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Penempatan</Label>
                            <Input value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Pekerjaan</Label>
                            <Input value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.companies}</Label>
                            <Select value={form.company_id ? String(form.company_id) : ''} onValueChange={(v) => setForm({ ...form, company_id: v ?? '' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t.allCompanies}>
                                        {form.company_id
                                            ? (companies.find((c: any) => String(c.id) === String(form.company_id))?.name || `#${form.company_id}`)
                                            : t.allCompanies}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((company: any) => (
                                        <SelectItem key={company.id} value={String(company.id)}>{company.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.status} *</Label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? 'scheduled' })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="scheduled">{t.statusScheduled}</SelectItem>
                                    <SelectItem value="departed">{t.statusDeparted}</SelectItem>
                                    <SelectItem value="arrived">{t.statusArrived}</SelectItem>
                                </SelectContent>
                            </Select>
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
                        <AlertDialogTitle>{t.deleteDeparture}</AlertDialogTitle>
                        <AlertDialogDescription>{t.deleteDepartureDesc}</AlertDialogDescription>
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
