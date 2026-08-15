"use client";

// CSV dışa aktarma. Excel'in Türkçe yerelinde doğru açılması için: UTF-8 BOM
// (aksi hâlde ş/ğ/ı bozuluyor) ve noktalı virgül ayırıcı (Excel'in TR yerelinde
// virgül ondalık ayırıcıdır, sütun ayırıcı değil).

const SEPARATOR = ";";
const BOM = "﻿";

function escapeCell(value: string | number): string {
  const text = String(value ?? "");
  if (text.includes(SEPARATOR) || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export interface CsvTable {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
}

export function buildCsv(tables: CsvTable[], meta: string[] = []): string {
  const lines: string[] = [];

  for (const line of meta) lines.push(escapeCell(line));
  if (meta.length > 0) lines.push("");

  for (const table of tables) {
    lines.push(escapeCell(table.title));
    lines.push(table.columns.map((column) => escapeCell(column.label)).join(SEPARATOR));
    for (const row of table.rows) {
      lines.push(table.columns.map((column) => escapeCell(row[column.key] ?? "")).join(SEPARATOR));
    }
    lines.push("");
  }

  return BOM + lines.join("\r\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
