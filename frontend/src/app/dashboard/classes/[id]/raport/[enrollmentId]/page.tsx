'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft, Loader2, Send, CheckCircle2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RaportPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id as string;
    const enrollmentId = params.enrollmentId as string;

    const { hasRole } = useAuth();
    const isSensei  = hasRole('Sensei') || hasRole('Admin') || hasRole('Super Admin');
    const isSiswa   = hasRole('Siswa');

    const [studyClass, setStudyClass] = useState<any>(null);
    const [enrollment, setEnrollment] = useState<any>(null);
    const [grades, setGrades] = useState<any[]>([]);
    const [attendances, setAttendances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const classRes = await axios.get(`/api/study-classes/${classId}`);
            setStudyClass(classRes.data);

            const enrollmentsRes = await axios.get(`/api/enrollments/${enrollmentId}`);
            setEnrollment(enrollmentsRes.data);

            const gradesRes = await axios.get('/api/grades', {
                params: { study_class_id: classId, enrollment_id: enrollmentId, per_page: 200 }
            });
            setGrades(gradesRes.data.data);

            const attendancesRes = await axios.get('/api/attendances', {
                params: { enrollment_id: enrollmentId, per_page: 200 }
            });
            setAttendances(attendancesRes.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [classId, enrollmentId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const generatePdfBytes = useCallback(async () => {
        if (!studyClass || !enrollment) return null;

        const classType = studyClass.class_type;
        const isShoChuKou = ['shou', 'chuu', 'kou'].includes(classType);
        const isJFT = classType === 'jft';
        const isKaiwa = classType === 'kaiwa';

        const getClassLevelLabel = () => {
            if (classType === 'shou') return { level: '初級', levelId: 'Kelas Dasar (Shou)', chapters: 'Bab 1 – 17' };
            if (classType === 'chuu') return { level: '中級', levelId: 'Kelas Menengah (Chuu)', chapters: 'Bab 18 – 34' };
            if (classType === 'kou') return { level: '上級', levelId: 'Kelas Atas (Kou)', chapters: 'Bab 35 – 50' };
            return { level: '', levelId: classType, chapters: '' };
        };
        const levelInfo = getClassLevelLabel();

        const dailyGrades = grades.filter(g => g.type === 'daily').sort((a, b) => {
            const da = a.date || ''; const db = b.date || '';
            if (da !== db) return da.localeCompare(db);
            return (parseInt(a.chapter) || 0) - (parseInt(b.chapter) || 0);
        });
        const weeklyGrades = grades.filter(g => g.type === 'weekly').sort((a, b) => {
            return (a.date || '').localeCompare(b.date || '');
        });
        const allEntries = [...dailyGrades, ...weeklyGrades].sort((a, b) => {
            return (a.date || '').localeCompare(b.date || '');
        });

        const attendanceStats = {
            Hadir: attendances.filter(a => a.status === 'Hadir').length,
            Sakit: attendances.filter(a => a.status === 'Sakit').length,
            Izin: attendances.filter(a => a.status === 'Izin').length,
            Alpa: attendances.filter(a => a.status === 'Alpa').length,
        };

        let templateFile = '';
        if (isShoChuKou) templateFile = '/template-raport.pdf';
        else if (isJFT) templateFile = '/template-raport-jft.pdf';
        else if (isKaiwa) templateFile = '/template-raport-kaiwa.pdf';

        const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
        const existingPdfBytes = await fetch(templateFile).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const page = pdfDoc.getPages()[0];
        const { height } = page.getSize();
        const black = rgb(0, 0, 0);
        let letterColor = rgb(0.8, 0, 0);
        if (isJFT) letterColor = rgb(0, 0, 0.8);
        else if (isKaiwa) letterColor = rgb(0.9, 0.7, 0); // Yellowish

        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const examGrade = grades.find(g => g.type === 'level_exam');

        // Fungsi bantu untuk menulis teks ke satu kolom ke bawah
        const tulisKolom = (teks: string | number | undefined | null, x: number, rowIndex: number, startY: number, rowHeight: number, warna = black) => {
            if (teks !== null && teks !== undefined && teks !== '') {
                page.drawText(teks.toString(), { x, y: startY - (rowIndex * rowHeight), size: 9, color: warna });
            }
        };

        // =====================================================================
        // =================== PENGATURAN KELAS SHOU / CHUU / KOU =============
        // =====================================================================
        if (isShoChuKou) {

            // 1. Info Siswa (Kanan Atas)
            const rightX = 686;
            const sizeInfo = 12;
            page.drawText(enrollment.student?.user?.name || '', { x: rightX, y: height - 28, size: sizeInfo, color: black });
            page.drawText(enrollment.student?.nis || '-', { x: rightX, y: height - 56, size: sizeInfo, color: black });
            page.drawText(levelInfo.levelId || '', { x: rightX, y: height - 85.2, size: sizeInfo, color: black });
            page.drawText(studyClass.teacher?.user?.name || '-', { x: rightX, y: height - 113.8, size: sizeInfo, color: black });

            // 2a. Absensi - HADIR
            const hadirX = 268; const hadirY = 80.3;
            page.drawText(attendanceStats.Hadir.toString(), { x: hadirX, y: hadirY, size: 11, color: black });

            // 2b. Absensi - ALPA
            const alpaX = 268; const alpaY = 63;
            page.drawText(attendanceStats.Alpa.toString(), { x: alpaX, y: alpaY, size: 11, color: black });

            // 2c. Absensi - SAKIT
            const sakitX = 268; const sakitY = 45;
            page.drawText(attendanceStats.Sakit.toString(), { x: sakitX, y: sakitY, size: 11, color: black });

            // 2d. Absensi - IZIN
            const izinX = 268; const izinY = 27;
            page.drawText(attendanceStats.Izin.toString(), { x: izinX, y: izinY, size: 11, color: black });

            // 3. Tabel Nilai
            const startY = height - 173; // Posisi Y baris pertama
            const rowHeight = 16; // Jarak antar baris

            // Kolom 1: Tanggal
            const xTanggal = 32;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(formatDate(allEntries[i].date), xTanggal, i, startY, rowHeight);

            // Kolom 2: Bab
            const xBab = 116.5;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].chapter, xBab, i, startY, rowHeight);

            // Kolom 3: Deskripsi Nilai / Keterangan
            const xKet = 159;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].remarks || 'Nilai harian', xKet, i, startY, rowHeight);

            // Kolom 4: Kosa Kata / Kotoba
            const xKotoba = 294;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.kotoba ?? (allEntries[i].type === 'weekly' ? '-' : ''), xKotoba, i, startY, rowHeight);

            // Kolom 5: Huruf Kanji
            const xKanji = 365;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.kanji ?? (allEntries[i].type === 'weekly' ? '-' : ''), xKanji, i, startY, rowHeight);

            // Kolom 6: Tata Bahasa / Bunpou
            const xBunpou = 444;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.bunpou ?? (allEntries[i].type === 'weekly' ? '-' : ''), xBunpou, i, startY, rowHeight);

            // Kolom 7: Mendengarkan / Choukai
            const xChoukai = 535;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.choukai ?? (allEntries[i].type === 'weekly' ? '-' : ''), xChoukai, i, startY, rowHeight);

            // Kolom 8: Percakapan / Kaiwa
            const xKaiwa = 623;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.kaiwa ?? (allEntries[i].type === 'weekly' ? '-' : ''), xKaiwa, i, startY, rowHeight);

            // Kolom 9: Sikap
            const xSikap = 696;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.sikap ?? (allEntries[i].type === 'weekly' ? '-' : ''), xSikap, i, startY, rowHeight);

            // Kolom 10: Total Score (Angka)
            const xTotal = 755;
            for (let i = 0; i < 17; i++) if (allEntries[i] && allEntries[i].score) tulisKolom(allEntries[i].score, xTotal, i, startY, rowHeight);

            // Kolom 11: Grade Letter (Huruf Bobot Merah)
            const xGradeLetter = 811;
            for (let i = 0; i < 17; i++) if (allEntries[i] && allEntries[i].grade_letter) tulisKolom(allEntries[i].grade_letter, xGradeLetter, i, startY, rowHeight, letterColor);

            // 4a. Ujian Tingkatan - NILAI ANGKA (Bold)
            if (examGrade) {
                const examScoreX = 331; const examScoreY = 50;
                page.drawText(examGrade.score?.toString() || '', { x: examScoreX, y: examScoreY, size: 28, color: black, font: boldFont });
            }

            // 4b. Ujian Tingkatan - KETERANGAN LULUS / TIDAK LULUS (Bold)
            if (examGrade) {
                const examKetX = 350; const examKetY = 30;
                const ketLulus = examGrade.is_passed === true || examGrade.is_passed === 1 ? 'Lulus'
                    : examGrade.is_passed === false || examGrade.is_passed === 0 ? 'Tidak Lulus'
                        : (examGrade.remarks || '');
                if (ketLulus) page.drawText(ketLulus, { x: examKetX, y: examKetY, size: 13, color: black, font: boldFont });
            }

            // 5a. Tanda Tangan - NAMA PENGAJAR
            const ttdPengajarX = 719; const ttdPengajarY = 28;
            page.drawText(studyClass.teacher?.user?.name || '', { x: ttdPengajarX, y: ttdPengajarY, size: 10, color: black });

            // 5b. Tanda Tangan - NAMA KEPALA LPK
            const ttdKepalaMCIX = 574; const ttdKepalaMCIY = 28;
            page.drawText('Faisal Maulana', { x: ttdKepalaMCIX, y: ttdKepalaMCIY, size: 10, color: black });

            // =====================================================================
            // ====================== PENGATURAN KELAS JFT =========================
            // =====================================================================
        } else if (isJFT) {

            // 1. Info Siswa (Kanan Atas) - SESUAIKAN UNTUK TEMPLATE JFT
            const rightX = 685;
            const sizeInfo = 12;
            page.drawText(enrollment.student?.user?.name || '', { x: rightX, y: height - 35.5, size: sizeInfo, color: black });
            page.drawText(enrollment.student?.nis || '-', { x: rightX, y: height - 65, size: sizeInfo, color: black });
            page.drawText('JFT Basic', { x: rightX, y: height - 94, size: sizeInfo, color: black });
            page.drawText(studyClass.teacher?.user?.name || '-', { x: rightX, y: height - 122, size: sizeInfo, color: black });

            // 2a. Absensi - HADIR
            const hadirX = 268; const hadirY = 71.5;
            page.drawText(attendanceStats.Hadir.toString(), { x: hadirX, y: hadirY, size: 11, color: black });

            // 2b. Absensi - ALPA
            const alpaX = 268; const alpaY = 54;
            page.drawText(attendanceStats.Alpa.toString(), { x: alpaX, y: alpaY, size: 11, color: black });

            // 2c. Absensi - SAKIT
            const sakitX = 268; const sakitY = 36;
            page.drawText(attendanceStats.Sakit.toString(), { x: sakitX, y: sakitY, size: 11, color: black });

            // 2d. Absensi - IZIN
            const izinX = 268; const izinY = 19.3;
            page.drawText(attendanceStats.Izin.toString(), { x: izinX, y: izinY, size: 11, color: black });

            // 3. Tabel Nilai JFT
            const startY = height - 181.8; // Posisi Y baris pertama
            const rowHeight = 16; // Jarak antar baris

            // Kolom 1: Tanggal
            const xTanggal = 32;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(formatDate(allEntries[i].date), xTanggal, i, startY, rowHeight);

            // Kolom 2: Deskripsi Nilai / Keterangan
            const xKet = 110;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].remarks || 'Nilai harian', xKet, i, startY, rowHeight);

            // Kolom 3: Kosa Kata / Kotoba
            const xKotoba = 274;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.kotoba ?? (allEntries[i].type === 'weekly' ? '-' : ''), xKotoba, i, startY, rowHeight);

            // Kolom 4: Huruf Kanji
            const xKanji = 346;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.kanji ?? (allEntries[i].type === 'weekly' ? '-' : ''), xKanji, i, startY, rowHeight);

            // Kolom 5: Tata Bahasa / Bunpou
            const xBunpou = 428;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.bunpou ?? (allEntries[i].type === 'weekly' ? '-' : ''), xBunpou, i, startY, rowHeight);

            // Kolom 6: Mendengarkan / Choukai
            const xChoukai = 524;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.choukai ?? (allEntries[i].type === 'weekly' ? '-' : ''), xChoukai, i, startY, rowHeight);

            // Kolom 7: Percakapan / Kaiwa
            const xKaiwa = 619;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.kaiwa ?? (allEntries[i].type === 'weekly' ? '-' : ''), xKaiwa, i, startY, rowHeight);

            // Kolom 8: Sikap
            const xSikap = 696;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.sikap ?? (allEntries[i].type === 'weekly' ? '-' : ''), xSikap, i, startY, rowHeight);

            // Kolom 9: Total Score (Angka)
            const xTotal = 755;
            for (let i = 0; i < 17; i++) if (allEntries[i] && allEntries[i].score) tulisKolom(allEntries[i].score, xTotal, i, startY, rowHeight);

            // Kolom 10: Grade Letter (Huruf Bobot Merah)
            const xGradeLetter = 810;
            for (let i = 0; i < 17; i++) if (allEntries[i] && allEntries[i].grade_letter) tulisKolom(allEntries[i].grade_letter, xGradeLetter, i, startY, rowHeight, letterColor);

            // 4a. Ujian Tingkatan - NILAI ANGKA (Bold)
            if (examGrade) {
                const examScoreX = 331; const examScoreY = 50;
                page.drawText(examGrade.score?.toString() || '', { x: examScoreX, y: examScoreY, size: 28, color: black, font: boldFont });
            }

            // 4b. Ujian Tingkatan - KETERANGAN LULUS / TIDAK LULUS (Bold)
            if (examGrade) {
                const examKetX = 350; const examKetY = 30;
                const ketLulus = examGrade.is_passed === true || examGrade.is_passed === 1 ? 'Lulus'
                    : examGrade.is_passed === false || examGrade.is_passed === 0 ? 'Tidak Lulus'
                        : (examGrade.remarks || '');
                if (ketLulus) page.drawText(ketLulus, { x: examKetX, y: examKetY, size: 13, color: black, font: boldFont });
            }

            // 5a. Tanda Tangan - NAMA PENGAJAR
            const ttdPengajarX = 719; const ttdPengajarY = 20;
            page.drawText(studyClass.teacher?.user?.name || '', { x: ttdPengajarX, y: ttdPengajarY, size: 10, color: black });

            // 5b. Tanda Tangan - NAMA KEPALA LPK
            const ttdKepalaMCIX = 574; const ttdKepalaMCIY = 20;
            page.drawText('Faisal Maulana', { x: ttdKepalaMCIX, y: ttdKepalaMCIY, size: 10, color: black });

            // =====================================================================
            // ====================== PENGATURAN KELAS KAIWA ========================
            // =====================================================================
        } else if (isKaiwa) {

            // 1. Info Siswa (Kanan Atas) - SESUAIKAN UNTUK TEMPLATE KAIWA
            const rightX = 685;
            const sizeInfo = 12;
            page.drawText(enrollment.student?.user?.name || '', { x: rightX, y: height - 35, size: sizeInfo, color: black });
            page.drawText(enrollment.student?.nis || '-', { x: rightX, y: height - 65, size: sizeInfo, color: black });
            page.drawText('Kaiwa (percakapan)', { x: rightX, y: height - 95, size: sizeInfo, color: black });
            page.drawText(studyClass.teacher?.user?.name || '-', { x: rightX, y: height - 123, size: sizeInfo, color: black });

            // 2a. Absensi - HADIR
            const hadirX = 268; const hadirY = 71;
            page.drawText(attendanceStats.Hadir.toString(), { x: hadirX, y: hadirY, size: 11, color: black });

            // 2b. Absensi - ALPA
            const alpaX = 268; const alpaY = 53;
            page.drawText(attendanceStats.Alpa.toString(), { x: alpaX, y: alpaY, size: 11, color: black });

            // 2c. Absensi - SAKIT
            const sakitX = 268; const sakitY = 35.5;
            page.drawText(attendanceStats.Sakit.toString(), { x: sakitX, y: sakitY, size: 11, color: black });

            // 2d. Absensi - IZIN
            const izinX = 268; const izinY = 18;
            page.drawText(attendanceStats.Izin.toString(), { x: izinX, y: izinY, size: 11, color: black });

            // 3. Tabel Nilai Kaiwa
            const startY = height - 182; // Posisi Y baris pertama
            const rowHeight = 16.3; // Jarak antar baris

            // Kolom 1: Tanggal
            const xTanggal = 32.5;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(formatDate(allEntries[i].date), xTanggal, i, startY, rowHeight);

            // Kolom 2: Deskripsi Nilai / Keterangan
            const xKet = 112;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].remarks || 'Nilai harian', xKet, i, startY, rowHeight);

            // Kolom 3: Perkenalan / Jikoshoukai
            const xPerkenalan = 310;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.jikoshoukai ?? (allEntries[i].type === 'weekly' ? '-' : ''), xPerkenalan, i, startY, rowHeight);

            // Kolom 4: Karangan / Sakubun
            const xKarangan = 453;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.sakubun ?? (allEntries[i].type === 'weekly' ? '-' : ''), xKarangan, i, startY, rowHeight);

            // Kolom 5: Percakapan / Kaiwa
            const xPercakapan = 595;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.kaiwa ?? (allEntries[i].type === 'weekly' ? '-' : ''), xPercakapan, i, startY, rowHeight);

            // Kolom 6: Sikap
            const xSikap = 695;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].components?.sikap ?? (allEntries[i].type === 'weekly' ? '-' : ''), xSikap, i, startY, rowHeight);

            // Kolom 7: Total / Bobot
            const xTotal = 755;
            for (let i = 0; i < 17; i++) if (allEntries[i]) tulisKolom(allEntries[i].score ?? '-', xTotal, i, startY, rowHeight);

            // Kolom 8: Grade Letter (Huruf Bobot Merah)
            const xGradeLetter = 810;
            for (let i = 0; i < 17; i++) if (allEntries[i] && allEntries[i].grade_letter) tulisKolom(allEntries[i].grade_letter, xGradeLetter, i, startY, rowHeight, letterColor);

            // 5a. Tanda Tangan - NAMA PENGAJAR
            const ttdPengajarX = 735; const ttdPengajarY = 21;
            page.drawText(studyClass.teacher?.user?.name || '', { x: ttdPengajarX, y: ttdPengajarY, size: 10, color: black });

            // 5b. Tanda Tangan - NAMA KEPALA LPK
            const ttdKepalaMCIX = 574; const ttdKepalaMCIY = 21;
            page.drawText('Faisal Maulana', { x: ttdKepalaMCIX, y: ttdKepalaMCIY, size: 10, color: black });
        }

        return await pdfDoc.save();
    }, [studyClass, enrollment, grades, attendances]);

    useEffect(() => {
        let active = true;
        let objectUrl = '';

        if (!loading && studyClass && enrollment) {
            generatePdfBytes().then(bytes => {
                if (!active || !bytes) return;
                const blob = new Blob([bytes as any], { type: 'application/pdf' });
                objectUrl = window.URL.createObjectURL(blob);
                setPdfPreviewUrl(objectUrl);
            }).catch(err => {
                console.error('Error rendering preview PDF', err);
            });
        }

        return () => {
            active = false;
            if (objectUrl) window.URL.revokeObjectURL(objectUrl);
        };
    }, [loading, studyClass, enrollment, generatePdfBytes]);

    const handleDownload = () => {
        if (!pdfPreviewUrl) return;
        const a = document.createElement('a');
        a.href = pdfPreviewUrl;
        a.download = `Raport_${enrollment?.student?.user?.name || 'Siswa'}.pdf`;
        a.click();
    };

    const handlePublishRaport = async () => {
        setPublishing(true);
        const isPublished = !!enrollment?.raport_published_at;
        const toastId = toast.loading(isPublished ? 'Membatalkan publikasi...' : 'Menerbitkan raport...');
        try {
            const res = await axios.post(`/api/enrollments/${enrollmentId}/publish-raport`);
            setEnrollment((prev: any) => ({
                ...prev,
                raport_published_at: res.data.published ? new Date().toISOString() : null,
            }));
            toast.success(res.data.message, { id: toastId });
        } catch {
            toast.error('Gagal mengubah status raport', { id: toastId });
        } finally {
            setPublishing(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Memuat Raport...</div>;
    if (!studyClass || !enrollment) return <div className="p-8 text-center text-red-500">Data tidak ditemukan.</div>;

    // Siswa hanya bisa lihat jika sudah dipublish
    if (isSiswa && !enrollment.raport_published_at) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
                <Lock className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Raport Belum Tersedia</h2>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">Raport kamu belum diterbitkan oleh Sensei. Silakan tunggu notifikasi dari Sensei.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen py-8">
            <div className="max-w-[297mm] mx-auto mb-4 flex justify-between px-4 flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" /> Kembali</Button>
                <div className="flex items-center gap-2">
                    {/* Tombol Terbitkan Raport - hanya untuk Sensei */}
                    {isSensei && (
                        <Button
                            onClick={handlePublishRaport}
                            disabled={publishing}
                            variant={enrollment?.raport_published_at ? 'outline' : 'default'}
                            className={enrollment?.raport_published_at
                                ? 'border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                        >
                            {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
                                enrollment?.raport_published_at
                                    ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Diterbitkan — Batalkan</>  
                                    : <><Send className="w-4 h-4 mr-2" /> Terbitkan ke Siswa</>}
                        </Button>
                    )}
                    <Button onClick={handleDownload} disabled={!pdfPreviewUrl} className="bg-red-700 hover:bg-red-800 text-white">
                        {!pdfPreviewUrl ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memuat Preview...</> : <><Download className="w-4 h-4 mr-2" /> Download PDF</>}
                    </Button>
                </div>
            </div>

            <div className="max-w-[297mm] mx-auto bg-white shadow-xl min-h-[210mm] relative flex items-center justify-center overflow-hidden border border-gray-300">
                {pdfPreviewUrl ? (
                    <iframe src={`${pdfPreviewUrl}#view=FitH&toolbar=0&navpanes=0`} className="absolute inset-0 w-full h-full border-none" />
                ) : (
                    <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-2" />
                        <span>Membangun Preview PDF...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
