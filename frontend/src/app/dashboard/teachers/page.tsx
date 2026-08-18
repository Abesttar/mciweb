'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Teacher {
    id: number;
    user_id: number;
    nip: string | null;
    specialization: string | null;
    user: { id: number; name: string; email: string; profile_photo_url?: string };
}

export default function TeachersPage() {
    const { t } = useLanguage();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
    const [form, setForm] = useState({ name: '', email: '', password: '', nip: '', specialization: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchTeachers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/teachers', { params: { search: search || undefined } });
            setTeachers(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [search]);

    useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

    const openCreate = () => {
        setEditingTeacher(null);
        setForm({ name: '', email: '', password: '', nip: '', specialization: '' });
        setError(''); setDialogOpen(true);
    };

    const openEdit = (t: Teacher) => {
        setEditingTeacher(t);
        setForm({ name: t.user.name, email: t.user.email, password: '', nip: t.nip || '', specialization: t.specialization || '' });
        setError(''); setDialogOpen(true);
    };

    const handleSubmit = async () => {
        setSaving(true); setError('');
        try {
            if (editingTeacher) {
                await axios.put(`/api/teachers/${editingTeacher.id}`, { name: form.name, email: form.email, nip: form.nip || null, specialization: form.specialization || null });
            } else {
                await axios.post('/api/teachers', { name: form.name, email: form.email, password: form.password, nip: form.nip || null, specialization: form.specialization || null });
            }
            setDialogOpen(false); fetchTeachers();
        } catch (err: any) { setError(err.response?.data?.message || 'Gagal menyimpan data'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deletingTeacher) return;
        try { await axios.delete(`/api/teachers/${deletingTeacher.id}`); setDeleteDialogOpen(false); fetchTeachers(); }
        catch (err: any) { toast.error(err.response?.data?.message || 'Gagal menghapus data'); }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t.teacherManagement}</h1>
                <Button onClick={openCreate}>+ {t.addTeacher}</Button>
            </div>
            <div className="mb-4"><Input placeholder={t.searchTeacher} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" /></div>
            <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>NIP</TableHead><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Spesialisasi</TableHead><TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.loading}</TableCell></TableRow>
                        : teachers.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noTeacherFound}</TableCell></TableRow>
                        : teachers.map((teacher) => (
                            <TableRow key={teacher.id}>
                                <TableCell>{teacher.nip || '-'}</TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        {teacher.user.profile_photo_url ? (
                                            <Image src={teacher.user.profile_photo_url} alt={teacher.user.name} width={32} height={32} className="w-8 h-8 rounded-full object-cover border" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 flex items-center justify-center font-bold text-xs shrink-0">
                                                {teacher.user.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        {teacher.user.name}
                                    </div>
                                </TableCell>
                                <TableCell>{teacher.user.email}</TableCell>
                                <TableCell>{teacher.specialization || '-'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => openEdit(teacher)}>{t.edit}</Button>
                                    <Button variant="destructive" size="sm" onClick={() => { setDeletingTeacher(teacher); setDeleteDialogOpen(true); }}>{t.delete}</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingTeacher ? t.editTeacher : t.addNewTeacher}</DialogTitle>
                        <DialogDescription>{editingTeacher ? t.editTeacher : t.addNewTeacher}</DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t.name} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="grid gap-2"><Label>{t.nip}</Label><Input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>{t.email} *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                            {!editingTeacher && <div className="grid gap-2"><Label>{t.password} *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>}
                        </div>
                        <div className="grid gap-2"><Label>{t.specialization}</Label><Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Contoh: Nihongo N5-N3" /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.cancel}</Button>
                        <Button onClick={handleSubmit} disabled={saving}>{saving ? t.saving : t.save}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t.deleteTeacher}</AlertDialogTitle><AlertDialogDescription>{t.confirmDeleteTeacher} &quot;{deletingTeacher?.user?.name}&quot;?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t.delete}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
