'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import axios from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, X, Eye, Shield, Mail, User as UserIcon, Lock, Check } from 'lucide-react';
import { AddressSelector } from '@/components/AddressSelector';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const { user, updateUser } = useAuth();

    // Profile info form
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.profile?.phone || '');
    const [address, setAddress] = useState(user?.profile?.address || '');
    const [gender, setGender] = useState(user?.profile?.gender || '');
    const [savingInfo, setSavingInfo] = useState(false);

    // Password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

    // Photo
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Lightbox
    const [showLightbox, setShowLightbox] = useState(false);

    const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

    const handleUploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 100 * 1024 * 1024) {
            toast.error('Ukuran foto maksimal 100 MB.');
            event.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('profile_photo', file);

        setUploadingPhoto(true);
        try {
            const res = await axios.post('/api/me/profile-photo', formData);
            updateUser(res.data.user);
            toast.success('Foto profil berhasil diperbarui!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal mengunggah foto.');
        } finally {
            setUploadingPhoto(false);
            event.target.value = '';
        }
    };

    const handleSaveInfo = async () => {
        setSavingInfo(true);
        try {
            const payload: any = { name, email };
            if (user?.profile !== undefined) {
                payload.phone = phone;
                payload.address = address;
                payload.gender = gender;
            }
            const res = await axios.put('/api/me/profile', payload);
            updateUser(res.data.user);
            toast.success('Profil berhasil diperbarui!');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Gagal memperbarui profil.';
            toast.error(msg);
        } finally {
            setSavingInfo(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast.error('Konfirmasi password tidak sama.');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('Password baru minimal 8 karakter.');
            return;
        }

        setSavingPassword(true);
        try {
            const res = await axios.put('/api/me/profile', {
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: confirmPassword,
            });
            updateUser(res.data.user);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            toast.success('Password berhasil diubah!');
        } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.current_password?.[0] || 'Gagal mengubah password.';
            toast.error(msg);
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Profil Saya</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Profile Photo Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border rounded-xl p-6 text-center space-y-4">
                        {/* Photo Area */}
                        <div className="relative inline-block mx-auto">
                            <button
                                type="button"
                                onClick={() => {
                                    if (user?.profile_photo_url) {
                                        setShowLightbox(true);
                                    }
                                }}
                                className="block w-36 h-36 rounded-full overflow-hidden border-4 border-red-100 dark:border-red-900/50 shadow-lg mx-auto cursor-pointer hover:ring-4 hover:ring-red-200 transition-all focus:outline-none focus:ring-4 focus:ring-red-300"
                                title={user?.profile_photo_url ? 'Klik untuk memperbesar' : 'Belum ada foto'}
                            >
                                {user?.profile_photo_url ? (
                                    <Image
                                        src={user.profile_photo_url}
                                        alt={user.name}
                                        width={144}
                                        height={144}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                                        <span className="text-5xl font-bold text-white">{userInitial}</span>
                                    </div>
                                )}
                            </button>

                            {/* Camera overlay button */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingPhoto}
                                className="absolute bottom-1 right-1 w-10 h-10 bg-red-700 hover:bg-red-800 text-white rounded-full flex items-center justify-center shadow-lg transition-colors border-2 border-white disabled:opacity-50"
                                title="Ganti foto profil"
                            >
                                <Camera className="h-5 w-5" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleUploadPhoto}
                            />
                        </div>

                        {uploadingPhoto && (
                            <p className="text-sm text-red-700 dark:text-red-400 animate-pulse">Mengunggah foto...</p>
                        )}

                        {user?.profile_photo_url && (
                            <button
                                onClick={() => setShowLightbox(true)}
                                className="inline-flex items-center gap-1.5 text-sm text-red-700 dark:text-red-400 hover:text-red-800 dark:text-red-200 hover:underline transition-colors"
                            >
                                <Eye className="h-4 w-4" />
                                Lihat Foto Besar
                            </button>
                        )}

                        <div className="border-t pt-4 space-y-1">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{user?.name}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                            <div className="flex items-center justify-center gap-1.5 mt-2">
                                <Shield className="h-4 w-4 text-red-600" />
                                <span className="text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
                                    {user?.roles?.join(', ')}
                                </span>
                            </div>
                        </div>

                        {user?.roles?.includes('Siswa') ? (
                            <p className="text-xs text-gray-400 mt-2">
                                Maks 100 MB.<br />
                                Foto ini juga digunakan untuk CV siswa.
                            </p>
                        ) : (
                            <p className="text-xs text-gray-400 mt-2">Maks 100 MB.</p>
                        )}
                    </div>
                </div>

                {/* RIGHT: Edit Forms */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Info Card */}
                    <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4 border-b pb-3">
                            <UserIcon className="h-5 w-5 text-red-700 dark:text-red-400" />
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Informasi Pribadi</h2>
                        </div>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="profile-name">Nama Lengkap</Label>
                                <Input
                                    id="profile-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Nama Lengkap"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="profile-email" className="flex items-center gap-1.5">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    Email
                                </Label>
                                <Input
                                    id="profile-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="email@example.com"
                                />
                            </div>
                            
                            {user?.profile !== undefined && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="profile-phone">Telepon</Label>
                                            <Input
                                                id="profile-phone"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="0812xxxx"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="profile-gender">Jenis Kelamin</Label>
                                            <select
                                                id="profile-gender"
                                                value={gender}
                                                onChange={(e) => setGender(e.target.value)}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <option value="">Pilih Jenis Kelamin</option>
                                                <option value="L">Laki-laki (L)</option>
                                                <option value="P">Perempuan (P)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Alamat</Label>
                                        <AddressSelector 
                                            value={address}
                                            onChange={(val) => setAddress(val)}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <Button
                            onClick={handleSaveInfo}
                            disabled={savingInfo}
                            className="mt-4"
                        >
                            {savingInfo ? (
                                'Menyimpan...'
                            ) : (
                                <span className="flex items-center gap-1.5"><Check className="h-4 w-4" />Simpan Perubahan</span>
                            )}
                        </Button>
                    </div>

                    {/* Password Card */}
                    <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4 border-b pb-3">
                            <Lock className="h-5 w-5 text-amber-600" />
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Ubah Password</h2>
                        </div>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="current-password">Password Saat Ini</Label>
                                <Input
                                    id="current-password"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="new-password">Password Baru</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimal 8 karakter"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Ulangi password baru"
                                    />
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={handleChangePassword}
                            disabled={savingPassword || !currentPassword || !newPassword}
                            variant="outline"
                            className="mt-4"
                        >
                            {savingPassword ? 'Mengubah...' : 'Ubah Password'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* LIGHTBOX MODAL */}
            {showLightbox && user?.profile_photo_url && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowLightbox(false)}
                >
                    <button
                        onClick={() => setShowLightbox(false)}
                        className="absolute top-4 right-4 z-50 p-2 bg-white/10 dark:bg-gray-900/10 hover:bg-white/20 dark:bg-gray-900/20 text-white rounded-full transition-colors"
                        title="Tutup"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <div
                        className="relative max-w-2xl max-h-[85vh] mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Image
                            src={user.profile_photo_url}
                            alt={user.name}
                            width={800}
                            height={800}
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg p-4">
                            <p className="text-white font-semibold text-lg">{user.name}</p>
                            <p className="text-white/70 text-sm">{user.roles?.join(', ')}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
