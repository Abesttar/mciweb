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

interface RoadmapStage {
    id: number;
    name: string;
    description: string | null;
    order: number;
    is_active: boolean;
}

export default function RoadmapPage() {
    const { t } = useLanguage();
    const [stages, setStages] = useState<RoadmapStage[]>([]);
    const [stageDialogOpen, setStageDialogOpen] = useState(false);
    const [editingStage, setEditingStage] = useState<RoadmapStage | null>(null);
    const [stageForm, setStageForm] = useState({ name: '', description: '', order: '0', is_active: true });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingStage, setDeletingStage] = useState<RoadmapStage | null>(null);

    const fetchStages = useCallback(async () => {
        try {
            const res = await axios.get('/api/roadmap-stages');
            setStages(res.data.data || res.data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => { fetchStages(); }, [fetchStages]);

    const openStageCreate = () => {
        setEditingStage(null);
        setStageForm({ name: '', description: '', order: String(stages.length + 1), is_active: true });
        setError('');
        setStageDialogOpen(true);
    };

    const openStageEdit = (s: RoadmapStage) => {
        setEditingStage(s);
        setStageForm({ name: s.name, description: s.description || '', order: String(s.order), is_active: s.is_active });
        setError('');
        setStageDialogOpen(true);
    };

    const handleStageSubmit = async () => {
        setSaving(true); setError('');
        try {
            const payload = { ...stageForm, order: parseInt(stageForm.order) };
            if (editingStage) {
                await axios.put(`/api/roadmap-stages/${editingStage.id}`, payload);
            } else {
                await axios.post('/api/roadmap-stages', payload);
            }
            setStageDialogOpen(false);
            fetchStages();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal menyimpan');
        } finally { setSaving(false); }
    };

    const handleDeleteStage = async () => {
        if (!deletingStage) return;
        try {
            await axios.delete(`/api/roadmap-stages/${deletingStage.id}`);
            setDeleteDialogOpen(false);
            fetchStages();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">{t.roadmapTitle}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.roadmapDesc}</p>
                </div>
                <Button onClick={openStageCreate}>{t.addStage}</Button>
            </div>

            <div className="border dark:border-gray-800 rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.order}</TableHead>
                            <TableHead>{t.stageName}</TableHead>
                            <TableHead>{t.description}</TableHead>
                            <TableHead>{t.status}</TableHead>
                            <TableHead className="text-right">{t.action}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stages.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noData}</TableCell></TableRow>
                        ) : stages.map(s => (
                            <TableRow key={s.id}>
                                <TableCell>{s.order}</TableCell>
                                <TableCell className="font-medium dark:text-gray-200">{s.name}</TableCell>
                                <TableCell className="dark:text-gray-300">{s.description || '-'}</TableCell>
                                <TableCell>{s.is_active ? <span className="text-green-600 dark:text-green-400">{t.active}</span> : <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400">{t.inactive}</span>}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => openStageEdit(s)}>{t.edit}</Button>
                                    <Button variant="destructive" size="sm" onClick={() => { setDeletingStage(s); setDeleteDialogOpen(true); }}>{t.delete}</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingStage ? t.editStage : t.addNewStage}</DialogTitle>
                        <DialogDescription>{t.roadmapStageDesc}</DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t.stageName} *</Label>
                            <Input value={stageForm.name} onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.order} *</Label>
                            <Input type="number" value={stageForm.order} onChange={(e) => setStageForm({ ...stageForm, order: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.description}</Label>
                            <Textarea value={stageForm.description} onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="is_active" checked={stageForm.is_active} onChange={(e) => setStageForm({ ...stageForm, is_active: e.target.checked })} />
                            <Label htmlFor="is_active">{t.active}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStageDialogOpen(false)}>{t.cancel}</Button>
                        <Button onClick={handleStageSubmit} disabled={saving}>{saving ? t.saving : t.save}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.deleteStage}</AlertDialogTitle>
                        <AlertDialogDescription>{t.deleteStageWarning}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStage} className="bg-red-600 hover:bg-red-700">{t.delete}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
