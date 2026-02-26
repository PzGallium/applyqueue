"use strict";
/**
 * Apply MVP — render ResumeContent to HTML and export to PDF (Letter).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeContentToHtml = resumeContentToHtml;
exports.sanitizeFilenamePart = sanitizeFilenamePart;
exports.buildPdfFilename = buildPdfFilename;
exports.exportResumeToPdf = exportResumeToPdf;
const PAGE_FORMAT = 'Letter';
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function resumeContentToHtml(content) {
    const sections = [];
    sections.push(`<div class="section header"><h1>${escapeHtml(content.headline)}</h1><p class="summary">${escapeHtml(content.summary)}</p></div>`);
    if (content.experience.length > 0) {
        sections.push('<div class="section"><h2>Experience</h2>');
        for (const exp of content.experience) {
            sections.push(`<div class="block"><strong>${escapeHtml(exp.title)}</strong> — ${escapeHtml(exp.company)} <span class="date">${escapeHtml(exp.date)}</span></div>`);
            if (exp.bullets.length) {
                sections.push('<ul>');
                for (const b of exp.bullets) {
                    sections.push(`<li>${escapeHtml(b)}</li>`);
                }
                sections.push('</ul>');
            }
        }
        sections.push('</div>');
    }
    if (content.education.length > 0) {
        sections.push('<div class="section"><h2>Education</h2>');
        for (const ed of content.education) {
            const gpa = ed.gpa != null ? ` — GPA: ${escapeHtml(ed.gpa)}` : '';
            sections.push(`<div class="block">${escapeHtml(ed.school)} — ${escapeHtml(ed.degree)}${ed.major ? `, ${escapeHtml(ed.major)}` : ''} <span class="date">${escapeHtml(ed.date)}</span>${gpa}</div>`);
        }
        sections.push('</div>');
    }
    if (content.skills.length > 0) {
        sections.push(`<div class="section"><h2>Skills</h2><p>${content.skills.map((s) => escapeHtml(s)).join(', ')}</p></div>`);
    }
    if (content.projects.length > 0) {
        sections.push('<div class="section"><h2>Projects</h2>');
        for (const proj of content.projects) {
            sections.push(`<div class="block"><strong>${escapeHtml(proj.name)}</strong></div><p>${escapeHtml(proj.description)}</p>`);
            if (proj.highlights.length) {
                sections.push('<ul>');
                for (const h of proj.highlights) {
                    sections.push(`<li>${escapeHtml(h)}</li>`);
                }
                sections.push('</ul>');
            }
        }
        sections.push('</div>');
    }
    const body = sections.join('\n');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: Letter; margin: 0.75in; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.35; color: #222; margin: 0; padding: 0; }
    .section { page-break-inside: avoid; margin-bottom: 0.9em; }
    .header h1 { font-size: 18pt; margin: 0 0 0.25em 0; }
    .summary { margin: 0; }
    h2 { font-size: 12pt; margin: 0.5em 0 0.25em 0; border-bottom: 1px solid #333; padding-bottom: 2px; }
    .block { margin: 0.2em 0; }
    .date { color: #555; font-size: 10pt; }
    ul { margin: 0.25em 0; padding-left: 1.25em; }
    li { margin: 0.15em 0; }
  </style>
</head>
<body>${body}</body>
</html>`;
}
/**
 * Sanitize string for use in filename: replace / \ : * ? " < > | with underscore.
 */
function sanitizeFilenamePart(s) {
    return s.replace(/[/\\:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 80) || 'unknown';
}
/**
 * Build suggested PDF filename: {name}_{company}_{role}_{YYYYMMDD}.pdf
 */
function buildPdfFilename(displayName, company, role) {
    const name = sanitizeFilenamePart(displayName);
    const comp = sanitizeFilenamePart(company);
    const r = sanitizeFilenamePart(role);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${name}_${comp}_${r}_${date}.pdf`;
}
/**
 * Render ResumeContent to PDF buffer using Puppeteer. Uses Letter format.
 */
async function exportResumeToPdf(content, filename) {
    const html = resumeContentToHtml(content);
    // Dynamic import to avoid loading Puppeteer when only types are needed
    const puppeteer = await Promise.resolve().then(() => __importStar(require('puppeteer')));
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const buffer = (await page.pdf({
            format: PAGE_FORMAT,
            printBackground: true,
            margin: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
        }));
        return { buffer: Buffer.from(buffer), filename };
    }
    finally {
        await browser.close();
    }
}
//# sourceMappingURL=pdf-exporter.js.map