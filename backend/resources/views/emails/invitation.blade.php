<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Undangan Mirai Crown Indonesia</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #991b1b; /* Red 800 */
            color: #ffffff;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
        }
        .credentials {
            background-color: #f3f4f6; /* Gray 100 */
            border-left: 4px solid #dc2626; /* Red 600 */
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .credentials p {
            margin: 5px 0;
            font-family: monospace;
            font-size: 16px;
        }
        .btn-container {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            background-color: #dc2626; /* Red 600 */
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: bold;
            display: inline-block;
        }
        .footer {
            background-color: #f1f1f1;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #666666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Mirai Crown Indonesia</h1>
        </div>
        <div class="content">
            <p>Halo, <strong>{{ $name }}</strong>!</p>
            <p>Anda telah diundang untuk bergabung ke dalam portal sistem akademik LPK Mirai Crown Indonesia dengan peran sebagai <strong>{{ $role }}</strong>.</p>
            
            <p>Admin kami telah membuatkan akun untuk Anda. Berikut adalah detail akses login Anda:</p>
            
            <div class="credentials">
                <p><strong>Email:</strong> {{ $email }}</p>
                <p><strong>Password:</strong> {{ $password }}</p>
            </div>
            
            <div class="btn-container">
                <a href="{{ $loginUrl }}" class="btn">Klik untuk bergabung (Login)</a>
            </div>
            
            <p>Harap segera login dan kami menyarankan Anda untuk mengganti password default Anda di pengaturan profil setelah berhasil masuk demi alasan keamanan.</p>
            
            <p>Terima kasih,<br>Tim LPK Mirai Crown Indonesia</p>
        </div>
        <div class="footer">
            <p>Pesan ini dihasilkan secara otomatis. Mohon tidak membalas email ini.</p>
        </div>
    </div>
</body>
</html>
