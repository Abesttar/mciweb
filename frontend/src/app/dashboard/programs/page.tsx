'use client';

import React, { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Edit, Plus, BookOpen, PlusCircle, MinusCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Stage {
    name: string;
    amount: number;
}

interface TrainingProgram {
    id: number;
    name: string;
    description: string | null;
    stages: Stage[];
    is_active: boolean;
    created_at: string;
}

export default function ProgramsPage() {
    const [programs, setPrograms] = useState<TrainingProgram[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [stages, setStages] = useState<Stage[]>([{ name: '', amount: 0 }]);

    const fetchPrograms = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/training-programs');
            setPrograms(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Gagal mengambil data program pelatihan');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrograms();
    }, []);

    const openCreate = () => {
        setEditingProgram(null);
        setName('');
        setDescription('');
        setIsActive(true);
        setStages([{ name: '', amount: 0 }]);
        setDialogOpen(true);
    };

    const openEdit = (program: TrainingProgram) => {
        setEditingProgram(program);
        setName(program.name);
        setDescription(program.description || '');
        setIsActive(program.is_active);
        setStages(program.stages && program.stages.length > 0 ? program.stages : [{ name: '', amount: 0 }]);
        setDialogOpen(true);
    };

    const addStage = () => {
        setStages([...stages, { name: '', amount: 0 }]);
    };

    const removeStage = (index: number) => {
        const newStages = [...stages];
        newStages.splice(index, 1);
        setStages(newStages);
    };

    const updateStage = (index: number, field: keyof Stage, value: string | number) => {
        const newStages = [...stages];
        newStages[index] = { ...newStages[index], [field]: value };
        setStages(newStages);
    };

    const handleSubmit = async () => {
        if (!name.trim()) return toast.error('Nama program harus diisi');
        if (stages.length === 0) return toast.error('Minimal harus ada 1 tahapan');
        if (stages.some(s => !s.name.trim() || s.amount < 0)) return toast.error('Nama tahap dan nominal harus valid');

        try {
            setSaving(true);
            const payload = { name, description, is_active: isActive, stages };

            if (editingProgram) {
                await axios.put(`/api/training-programs/${editingProgram.id}`, payload);
                toast.success('Program berhasil diperbarui');
            } else {
                await axios.post('/api/training-programs', payload);
                toast.success('Program berhasil ditambahkan');
            }
            
            setDialogOpen(false);
            fetchPrograms();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Yakin ingin menghapus program ini?')) return;
        try {
            await axios.delete(`/api/training-programs/${id}`);
            toast.success('Program berhasil dihapus');
            fetchPrograms();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal menghapus program');
        }
    };

    const formatRp = (num: number) => `Rp ${new Intl.NumberFormat('id-ID').format(num)}`;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-red-600" />
                        Program Pelatihan
                    </h1>
                    <p className="text-gray-500 mt-1">Kelola program pelatihan dan skema pembayaran</p>
                </div>
                <Button onClick={openCreate} className="bg-red-700 hover:bg-red-800">
                    <Plus className="w-4 h-4 mr-2" /> Program Baru
                </Button>
            </div>

            <div className="bg-white dark:bg-[#151a23] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                            <TableHead>Nama Program</TableHead>
                            <TableHead>Tahapan Pembayaran</TableHead>
                            <TableHead>Total Tagihan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[100px]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8">Memuat data...</TableCell></TableRow>
                        ) : programs.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8">Belum ada program pelatihan</TableCell></TableRow>
                        ) : (
                            programs.map((program) => {
                                const total = program.stages?.reduce((sum, stage) => sum + Number(stage.amount), 0) || 0;
                                return (
                                    <TableRow key={program.id}>
                                        <TableCell className="font-medium">
                                            {program.name}
                                            {program.description && <p className="text-xs text-gray-500 font-normal mt-1">{program.description}</p>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {program.stages?.length || 0} Tahap
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {program.stages?.map((s, i) => (
                                                        <div key={i}>- {s.name}: {formatRp(Number(s.amount))}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-semibold">{formatRp(total)}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs rounded-full ${program.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {program.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(program)} className="h-8 w-8 text-blue-600">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(program.id)} className="h-8 w-8 text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl bg-white dark:bg-[#151a23] border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingProgram ? 'Edit Program Pelatihan' : 'Tambah Program Pelatihan'}</DialogTitle>
                        <DialogDescription>Masukkan nama program dan atur tahapan pembayarannya.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Nama Program <span className="text-red-500">*</span></Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Program Reguler" />
                        </div>
                        
                        <div className="grid gap-2">
                            <Label>Deskripsi (Opsional)</Label>
                            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contoh: Program lengkap dari dasar hingga kaiwa" />
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-2">
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                            <Label>Program Aktif</Label>
                        </div>

                        <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                            <div className="flex items-center justify-between mb-4">
                                <Label className="text-base font-semibold">Tahapan Pembayaran</Label>
                                <Button type="button" size="sm" variant="outline" onClick={addStage} className="h-8">
                                    <PlusCircle className="w-4 h-4 mr-2" /> Tambah Tahap
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {stages.map((stage, index) => (
                                    <div key={index} className="flex gap-3 items-start bg-gray-50 dark:bg-gray-800/30 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="flex-1 grid gap-2">
                                            <Label className="text-xs">Nama Tahap</Label>
                                            <Input 
                                                value={stage.name} 
                                                onChange={(e) => updateStage(index, 'name', e.target.value)} 
                                                placeholder={`Contoh: Tahap ${index + 1}`} 
                                                className="bg-white dark:bg-[#1e2532]"
                                            />
                                        </div>
                                        <div className="w-48 grid gap-2">
                                            <Label className="text-xs">Nominal (Rp)</Label>
                                            <Input 
                                                type="number"
                                                min="0"
                                                value={stage.amount === 0 ? '' : stage.amount} 
                                                onChange={(e) => updateStage(index, 'amount', e.target.value === '' ? 0 : Number(e.target.value))} 
                                                placeholder="0"
                                                className="bg-white dark:bg-[#1e2532]"
                                            />
                                        </div>
                                        {stages.length > 1 && (
                                            <div className="pt-6">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeStage(index)} className="text-red-500 h-9 w-9 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <MinusCircle className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-4 flex justify-between items-center bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20">
                                <span className="font-semibold text-red-900 dark:text-red-200">Total Tagihan Program:</span>
                                <span className="font-bold text-lg text-red-700 dark:text-red-400">
                                    {formatRp(stages.reduce((sum, stage) => sum + Number(stage.amount || 0), 0))}
                                </span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSubmit} disabled={saving} className="bg-red-700 hover:bg-red-800">
                            {saving ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
