import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase.js';
import { listDonations, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, FREQUENCY_LABEL } from '../api/donations.js';

const NAVY = [31, 43, 56];
const COFFEE = [138, 106, 74];
const MUTED = [102, 114, 125];

const usd = (cents) => '$' + (Number(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// =====================================================
// Reporte general: KPIs + tabla de últimas donaciones
// =====================================================
export async function exportReportPdf({ church, kpis, donations, filters }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.width;
  const margin = 40;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text(church?.legal_name || 'Iglesia', margin, margin + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const addr = church?.address || {};
  const addrLine = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
  if (addrLine) doc.text(addrLine, margin, margin + 26);
  if (church?.ein) doc.text(`EIN ${church.ein} · 501(c)(3)`, margin, margin + 40);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text('Reporte de donaciones', margin, margin + 70);

  // Period
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const period = filters?.dateStart && filters?.dateEnd
    ? `Periodo: ${filters.dateStart} a ${filters.dateEnd}`
    : 'Periodo: todos los registros';
  doc.text(period, margin, margin + 84);
  doc.text(`Generado: ${new Date().toLocaleString('es')}`, margin, margin + 96);

  // KPI grid
  const kpiY = margin + 120;
  const kpiW = (W - margin * 2 - 24) / 4;
  const kpiData = [
    { label: 'Total recibido', value: usd(kpis.totalCents) },
    { label: 'Total neto', value: usd(kpis.netCents) },
    { label: 'Donantes únicos', value: String(kpis.uniqueDonors) },
    { label: 'Top campaña', value: kpis.topCampaign?.name?.slice(0, 18) || '—' },
  ];
  kpiData.forEach((k, i) => {
    const x = margin + i * (kpiW + 8);
    doc.setFillColor(247, 248, 250);
    doc.roundedRect(x, kpiY, kpiW, 60, 6, 6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(k.label, x + 10, kpiY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(k.value, x + 10, kpiY + 42);
  });

  // Table
  autoTable(doc, {
    startY: kpiY + 80,
    head: [['Fecha', 'Donante', 'Fondo', 'Método', 'Estado', 'Monto']],
    body: donations.slice(0, 100).map((d) => [
      new Date(d.donation_date).toLocaleDateString('es'),
      d.donor_name_snapshot.slice(0, 28),
      d.fund?.name?.slice(0, 16) || '—',
      PAYMENT_METHOD_LABEL[d.payment_method] || d.payment_method,
      PAYMENT_STATUS_LABEL[d.payment_status] || d.payment_status,
      usd(d.amount_cents),
    ]),
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: [36, 48, 58] },
    alternateRowStyles: { fillColor: [247, 248, 250] },
    columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: margin, right: margin },
  });

  // Footer note
  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  if (donations.length > 100) {
    doc.text(`Mostrando primeras 100 de ${donations.length} donaciones. Exporta a Excel para ver todas.`, margin, finalY);
  }

  const name = `reporte-donaciones-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(name);
  return { filename: name, rowCount: donations.length };
}

// =====================================================
// Recibo de donación individual
// =====================================================
export async function exportReceiptPdf({ donation, receipt, deliveries, church }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.width;
  const margin = 60;

  // Logo placeholder (square)
  doc.setFillColor(...COFFEE);
  doc.roundedRect(margin, margin, 50, 50, 8, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  const initials = (church?.public_name || 'CR').split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  doc.text(initials, margin + 25, margin + 32, { align: 'center' });

  // Church header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(church?.legal_name || 'Iglesia', margin + 64, margin + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const addr = church?.address || {};
  const addrLine = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
  if (addrLine) doc.text(addrLine, margin + 64, margin + 32);
  if (church?.ein) doc.text(`EIN ${church.ein} · 501(c)(3) nonprofit organization`, margin + 64, margin + 44);

  // Receipt number block (right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Recibo', W - margin, margin + 18, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(receipt?.receipt_number || '—', W - margin, margin + 36, { align: 'right' });

  // Divider
  doc.setDrawColor(229, 232, 236);
  doc.line(margin, margin + 80, W - margin, margin + 80);

  // Donor
  let y = margin + 110;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('DONANTE', margin, y);
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(donation.donor_name_snapshot || '—', margin, y);
  if (donation.donor_email_snapshot) {
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(donation.donor_email_snapshot, margin, y);
  }

  y += 36;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('APORTE', margin, y);
  y += 16;

  // Amount (large)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...NAVY);
  doc.text(usd(donation.amount_cents), margin, y);
  y += 22;

  // Details table
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  const details = [
    ['Fondo', donation.fund?.name || '—'],
    ['Campaña', donation.campaign?.name || '—'],
    ['Método de pago', PAYMENT_METHOD_LABEL[donation.payment_method] || donation.payment_method],
    ['Frecuencia', FREQUENCY_LABEL[donation.frequency] || donation.frequency],
    ['Fecha', new Date(donation.donation_date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })],
  ];
  details.forEach(([label, value]) => {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, margin, y);
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(value, margin + 120, y);
    y += 18;
  });

  y += 16;

  // Optional message
  if (church?.receipt_default_message) {
    doc.setFillColor(247, 248, 250);
    doc.roundedRect(margin, y, W - margin * 2, 50, 6, 6, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(`"${church.receipt_default_message}"`, W - margin * 2 - 20);
    doc.text(lines, margin + 10, y + 20);
    y += 60;
  }

  // IRS disclaimer
  doc.setFillColor(251, 248, 244);
  doc.roundedRect(margin, y, W - margin * 2, 50, 6, 6, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(133, 102, 48);
  const disclaimer = church?.receipt_fiscal_notice || 'No se entregaron bienes ni servicios a cambio de esta contribución, excepto beneficios religiosos intangibles.';
  const dLines = doc.splitTextToSize(disclaimer, W - margin * 2 - 20);
  doc.text(dLines, margin + 10, y + 18);
  y += 70;

  // Signature
  if (church?.receipt_include_signature && church?.receipt_authorized_rep) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(...NAVY);
    const sigName = church.receipt_authorized_rep.split('·')[0]?.trim() || church.pastor_name || '';
    doc.text(sigName, margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(church.receipt_authorized_rep, margin, y);
  }

  const name = `recibo-${receipt?.receipt_number || donation.id.slice(0, 8)}.pdf`;
  doc.save(name);
  return { filename: name };
}
