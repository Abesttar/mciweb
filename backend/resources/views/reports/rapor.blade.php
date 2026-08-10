<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rapor Akademik - {{ $student->user->name }}</title>
    <style>
        body { font-family: sans-serif; font-size: 14px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
        .header p { margin: 5px 0 0 0; }
        .info-table { width: 100%; margin-bottom: 30px; }
        .info-table td { padding: 5px; }
        .info-table .label { font-weight: bold; width: 120px; }
        .grades-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .grades-table th, .grades-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .grades-table th { background-color: #f8fafc; font-weight: bold; }
        .footer { margin-top: 50px; text-align: right; }
        .signature { margin-top: 60px; border-top: 1px solid #333; display: inline-block; padding-top: 5px; width: 200px; text-align: center; }
    </style>
</head>
<body>

    <div class="header">
        <h1>LPK Mirai Crown Indonesia</h1>
        <p>Rapor Akademik Peserta Didik</p>
    </div>

    <table class="info-table">
        <tr>
            <td class="label">Nama Siswa</td>
            <td>: {{ $student->user->name }}</td>
            <td class="label">Tanggal Cetak</td>
            <td>: {{ date('d F Y') }}</td>
        </tr>
        <tr>
            <td class="label">Batch</td>
            <td>: {{ $student->batch ? $student->batch->name : '-' }}</td>
            <td class="label">Kelas</td>
            <td>: {{ $student->studyClass ? $student->studyClass->name : '-' }}</td>
        </tr>
    </table>

    <table class="grades-table">
        <thead>
            <tr>
                <th>No</th>
                <th>Mata Pelajaran</th>
                <th>Nilai (Score)</th>
                <th>Tipe Ujian</th>
                <th>Keterangan</th>
            </tr>
        </thead>
        <tbody>
            @forelse($grades as $index => $grade)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $grade->subject->name }}</td>
                <td><strong>{{ $grade->score }}</strong></td>
                <td>{{ ucfirst($grade->type ?? '-') }}</td>
                <td>{{ $grade->remarks ?? '-' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="5" style="text-align: center;">Belum ada data nilai.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        <p>Mengetahui,</p>
        <p style="margin-bottom: 60px;">Kepala Sekolah / Sachou</p>
        <div class="signature">
            (..................................)
        </div>
    </div>

</body>
</html>
