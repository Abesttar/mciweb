<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Alamat Email Diperbarui</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2c3e50;">LPK Mirai Crown Indonesia</h2>
        </div>
        
        <p>Konnichiwa, <strong>{{ $name }}</strong>!</p>
        
        <p>Kami ingin memberitahukan bahwa alamat email untuk akun Anda di sistem LPK Mirai Crown Indonesia telah berhasil diperbarui oleh Admin.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Alamat Email Baru:</strong> {{ $email }}</p>
        </div>
        
        <p>Mulai sekarang, silakan gunakan alamat email baru ini untuk login ke sistem kami.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $loginUrl }}" style="background-color: #e30a17; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Login ke Sistem
            </a>
        </div>
        
        <p>Jika Anda merasa tidak meminta perubahan ini, mohon segera hubungi Admin kami.</p>
        
        <p>Terima kasih,<br>
        Tim Admin LPK Mirai Crown Indonesia</p>
    </div>
</body>
</html>
