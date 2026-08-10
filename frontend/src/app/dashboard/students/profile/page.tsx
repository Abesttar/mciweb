"use client";

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Upload, Save, User, FileText, CheckCircle2 } from 'lucide-react';

const MAX_DOCUMENT_SIZE_MB = 500;
const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

export default function StudentProfile() {
    const [user, setUser] = useState<any>(null);
    const [studentData, setStudentData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form fields
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [emergencyContact, setEmergencyContact] = useState('');
    
    // Files
    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        ijazah: null,
        ktp: null,
        akte_kelahiran: null,
        kk: null,
        jft_jlpt: null,
        ssw: null,
        cv: null,
        visa_document: null,
        coe: null,
        work_contract: null,
    });

    async function fetchProfile() {
        try {
            const res = await axios.get('/api/students/me');
            setStudentData(res.data);
            setUser(res.data.user);
            setAddress(res.data.address || '');
            setPhone(res.data.phone || '');
            setEmergencyContact(res.data.emergency_contact || '');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
                toast.error(`Ukuran file terlalu besar. Maksimal tiap dokumen ${MAX_DOCUMENT_SIZE_MB} MB.`);
                e.target.value = '';
                setFiles(prev => ({ ...prev, [field]: null }));
                return;
            }

            setFiles(prev => ({ ...prev, [field]: file }));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentData) return;
        
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('_method', 'PUT'); // Laravel requirement for FormData PUT
            formData.append('address', address);
            formData.append('phone', phone);
            formData.append('emergency_contact', emergencyContact);
            
            Object.keys(files).forEach(key => {
                if (files[key]) {
                    formData.append(key, files[key] as Blob);
                }
            });

            await axios.post(`/api/students/${studentData.id}`, formData);
            
            toast.success('Profile berhasil diperbarui!');
            fetchProfile(); // refresh
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 413) {
                toast.error('Ukuran total dokumen terlalu besar. Maksimal total upload adalah 500 MB.');
                return;
            }
            toast.error(error.response?.data?.message || error.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Memuat profil...</div>;

    if (!studentData) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-amber-100 text-amber-700 rounded-xl p-6">
                    Profil siswa belum terhubung ke akun ini.
                </div>
            </div>
        );
    }

    const docLabels: { [key: string]: string } = {
        ijazah: 'Ijazah (Wajib)',
        ktp: 'KTP (Wajib)',
        akte_kelahiran: 'Akte Kelahiran (Wajib)',
        kk: 'Kartu Keluarga (Wajib)',
        jft_jlpt: 'Sertifikat JFT/JLPT',
        ssw: 'Sertifikat SSW',
        cv: 'Curriculum Vitae (CV)',
        visa_document: 'Visa',
        coe: 'Certificate of Eligibility (COE)',
        work_contract: 'Kontrak Kerja'
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <User className="w-6 h-6 text-red-700 dark:text-red-400" />
                Profil Saya
            </h1>
            
            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Informasi Dasar</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                            <input type="text" readOnly value={user?.name || ''} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input type="email" readOnly value={user?.email || ''} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
                            <textarea 
                                value={address} 
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 outline-none"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No. HP / WhatsApp</label>
                            <input 
                                type="text" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kontak Darurat</label>
                            <input 
                                type="text" 
                                value={emergencyContact}
                                onChange={(e) => setEmergencyContact(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 outline-none" 
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        Dokumen Persyaratan
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.keys(docLabels).map(key => (
                            <div key={key} className="border rounded-lg p-4 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{docLabels[key]}</label>
                                
                                {studentData?.[key] ? (
                                    <div className="mb-3 flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded text-sm font-medium">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Dokumen telah diunggah
                                    </div>
                                ) : (
                                    <div className="mb-3 text-sm text-amber-600 font-medium">
                                        Belum diunggah
                                    </div>
                                )}
                                
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="file" 
                                        id={`file-${key}`}
                                        className="hidden"
                                        onChange={(e) => handleFileChange(e, key)}
                                    />
                                    <label 
                                        htmlFor={`file-${key}`}
                                        className="cursor-pointer bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-300 hover:bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl text-gray-700 dark:text-gray-300 py-1.5 px-3 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <Upload className="w-4 h-4" />
                                        {files[key] ? 'Ganti File' : 'Pilih File'}
                                    </label>
                                    {files[key] && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                                            {files[key]?.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="bg-red-700 hover:bg-red-800 text-white font-medium py-2 px-6 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {saving ? 'Menyimpan...' : 'Simpan Profil & Dokumen'}
                    </button>
                </div>
            </form>
        </div>
    );
}
