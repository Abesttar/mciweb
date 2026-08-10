'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/context/LanguageContext';

interface Company { id: number; name: string; address: string | null; industry: string | null; contact_person: string | null; phone: string | null; email: string | null; quota: number | null; }

export default function CompaniesPage() {
    const { t } = useLanguage();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Company | null>(null);
    const [deleting, setDeleting] = useState<Company | null>(null);
    const [form, setForm] = useState({ name: '', address: '', industry: '', contact_person: '', phone: '', email: '', quota: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try { const res = await axios.get('/api/companies', { params: { search: search || undefined } }); setCompanies(res.data.data); }
        catch (err) { console.error(err); } finally { setLoading(false); }
    }, [search]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => { setEditing(null); setForm({ name: '', address: '', industry: '', contact_person: '', phone: '', email: '', quota: '' }); setError(''); setDialogOpen(true); };
    const openEdit = (c: Company) => { setEditing(c); setForm({ name: c.name, address: c.address || '', industry: c.industry || '', contact_person: c.contact_person || '', phone: c.phone || '', email: c.email || '', quota: c.quota?.toString() || '' }); setError(''); setDialogOpen(true); };

    const handleSubmit = async () => {
        setSaving(true); setError('');
        try {
            const payload = { name: form.name, address: form.address || null, industry: form.industry || null, contact_person: form.contact_person || null, phone: form.phone || null, email: form.email || null, quota: form.quota ? parseInt(form.quota) : null };
            if (editing) await axios.put(`/api/companies/${editing.id}`, payload);
            else await axios.post('/api/companies', payload);
            setDialogOpen(false); fetchData();
        } catch (err: any) { setError(err.response?.data?.message || 'Gagal menyimpan'); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        try { await axios.delete(`/api/companies/${deleting.id}`); setDeleteDialogOpen(false); fetchData(); }
        catch (err: any) { toast.error(err.response?.data?.message || 'Gagal menghapus'); }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t.companiesTitle}</h1>
                <Button onClick={openCreate}>{t.addCompany}</Button>
            </div>
            <div className="mb-4"><Input placeholder={t.searchCompany} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" /></div>
            <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader><TableRow><TableHead>{t.name}</TableHead><TableHead>{t.industry}</TableHead><TableHead>{t.contactPerson}</TableHead><TableHead>{t.phone}</TableHead><TableHead>{t.quota}</TableHead><TableHead className="text-right">{t.action}</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.loading}</TableCell></TableRow>
                        : companies.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noData}</TableCell></TableRow>
                        : companies.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell>{c.industry || '-'}</TableCell>
                                <TableCell>{c.contact_person || '-'}</TableCell>
                                <TableCell>{c.phone || '-'}</TableCell>
                                <TableCell>{c.quota || '-'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => openEdit(c)}>{t.edit}</Button>
                                    <Button variant="destructive" size="sm" onClick={() => { setDeleting(c); setDeleteDialogOpen(true); }}>{t.delete}</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader><DialogTitle>{editing ? t.editCompany : t.addNewCompany}</DialogTitle><DialogDescription>{editing ? t.editCompany : t.addNewCompany}</DialogDescription></DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t.name} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="grid gap-2"><Label>{t.industry}</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
                        </div>
                        <div className="grid gap-2"><Label>{t.address}</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t.contactPerson}</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
                            <div className="grid gap-2"><Label>{t.phone}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t.email}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                            <div className="grid gap-2"><Label>{t.quota}</Label><Input type="number" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} /></div>
                        </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t.cancel}</Button><Button onClick={handleSubmit} disabled={saving}>{saving ? t.saving : t.save}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t.deleteCompany}</AlertDialogTitle><AlertDialogDescription>{t.confirmDeleteCompany} &quot;{deleting?.name}&quot;?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t.delete}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
