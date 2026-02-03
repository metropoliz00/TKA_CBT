import React from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to format duration string "HH:mm:ss" or "mm:ss" to text "X Jam Y Menit Z Detik"
export const formatDurationToText = (duration: string) => {
    if (!duration || duration === '-' || duration === 'undefined') return '-';
    try {
        const parts = duration.split(':').map(p => parseInt(p, 10) || 0);
        let h = 0, m = 0, s = 0;
        if (parts.length === 3) { [h, m, s] = parts; } 
        else if (parts.length === 2) { [m, s] = parts; } 
        else { return duration; }
        
        const textParts = [];
        if (h > 0) textParts.push(`${h}h`);
        if (m > 0) textParts.push(`${m}m`);
        if (s > 0) textParts.push(`${s}s`);
        
        return textParts.length > 0 ? textParts.join(' ') : '0s';
    } catch (e) { return duration; }
};

// Helper: Score Predicate Logic
export const getScorePredicate = (score: number) => {
    if (score >= 86) return "Istimewa";
    if (score >= 71) return "Baik";
    if (score >= 56) return "Memadai";
    return "Kurang";
};

// Helper: Predicate Badge Component
export const getPredicateBadge = (score: number) => {
    const p = getScorePredicate(score);
    let color = "";
    switch (p) {
        case "Istimewa": color = "bg-purple-100 text-purple-700 border-purple-200"; break;
        case "Baik": color = "bg-emerald-100 text-emerald-700 border-emerald-200"; break;
        case "Memadai": color = "bg-yellow-100 text-yellow-700 border-yellow-200"; break;
        default: color = "bg-rose-100 text-rose-700 border-rose-200"; break;
    }
    return <span className={`px-2 py-1 rounded text-xs font-bold border ${color}`}>{p}</span>;
};

// Generic Export Function (Excel)
export const exportToExcel = (data: any[], fileName: string, sheetName: string = "Data") => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

// Generic Export Function (PDF) with Official Layout
export const exportToPDF = (
    title: string, 
    columns: string[], 
    rows: any[], 
    metaInfo?: { 
        school?: string; 
        kecamatan?: string; 
        signerName?: string;
    },
    customColumnStyles?: any
) => {
    // A4 Portrait
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // --- Header Section ---
    let currentY = 20;

    // Main Title (Centered) - Size 10
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 5;
    doc.setFontSize(9); // Subheader size 9
    doc.setFont("helvetica", "normal");
    
    // Sub Header (School & Kecamatan) - Centered below title
    if (metaInfo?.school || metaInfo?.kecamatan) {
        let subText = "";
        const s = metaInfo.school === 'all' || metaInfo.school === 'Semua Sekolah' ? 'SEMUA SEKOLAH' : metaInfo.school?.toUpperCase();
        const k = metaInfo.kecamatan === 'all' || metaInfo.kecamatan === 'Semua Kecamatan' ? 'SEMUA KECAMATAN' : metaInfo.kecamatan?.toUpperCase();
        
        subText = `SEKOLAH: ${s || '-'} | KECAMATAN: ${k || '-'}`;
        
        doc.text(subText, pageWidth / 2, currentY, { align: 'center' });
        currentY += 8;
    } else {
        currentY += 5;
    }

    // --- Table Section ---
    autoTable(doc, {
        head: [columns],
        body: rows,
        startY: currentY,
        theme: 'grid',
        headStyles: { 
            fillColor: [255, 255, 255], // White background
            textColor: [0, 0, 0],       // Black text
            fontStyle: 'bold',
            halign: 'center',           // Centered Header Text
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],       // Black border
            fontSize: 7                 // Header Font Size 8
        },
        bodyStyles: {
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0],
            font: "helvetica",          
            fontSize: 7,               // Body Font Size 8
            valign: 'middle'
        },
        styles: {
            cellPadding: 2,
            overflow: 'linebreak',
            fontSize: 7
        },
        columnStyles: customColumnStyles || {},
        alternateRowStyles: {
            fillColor: [255, 255, 255] // No alternate color (Standard Report)
        },
        margin: { top: 20, left: 15, right: 15, bottom: 20 },
        didDrawPage: (data: any) => {
            // Footer Page Number
            const str = 'Halaman ' + (doc as any).internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(str, data.settings.margin.left, pageHeight - 10);
        }
    });

    // --- Signature Section ---
    // Get Y position after table
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Check if enough space for signature (approx 35mm needed)
    if (finalY + 35 > pageHeight - 20) {
        doc.addPage();
        finalY = 20;
    }

    const dateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', 
        month: 'long', 
        year: 'numeric'
    });

    const signer = metaInfo?.signerName || ".........................";

    // Signature Box (Right Aligned)
    const rightMargin = 20;
    const signX = pageWidth - rightMargin - 40; // Approx center of signature block

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Tuban, ${dateStr}`, signX, finalY, { align: 'center' });
    finalY += 5;
    doc.text("Administrator", signX, finalY, { align: 'center' });
    
    finalY += 20; // Space for signature
    
    doc.setFont("helvetica", "bold");
    doc.text(`( ${signer} )`, signX, finalY, { align: 'center' });

    // Save
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${cleanTitle}.pdf`);
};

