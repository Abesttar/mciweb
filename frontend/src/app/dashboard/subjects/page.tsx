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

interface Subject { id: number; name: string; description: string | null; level: string | null; }

export default function SubjectsPage() {
    const { t } = useLanguage();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Subject | null>(null);
    const [deleting, setDeleting] = useState<Subject | null>(null);
    const [form, setForm] = useState({ name: '', description: '', level: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try { const res = await axios.get('/api/subjects', { params: { search: search || undefined } }); setSubjects(res.data.data); }
        catch (err) { console.error(err); } finally { setLoading(false); }
    }, [search]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => { setEditing(null); setForm({ name: '', description: '', level: '' }); setError(''); setDialogOpen(true); };
    const openEdit = (s: Subject) => { setEditing(s); setForm({ name: s.name, description: s.description || '', level: s.level || '' }); setError(''); setDialogOpen(true); };

    const handleSubmit = async () => {
        setSaving(true); setError('');
        try {
            const payload = { name: form.name, description: form.description || null, level: form.level || null };
            if (editing) await axios.put(`/api/subjects/${editing.id}`, payload);
            else await axios.post('/api/subjects', payload);
            setDialogOpen(false); fetchData();
        } catch (err: any) { setError(err.response?.data?.message || 'Gagal menyimpan'); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        try { await axios.delete(`/api/subjects/${deleting.id}`); setDeleteDialogOpen(false); fetchData(); }
        catch (err: any) { toast.error(err.response?.data?.message || 'Gagal menghapus'); }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t.subjectsTitle}</h1>
                <Button onClick={openCreate}>{t.addSubject}</Button>
            </div>
            <div className="mb-4"><Input placeholder={t.searchSubject} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" /></div>
            <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader><TableRow><TableHead>{t.name}</TableHead><TableHead>{t.level}</TableHead><TableHead>{t.subjectDescription}</TableHead><TableHead className="text-right">{t.action}</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.loading}</TableCell></TableRow>
                        : subjects.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noData}</TableCell></TableRow>
                        : subjects.map((s) => (
                            <TableRow key={s.id}>
                                <TableCell className="font-medium">{s.name}</TableCell>
                                <TableCell>{s.level || '-'}</TableCell>
                                <TableCell className="max-w-xs truncate">{s.description || '-'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => openEdit(s)}>{t.edit}</Button>
                                    <Button variant="destructive" size="sm" onClick={() => { setDeleting(s); setDeleteDialogOpen(true); }}>{t.delete}</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>{editing ? t.editSubject : t.addNewSubject}</DialogTitle><DialogDescription>{editing ? t.editSubjectDesc : t.addSubjectDesc}</DialogDescription></DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2"><Label>{t.name} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="grid gap-2"><Label>{t.level}</Label><Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} /></div>
                        <div className="grid gap-2"><Label>{t.subjectDescription}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t.cancel}</Button><Button onClick={handleSubmit} disabled={saving}>{saving ? t.saving : t.save}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t.deleteSubject}</AlertDialogTitle><AlertDialogDescription>{t.confirmDeleteSubject} &quot;{deleting?.name}&quot;?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t.delete}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
