/**
 * Minimaler PDF-Generator (PDF 1.4, Helvetica, WinAnsi) für Demo-Dokumente –
 * ohne Abhängigkeiten, Umlaute werden als Oktal-Escapes ausgegeben.
 */

export interface IPdfBlock {
  kind: 'title' | 'subtitle' | 'heading' | 'text' | 'bullet' | 'spacer' | 'meta';
  text?: string;
}

const PAGE_W: number = 595;
const PAGE_H: number = 842;
const MARGIN: number = 56;

/** Zeichen für einen PDF-Stringliteral in WinAnsi kodieren (Latin-1-Bereich deckt Umlaute ab). */
function pdfString(value: string): string {
  let out: string = '';
  const map: Record<string, number> = { '–': 150, '—': 151, '«': 171, '»': 187, '•': 149, '’': 146, '„': 132, '“': 147, '”': 148, '€': 128 };
  for (let i = 0; i < value.length; i++) {
    const ch: string = value.charAt(i);
    let code: number = value.charCodeAt(i);
    if (map[ch] !== undefined) {
      code = map[ch];
    }
    if (ch === '(' || ch === ')' || ch === '\\') {
      out += '\\' + ch;
    } else if (code >= 32 && code < 127) {
      out += ch;
    } else if (code < 256) {
      out += '\\' + ('00' + code.toString(8)).slice(-3);
    } else {
      out += '?';
    }
  }
  return out;
}

/** Grobe Zeilenumbruchberechnung über die mittlere Zeichenbreite von Helvetica. */
function wrap(text: string, size: number, width: number): string[] {
  const maxChars: number = Math.floor(width / (size * 0.5));
  const words: string[] = text.split(/\s+/);
  const lines: string[] = [];
  let current: string = '';
  words.forEach(w => {
    if (!current) {
      current = w;
    } else if ((current + ' ' + w).length <= maxChars) {
      current += ' ' + w;
    } else {
      lines.push(current);
      current = w;
    }
  });
  if (current) {
    lines.push(current);
  }
  return lines;
}

export function buildPdf(blocks: IPdfBlock[], footer: string): ArrayBuffer {
  const pages: string[] = [];
  let ops: string[] = [];
  let y: number = PAGE_H - MARGIN;

  const newPage = (): void => {
    pages.push(ops.join('\n'));
    ops = [];
    y = PAGE_H - MARGIN;
  };
  const line = (text: string, font: string, size: number, x: number, color: string = '0.11 0.16 0.25'): void => {
    if (y < MARGIN + 30) {
      newPage();
    }
    ops.push(`BT ${color} rg /${font} ${size} Tf ${x} ${y} Td (${pdfString(text)}) Tj ET`);
    y -= size * 1.45;
  };

  // Kopfband
  ops.push(`0.12 0.43 0.70 rg 0 ${PAGE_H - 8} ${PAGE_W} 8 re f`);

  blocks.forEach(b => {
    const text: string = b.text || '';
    switch (b.kind) {
      case 'title':
        wrap(text, 20, PAGE_W - 2 * MARGIN).forEach(l => line(l, 'F2', 20, MARGIN));
        y -= 4;
        break;
      case 'subtitle':
        wrap(text, 11, PAGE_W - 2 * MARGIN).forEach(l => line(l, 'F1', 11, MARGIN, '0.36 0.40 0.46'));
        y -= 6;
        break;
      case 'meta':
        line(text, 'F1', 9, MARGIN, '0.36 0.40 0.46');
        break;
      case 'heading':
        y -= 8;
        line(text, 'F2', 13, MARGIN, '0.12 0.43 0.70');
        y -= 2;
        break;
      case 'text':
        wrap(text, 10.5, PAGE_W - 2 * MARGIN).forEach(l => line(l, 'F1', 10.5, MARGIN));
        y -= 4;
        break;
      case 'bullet':
        wrap(text, 10.5, PAGE_W - 2 * MARGIN - 16).forEach((l, i) => {
          if (i === 0) {
            ops.push(`BT 0.12 0.43 0.70 rg /F1 10.5 Tf ${MARGIN} ${y} Td (${pdfString('•')}) Tj ET`);
          }
          line(l, 'F1', 10.5, MARGIN + 14);
        });
        break;
      case 'spacer':
        y -= 10;
        break;
    }
  });
  pages.push(ops.join('\n'));

  // Fusszeile mit Seitenzahl
  const total: number = pages.length;
  const contents: string[] = pages.map((p, i) =>
    `${p}\nBT 0.36 0.40 0.46 rg /F1 8 Tf ${MARGIN} 30 Td (${pdfString(footer)}) Tj ET\n` +
    `BT 0.36 0.40 0.46 rg /F1 8 Tf ${PAGE_W - MARGIN - 50} 30 Td (${pdfString(`Seite ${i + 1} von ${total}`)}) Tj ET`);

  const objects: string[] = [];
  const add = (body: string): number => { objects.push(body); return objects.length; };
  const catalogId: number = add('');
  const pagesId: number = add('');
  const f1: number = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2: number = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds: number[] = contents.map(c => {
    const contentId: number = add(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
    return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contentId} 0 R >>`);
  });
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf: string = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref: number = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(o => { pdf += `${('0000000000' + o).slice(-10)} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const bytes: Uint8Array = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }
  return bytes.buffer;
}