// Custom SVG Donut Chart
export const SimpleDonutChart = ({ data, size = 160 }: { data: { value: number, color: string, label?: string }[], size?: number }) => {
    const total = data.reduce((a, b) => a + b.value, 0);
    let cumulative = 0;
    const center = size / 2;
    const radius = (size - 40) / 2;
    const circumference = 2 * Math.PI * radius;
    return (
        <div className="relative flex items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                {data.map((item, i) => {
                    const percentage = total > 0 ? item.value / total : 0;
                    const dashArray = percentage * circumference;
                    const offset = cumulative * circumference;
                    cumulative += percentage;
                    return (
                        <circle key={i} cx={center} cy={center} r={radius} fill="transparent" stroke={item.color} strokeWidth="24" strokeDasharray={`${dashArray} ${circumference}`} strokeDashoffset={-offset} className="transition-all duration-1000 ease-out" />
                    );
                })}
                {total === 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth="24" />}
            </svg>
            <div className="absolute flex flex-col items-center"><span className="text-2xl font-bold text-slate-700">{total}</span><span className="text-xs text-slate-400 font-bold uppercase">Total</span></div>
        </div>
    );
};

export const DashboardSkeleton = () => (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
        {/* Header Skeleton */}
        <div className="space-y-3">
            <div className="h-4 w-48 bg-slate-200 rounded-full animate-pulse"></div>
            <div className="h-8 w-64 md:w-96 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div className="space-y-4">
                            <div className="h-3 w-24 bg-slate-100 rounded-full"></div>
                            <div className="h-10 w-20 bg-slate-200 rounded-lg"></div>
                        </div>
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
                    </div>
                    {/* Shimmer Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-shimmer"></div>
                </div>
            ))}
        </div>

        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto md:h-96">
            {/* Chart Area */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 col-span-1 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
                <div className="absolute top-6 left-6 h-4 w-32 bg-slate-100 rounded-full"></div>
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-full border-[12px] border-slate-100 relative">
                     <div className="absolute top-0 left-0 w-full h-full rounded-full border-t-[12px] border-indigo-100 animate-spin"></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-8 w-full px-8">
                     <div className="h-3 bg-slate-100 rounded-full w-full"></div>
                     <div className="h-3 bg-slate-100 rounded-full w-full"></div>
                     <div className="h-3 bg-slate-100 rounded-full w-full"></div>
                     <div className="h-3 bg-slate-100 rounded-full w-full"></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer"></div>
            </div>

            {/* Feed Area */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 col-span-1 lg:col-span-2 relative overflow-hidden min-h-[300px]">
                <div className="h-5 w-40 bg-slate-200 rounded-full mb-8"></div>
                <div className="space-y-6">
                    {[...Array(4)].map((_, j) => (
                        <div key={j} className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-100 rounded-full w-3/4"></div>
                                <div className="h-3 bg-slate-50 rounded-full w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent -translate-x-full animate-shimmer"></div>
            </div>
        </div>
    </div>
);