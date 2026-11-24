import { jsPDF } from 'jspdf';
import { showWat } from '../trips/trip-format';
import { amount } from './attempts';
import type { Receipt } from './receipt';

export async function buildReceipt(receipt: Receipt) {
  const response = await fetch('/fonts/DejaVuSans.ttf');
  if (!response.ok) throw new Error('Receipt font unavailable');
  const font = new Uint8Array(await response.arrayBuffer());
  const chunks: string[] = [];
  for (let i = 0; i < font.length; i += 8192)
    chunks.push(String.fromCharCode(...font.subarray(i, i + 8192)));
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  pdf.addFileToVFS('receipt.ttf', btoa(chunks.join('')));
  pdf.addFont('receipt.ttf', 'Receipt', 'normal');
  pdf.setFont('Receipt');
  pdf.setProperties({ title: 'Payment receipt ' + receipt.ticket, author: receipt.businessName });
  let y = 22;
  function lines(value: string, size: number, width: number, x = 22) {
    pdf.setFontSize(size);
    const text: string[] = pdf.splitTextToSize(value, width);
    for (const line of text) {
      if (y > 265) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(line, x, y);
      y += size * 0.48;
    }
  }
  function row(label: string, value: string) {
    pdf.setTextColor('#496057');
    lines(label, 9, 166);
    pdf.setTextColor('#162833');
    lines(value, 12, 166);
    y += 2;
  }
  pdf.setTextColor('#162833');
  lines(receipt.businessName, 21, 166);
  y += 2;
  lines('Payment receipt', 14, 166);
  pdf.setDrawColor('#8dbfa6');
  pdf.line(22, y, 188, y);
  y += 9;
  row('Ticket number · Paid', receipt.ticket);
  row('Passenger', receipt.passengerName);
  row('Journey', receipt.origin + ' → ' + receipt.destination);
  row('Departure', showWat(receipt.departureTime));
  row('Seat', receipt.seatNumber);
  row('Payment reference', receipt.reference);
  row(
    receipt.paidAt ? 'Payment time' : 'Payment confirmed',
    showWat(receipt.paidAt ?? receipt.confirmedAt),
  );
  if (y > 226) {
    pdf.addPage();
    y = 22;
  }
  for (const [label, kobo] of [
    ['Seat fare', receipt.fees.fareKobo],
    ['Processing fee', receipt.fees.platformFeeKobo + receipt.fees.processingFeeKobo],
    ['Total paid', receipt.fees.totalKobo],
  ] as const) {
    pdf.setFontSize(label === 'Total paid' ? 13 : 11);
    pdf.text(label, 22, y);
    pdf.text(amount(kobo), 188, y, { align: 'right' });
    y += 9;
  }
  pdf.setFontSize(9);
  pdf.setTextColor('#526169');
  pdf.text('Powered by eTransitBook', 22, 282);
  return pdf;
}
