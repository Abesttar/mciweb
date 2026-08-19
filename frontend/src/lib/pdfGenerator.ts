import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generateKwitansiPdf(data: {
    is_lunas: boolean;
    kwitansiNoRaw: string;
    studentName: string;
    amount: number;
    terbilangText: string;
    paymentDesc: string;
    payment_date: string;
}) {
    const templateName = data.is_lunas ? 'template-kwitansi-lunas.pdf' : 'template-kwitansi.pdf';
    const response = await fetch(`/${templateName}`);
    if (!response.ok) {
        throw new Error(`Template PDF ${templateName} tidak ditemukan!`);
    }
    const templateBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);

    // NOTE: Di sinilah letak penyesuaian font dan posisinya untuk Kwitansi
    const font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const black = rgb(0, 0, 0);

    // Nomor Kwitansi
    const kwitansiNo = data.kwitansiNoRaw.split('-').shift() || data.kwitansiNoRaw;
    page.drawText(kwitansiNo, { x: 260, y: 134, size: 10, font, color: black });

    // Telah terima dari
    page.drawText(data.studentName, { x: 78, y: 120, size: 10, font, color: black });

    // Uang sejumlah / terbilang
    page.drawText(data.terbilangText, { x: 78, y: 108.3, size: 10, font, color: black });

    // Untuk pembayaran
    page.drawText(data.paymentDesc, { x: 78, y: 97.7, size: 10, font, color: black, maxWidth: 200, lineHeight: 10.4 });

    // Total Rp
    const totalText = new Intl.NumberFormat('id-ID').format(data.amount);
    page.drawText(totalText, { x: 90, y: 57, size: 16, font: fontBold, color: black });

    // Tempat dan Tanggal
    const dateStr = new Date(data.payment_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    page.drawText(`Sukabumi, ${dateStr}`, { x: 260, y: 74, size: 6, font, color: black });

    return await pdfDoc.save();
}
