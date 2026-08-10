'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Target {
    id: number;
    target_type: string;
    target_id: string;
}

interface Announcement {
    id: number;
    title: string;
    content: string;
    created_at: string;
    created_by: number | { name: string };
    created_by_user?: { name: string };
    targets?: Target[];
}

export default function AnnouncementsPage() {
    const { user, hasPermission } = useAuth();
    const { t } = useLanguage();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    
    // For creation
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ title: '', content: '', target_type: 'all', target_id: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [batches, setBatches] = useState<any[]>([]);

    const fetchAnnouncements = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/announcements');
            setAnnouncements(res.data.data || res.data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    }, []);

    const fetchBatches = useCallback(async () => {
        if (!hasPermission('manage announcements')) return;
        try {
            const res = await axios.get('/api/batches');
            setBatches(res.data.data || res.data);
        } catch (err) { console.error(err); }
    }, [hasPermission]);

    useEffect(() => { fetchAnnouncements(); fetchBatches(); }, [fetchAnnouncements, fetchBatches]);

    const handleCreate = async () => {
        setSaving(true); setError('');
        try {
            await axios.post('/api/announcements', {
                title: form.title,
                content: form.content,
                targets: [
                    { type: form.target_type, id: form.target_id || null }
                ]
            });
            setDialogOpen(false);
            setForm({ title: '', content: '', target_type: 'all', target_id: '' });
            fetchAnnouncements();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal menyimpan pengumuman');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus pengumuman ini?')) return;
        try {
            await axios.delete(`/api/announcements/${id}`);
            fetchAnnouncements();
        } catch (err: any) {
            toast.error('Gagal menghapus');
        }
    };

    const formatTarget = (targets: Target[]) => {
        if (!targets || targets.length === 0) return 'Semua';
        const t = targets[0];
        if (t.target_type === 'all') return 'Semua Pengguna';
        if (t.target_type === 'role') return `Role: ${t.target_id}`;
        if (t.target_type === 'batch') return `Batch ID: ${t.target_id}`;
        return t.target_type;
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t.announcementsTitle}</h1>
                {hasPermission('manage announcements') && (
                    <Button onClick={() => setDialogOpen(true)}>+ {t.addAnnouncement}</Button>
                )}
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">{t.loading}</div>
                ) : announcements.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border rounded-lg">{t.noAnnouncementFound}</div>
                ) : (
                    announcements.map((a) => (
                        <div key={a.id} className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border rounded-lg p-5 shadow-sm relative">
                            {hasPermission('manage announcements') && (
                                <button onClick={() => handleDelete(a.id)} className="absolute top-4 right-4 text-red-500 text-sm hover:underline">{t.delete}</button>
                            )}
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{a.title}</h2>
                            <div className="text-xs text-gray-400 mt-1 mb-3 flex gap-4">
                                <span>{t.from}: {typeof a.created_by === 'object' ? a.created_by.name : a.created_by_user?.name || 'Admin'}</span>
                                <span>{format(new Date(a.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}</span>
                                {hasPermission('manage announcements') && (
                                    <span className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-2 py-0.5 rounded">{t.target}: {formatTarget(a.targets || [])}</span>
                                )}
                            </div>
                            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.content}</div>
                        </div>
                    ))
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t.addAnnouncement}</DialogTitle>
                        <DialogDescription>{t.announcementsDesc}</DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t.announcementTitle} *</Label>
                            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t.announcementTitle} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.content} *</Label>
                            <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder={t.content} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.targetAudience} *</Label>
                            <Select value={form.target_type} onValueChange={(v) => setForm({ ...form, target_type: v ?? 'all' })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Pengguna</SelectItem>
                                    <SelectItem value="role">Role Tertentu</SelectItem>
                                    <SelectItem value="batch">Batch Tertentu</SelectItem>
                                    <SelectItem value="student">Siswa Tertentu (NIS)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {form.target_type === 'role' && (
                            <div className="grid gap-2">
                                <Label>Pilih Role</Label>
                                <Select value={form.target_id} onValueChange={(v) => setForm({ ...form, target_id: v ?? '' })}>
                                    <SelectTrigger><SelectValue placeholder="Pilih Role" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Sensei">Sensei</SelectItem>
                                        <SelectItem value="Siswa">Siswa</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {form.target_type === 'batch' && (
                            <div className="grid gap-2">
                                <Label>Pilih Batch</Label>
                                <Select value={form.target_id ? String(form.target_id) : ''} onValueChange={(v) => setForm({ ...form, target_id: v ?? '' })}>
                                    <SelectTrigger><SelectValue placeholder="Pilih Batch" /></SelectTrigger>
                                    <SelectContent>
                                        {batches.map(b => (
                                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {form.target_type === 'student' && (
                            <div className="grid gap-2">
                                <Label>Masukkan NIS Siswa</Label>
                                <Input 
                                    value={form.target_id} 
                                    onChange={(e) => setForm({ ...form, target_id: e.target.value })} 
                                    placeholder="Contoh: NIS12345"
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.cancel}</Button>
                        <Button onClick={handleCreate} disabled={saving}>{saving ? t.saving : t.send}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
