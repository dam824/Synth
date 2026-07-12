"use client";

import { signOut } from "next-auth/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Logo, ThemisMark } from "@/components/brand";
import { SITE_CONFIG } from "@/config/site";
import {
  DEFAULT_MODEL_ORDER,
  getModelChoice,
  isModelChoiceId,
  MODEL_CHOICES,
  type ModelChoiceId,
} from "@/lib/ai/model-catalog";
import type {
  ConfidenceLevel,
  JudgeResult,
  ProviderName,
  ReflectionMode,
} from "@/lib/ai/types";

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

interface SynthClientProps {
  userEmail: string;
  conversations: ConversationSummary[];
  isAdmin?: boolean;
  creditUsage: {
    planLabel: string;
    balance: number;
    monthlyAllowance: number;
    spentThisPeriod: number;
    estimatedSyntheses: number;
  };
}

interface ConvItem {
  id: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  projectId: string | null;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
}

type Phase = "empty" | "loading" | "answer" | "error";
type StepStatus = "idle" | "running" | "ok" | "fail";

interface ProviderStep {
  status: StepStatus;
  modelId?: ModelChoiceId;
  model?: string;
  latencyMs?: number;
  error?: string;
  content?: string;
}

interface ProviderView {
  provider: ProviderName;
  ok: boolean;
  model?: string;
  content?: string;
  error?: string;
  latencyMs: number;
}

interface FinalPayload {
  conversationId: string;
  final: JudgeResult;
  providers: ProviderView[];
}

// Un échange complet (question + réponse) dans le fil de conversation.
interface ThreadTurn {
  question: string;
  final: JudgeResult;
  providers?: ProviderView[];
}

interface ClarificationQuestion {
  id: string;
  label: string;
  options: string[];
}

interface ClientAttachment {
  kind: "image" | "text";
  name: string;
  mimeType: string;
  data: string;
  previewUrl?: string;
}

const PROVIDER_ORDER: ProviderName[] = ["openai", "anthropic", "gemini"];
const PROVIDER_LABEL: Record<ProviderName, string> = {
  openai: "GPT",
  anthropic: "Claude",
  gemini: "Gemini",
};
const MODEL_LABEL = Object.fromEntries(
  MODEL_CHOICES.map((model) => [model.id, model.shortLabel]),
) as Record<ModelChoiceId, string>;
const MODEL_SELECT_OPTIONS = MODEL_CHOICES.map((model) => ({
  id: model.id,
  label: `${model.family} · ${model.label}`,
}));

const STATUS_TEXT: Record<StepStatus, string> = {
  idle: "en attente",
  running: "réfléchit…",
  ok: "a répondu",
  fail: "indisponible",
};

const CONFIDENCE: Record<
  ConfidenceLevel,
  { label: string; className: string }
> = {
  high: {
    label: "Confiance élevée",
    className:
      "border-[rgba(43,245,168,.28)] bg-accent-soft text-accent-strong",
  },
  medium: {
    label: "Confiance modérée",
    className: "border-[#5a4a1e] bg-[#191407] text-[#e0b75a]",
  },
  low: {
    label: "À vérifier",
    className: "border-border bg-surface-soft text-muted-fg",
  },
};

const SPORT_NUTRITION_CLARIFICATIONS: ClarificationQuestion[] = [
  {
    id: "goal",
    label: "Objectif principal",
    options: ["Perdre du gras", "Prendre du muscle", "Me remettre en forme"],
  },
  {
    id: "level",
    label: "Niveau actuel",
    options: ["Débutant", "Intermédiaire", "Avancé"],
  },
  {
    id: "frequency",
    label: "Disponibilité",
    options: ["2-3 séances/semaine", "4 séances/semaine", "5+ séances/semaine"],
  },
  {
    id: "nutrition",
    label: "Nutrition",
    options: ["Équilibrage simple", "Perte de poids", "Prise de masse"],
  },
];
const MAX_ATTACHMENTS = 4;
const MAX_IMAGE_BYTES = 4_800_000;
const MAX_TEXT_BYTES = 240_000;
const SUPPORTED_TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

function shouldClarify(prompt: string): boolean {
  const text = prompt.toLowerCase();
  const asksForNaming =
    /(nom de marque|naming|proposition de nom|propositions de nom|idée de nom|idées de nom|liste de nom|marque|brand|branding|logo|slogan|positionnement)/.test(
      text,
    );
  if (asksForNaming) return false;

  const asksForProgram =
    /(programme|plan|routine|planning|séance|seance|entrainement|entraînement|nutrition|repas|diète|diete|calories|protéine|proteine|perdre du gras|prendre du muscle|remise en forme)/.test(
      text,
    );
  const sportContext =
    /(sport|muscu|musculation|fitness|course|cardio|nutrition|repas|diète|diete|calories|protéine|proteine)/.test(
      text,
    );
  const alreadySpecific =
    /(semaine|séance|seance|kg|kilo|taille|poids|objectif|débutant|intermédiaire|avancé|blessure|allergie)/.test(
      text,
    );
  return asksForProgram && sportContext && (!alreadySpecific || prompt.length < 180);
}

function buildClarifiedPrompt(
  prompt: string,
  answers: Record<string, string>,
): string {
  const details = SPORT_NUTRITION_CLARIFICATIONS.map((q) => {
    const answer = answers[q.id];
    return answer ? `- ${q.label} : ${answer}` : null;
  })
    .filter(Boolean)
    .join("\n");

  if (!details) return prompt;

  return `${prompt}

Précisions utilisateur :
${details}

Format attendu :
- programme structuré et actionnable ;
- tableau hebdomadaire si pertinent ;
- partie nutrition claire ;
- conseils de sécurité et adaptation.`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Convertit un Markdown léger (titres, tableaux, listes, citations, gras) en
// HTML stylé — pour un rendu PDF via impression navigateur.
// (Réutilise `inlineMarkdown` défini plus bas pour le formatage inline.)
function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let i = 0;
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };
  const parseRow = (l: string) =>
    l
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Tableau : ligne avec | suivie d'une ligne de séparation |---|---|
    if (
      /\|/.test(line) &&
      i + 1 < lines.length &&
      /\|/.test(lines[i + 1]) &&
      /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])
    ) {
      closeList();
      const header = parseRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== "") {
        rows.push(parseRow(lines[i]));
        i += 1;
      }
      out.push(
        "<table><thead><tr>" +
          header.map((h) => `<th>${inlineMarkdown(h)}</th>`).join("") +
          "</tr></thead><tbody>",
      );
      for (const r of rows) {
        out.push(
          "<tr>" +
            r.map((c) => `<td>${inlineMarkdown(c)}</td>`).join("") +
            "</tr>",
        );
      }
      out.push("</tbody></table>");
      continue;
    }

    if (trimmed === "") {
      closeList();
      i += 1;
      continue;
    }

    let m: RegExpMatchArray | null;
    if ((m = trimmed.match(/^#{2,3}\s+(.*)/))) {
      closeList();
      out.push(`<h2>${inlineMarkdown(m[1])}</h2>`);
      i += 1;
      continue;
    }
    if ((m = trimmed.match(/^#\s+(.*)/))) {
      closeList();
      out.push(`<h2>${inlineMarkdown(m[1])}</h2>`);
      i += 1;
      continue;
    }
    if ((m = trimmed.match(/^>\s?(.*)/))) {
      closeList();
      const buf = [m[1]];
      i += 1;
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      out.push(
        `<div class="callout">${buf.map((b) => inlineMarkdown(b)).join("<br>")}</div>`,
      );
      continue;
    }
    if ((m = trimmed.match(/^[-*]\s+(.*)/))) {
      if (!listOpen) {
        out.push("<ul>");
        listOpen = true;
      }
      out.push(`<li>${inlineMarkdown(m[1])}</li>`);
      i += 1;
      continue;
    }

    closeList();
    out.push(`<p>${inlineMarkdown(trimmed)}</p>`);
    i += 1;
  }
  closeList();
  return out.join("\n");
}

// Document HTML complet, stylé (bandeau vert, tableaux, encadrés), destiné à
// l'impression → PDF via le moteur Chrome du visiteur.
// Retire les emojis (qui s'impriment en carrés vides dans le PDF).
function stripEmoji(text: string): string {
  return text
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu,
      "",
    )
    .replace(/[ \t]{2,}/g, " ");
}

function buildStyledPrintDoc(
  title: string,
  _question: string,
  answerMarkdown: string,
): string {
  const body = renderMarkdownToHtml(stripEmoji(answerMarkdown));
  const cleanTitle = stripEmoji(title).trim();
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${escapeHtml(cleanTitle)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { font-family: "Georgia", "Times New Roman", serif; color: #1c2621; }
  .banner { background: linear-gradient(135deg, #0f2a1e 0%, #1f5132 100%); color: #fff; padding: 34px 40px 30px; }
  .banner .kicker { margin: 0 0 10px; font-family: -apple-system, "Segoe UI", Arial, sans-serif; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #7fe0b0; }
  .banner h1 { margin: 0; font-size: 30px; font-weight: 700; line-height: 1.15; letter-spacing: -0.01em; }
  .content { padding: 30px 40px 46px; }
  .content > p:first-child { font-size: 15px; color: #3a4a42; }
  .content h2 { color: #1f5132; font-family: -apple-system, "Segoe UI", Arial, sans-serif; font-size: 17px; font-weight: 700; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e3ede7; }
  .content p { font-size: 13.5px; line-height: 1.65; margin: 0 0 11px; }
  .content ul { margin: 0 0 14px; padding-left: 20px; }
  .content li { font-size: 13.5px; line-height: 1.6; margin-bottom: 6px; }
  strong { font-weight: 700; color: #17231d; }
  code { background: #eef2f0; padding: 1px 5px; border-radius: 4px; font-family: "SFMono-Regular", Menlo, monospace; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0 22px; font-family: -apple-system, "Segoe UI", Arial, sans-serif; font-size: 12.5px; box-shadow: 0 1px 0 #e3ede7; }
  th { background: #1f5132; color: #fff; text-align: left; padding: 11px 13px; font-weight: 600; }
  td { padding: 10px 13px; border-bottom: 1px solid #e6ece9; vertical-align: top; line-height: 1.5; }
  tbody tr:nth-child(even) { background: #f6f9f7; }
  .callout { background: #eef7f0; border-left: 4px solid #2e8b57; border-radius: 0 8px 8px 0; padding: 13px 16px; margin: 14px 0 18px; font-size: 13px; line-height: 1.55; color: #24382d; }
  .footer { margin: 0 40px; padding: 16px 0; color: #9aa8a1; font-family: -apple-system, "Segoe UI", Arial, sans-serif; font-size: 10.5px; letter-spacing: 0.04em; border-top: 1px solid #ecefed; }
  @page { margin: 13mm; }
  .banner, th, .callout, tbody tr:nth-child(even) { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>
  <div class="banner">
    <p class="kicker">${SITE_CONFIG.name} · La meilleure réponse</p>
    <h1>${escapeHtml(cleanTitle)}</h1>
  </div>
  <div class="content">${body}</div>
  <div class="footer">Document généré par ${SITE_CONFIG.name}</div>
</body></html>`;
}

function extractMarkdownTables(markdown: string): string[][][] {
  const lines = markdown.split("\n");
  const tables: string[][][] = [];
  let current: string[][] = [];

  for (const line of lines) {
    if (!line.trim().startsWith("|") || !line.includes("|")) {
      if (current.length > 0) tables.push(current);
      current = [];
      continue;
    }
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
    const isSeparator = cells.every((cell) => /^:?-{3,}:?$/.test(cell));
    if (!isSeparator) current.push(cells);
  }
  if (current.length > 0) tables.push(current);
  return tables;
}

function toCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    html.push(`<p>${paragraph.map(inlineMarkdown).join(" ")}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (list.length === 0) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    const line = raw.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("|") && line.includes("|")) {
      flushParagraph();
      flushList();
      const rows: string[][] = [];
      while (index < lines.length) {
        const tableLine = lines[index]?.trim() ?? "";
        if (!tableLine.startsWith("|") || !tableLine.includes("|")) {
          index -= 1;
          break;
        }
        const cells = tableLine
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());
        const separator = cells.every((cell) => /^:?-{3,}:?$/.test(cell));
        if (!separator) rows.push(cells);
        index += 1;
      }
      if (rows.length > 0) {
        const [head, ...body] = rows;
        html.push(
          `<table><thead><tr>${head
            .map((cell) => `<th>${inlineMarkdown(cell)}</th>`)
            .join("")}</tr></thead><tbody>${body
            .map(
              (row) =>
                `<tr>${row
                  .map((cell) => `<td>${inlineMarkdown(cell)}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}</tbody></table>`,
        );
      }
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const listItem = line.match(/^[-•]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return html.join("");
}

function buildPdfHtml(title: string, question: string, answer: string): string {
  return `<div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:794px;background:#ffffff;color:#111827;font-family:Inter,Arial,sans-serif;padding:62px 58px 70px;">
    <style>
      *{box-sizing:border-box}
      h1{font-size:34px;line-height:1.1;margin:0 0 16px;font-weight:800;color:#111827}
      h2{font-size:25px;line-height:1.18;margin:26px 0 10px;font-weight:800;color:#111827}
      h3{font-size:20px;line-height:1.25;margin:22px 0 9px;font-weight:800;color:#111827}
      p{font-size:15px;line-height:1.55;margin:0 0 13px;color:#111827}
      ul{font-size:15px;line-height:1.5;margin:8px 0 16px 20px;padding:0}
      li{margin:0 0 6px}
      table{width:100%;border-collapse:collapse;margin:13px 0 22px;font-size:13px;line-height:1.35}
      th{background:#111827;color:#ffffff;text-align:left;font-weight:800;padding:9px 10px;border:1px solid #d1d5db}
      td{padding:9px 10px;border:1px solid #d1d5db;vertical-align:top}
      tr:nth-child(even) td{background:#f3f4f6}
      code{background:#eef2f7;border-radius:4px;padding:1px 4px}
      .meta{font-size:14px;color:#374151;margin-bottom:18px}
      .note{background:#eef2f7;border-left:4px solid #111827;padding:12px 14px;margin:16px 0 20px;font-weight:700}
      .footer{margin-top:34px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:12px;color:#64748b}
    </style>
    <h1>${inlineMarkdown(title || `Document ${SITE_CONFIG.name}`)}</h1>
    <div class="meta">Question : ${inlineMarkdown(question || `Conversation ${SITE_CONFIG.name}`)}</div>
    <div class="note">Document généré depuis la dernière réponse ${SITE_CONFIG.name}.</div>
    ${markdownToHtml(answer)}
    <div class="footer">${SITE_CONFIG.name} export</div>
  </div>`;
}

const WIN_ANSI: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8a,
  "‹": 0x8b,
  "Œ": 0x8c,
  "Ž": 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  "š": 0x9a,
  "›": 0x9b,
  "œ": 0x9c,
  "ž": 0x9e,
  "Ÿ": 0x9f,
};

function winAnsiHex(value: string): string {
  return Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0);
      const byte =
        WIN_ANSI[char] ??
        (code >= 0x20 && code <= 0x7e ? code : code >= 0xa0 && code <= 0xff ? code : 0x3f);
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
}

function pdfText(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function wrapPdfText(text: string, maxWidth: number, fontSize: number): string[] {
  const maxChars = Math.max(18, Math.floor(maxWidth / (fontSize * 0.48)));
  const words = pdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

function createNativePdfBlob(title: string, question: string, answer: string): Blob {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 42;
  const contentWidth = pageWidth - marginX * 2;
  const pages: string[] = [""];
  let pageIndex = 0;
  let y = 778;

  function cmd(value: string) {
    pages[pageIndex] += `${value}\n`;
  }

  function addPage() {
    pages.push("");
    pageIndex = pages.length - 1;
    y = 778;
  }

  function ensure(height: number) {
    if (y - height < 70) addPage();
  }

  function fill(r: number, g: number, b: number, x: number, rectY: number, w: number, h: number) {
    cmd(`${r} ${g} ${b} rg ${x} ${rectY} ${w} ${h} re f`);
  }

  function stroke(r: number, g: number, b: number, x: number, rectY: number, w: number, h: number) {
    cmd(`${r} ${g} ${b} RG ${x} ${rectY} ${w} ${h} re S`);
  }

  function text(value: string, x: number, textY: number, size: number, bold = false, color = "0.067 0.094 0.153") {
    const font = bold ? "F2" : "F1";
    cmd(`BT /${font} ${size} Tf ${color} rg ${x} ${textY} Td <${winAnsiHex(value)}> Tj ET`);
  }

  function paragraph(value: string, size = 11.5, bold = false, x = marginX, width = contentWidth) {
    const lines = wrapPdfText(value, width, size);
    const lineHeight = size * 1.38;
    ensure(lines.length * lineHeight + 8);
    lines.forEach((line) => {
      text(line, x, y, size, bold);
      y -= lineHeight;
    });
    y -= 4;
  }

  function heading(value: string, level: number) {
    const size = level === 1 ? 19 : level === 2 ? 16 : 13.5;
    ensure(size * 1.6 + 8);
    y -= level === 1 ? 10 : 6;
    paragraph(value, size, true);
  }

  function table(rows: string[][]) {
    if (rows.length === 0) return;
    const cols = Math.min(4, Math.max(...rows.map((row) => row.length)));
    const colWidth = contentWidth / cols;
    const rowGap = 8;

    rows.forEach((row, rowIndex) => {
      const cellLines = Array.from({ length: cols }, (_, col) =>
        wrapPdfText(row[col] ?? "", colWidth - 12, 8.7),
      );
      const rowHeight = Math.max(24, Math.max(...cellLines.map((lines) => lines.length)) * 11 + 12);
      ensure(rowHeight + rowGap);
      const top = y + 6;
      const rectY = top - rowHeight;
      if (rowIndex === 0) {
        fill(0.067, 0.094, 0.153, marginX, rectY, contentWidth, rowHeight);
      } else if (rowIndex % 2 === 0) {
        fill(0.955, 0.965, 0.98, marginX, rectY, contentWidth, rowHeight);
      }
      stroke(0.82, 0.84, 0.87, marginX, rectY, contentWidth, rowHeight);
      for (let col = 1; col < cols; col += 1) {
        cmd(`0.82 0.84 0.87 RG ${marginX + colWidth * col} ${rectY} m ${marginX + colWidth * col} ${top} l S`);
      }
      cellLines.forEach((lines, col) => {
        lines.slice(0, 4).forEach((line, lineIndex) => {
          text(
            line,
            marginX + col * colWidth + 7,
            top - 14 - lineIndex * 11,
            8.7,
            rowIndex === 0,
            rowIndex === 0 ? "1 1 1" : "0.067 0.094 0.153",
          );
        });
      });
      y = rectY - rowGap;
    });
  }

  fill(0.95, 0.97, 0.98, marginX, 736, contentWidth, 40);
  text(title || `Document ${SITE_CONFIG.name}`, marginX, 790, 22, true);
  paragraph(`Question : ${question || `Conversation ${SITE_CONFIG.name}`}`, 10.5, false);
  y -= 2;
  paragraph(`Document généré depuis la dernière réponse ${SITE_CONFIG.name}.`, 10.5, true);

  const lines = answer.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    const line = raw.trim();
    if (!line) {
      y -= 8;
      continue;
    }

    if (line.startsWith("|") && line.includes("|")) {
      const rows: string[][] = [];
      while (index < lines.length) {
        const tableLine = lines[index]?.trim() ?? "";
        if (!tableLine.startsWith("|") || !tableLine.includes("|")) {
          index -= 1;
          break;
        }
        const cells = tableLine
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());
        const separator = cells.every((cell) => /^:?-{3,}:?$/.test(cell));
        if (!separator) rows.push(cells);
        index += 1;
      }
      table(rows);
      continue;
    }

    const matchHeading = line.match(/^(#{1,3})\s+(.+)$/);
    if (matchHeading) {
      heading(matchHeading[2], matchHeading[1].length);
      continue;
    }

    const matchList = line.match(/^[-•]\s+(.+)$/);
    if (matchList) {
      paragraph(`• ${matchList[1]}`, 11.2, false, marginX + 10, contentWidth - 10);
      continue;
    }

    paragraph(line);
  }

  pages.forEach((_, index) => {
    const footer = `BT /F1 9 Tf 0.39 0.45 0.55 rg ${marginX} 34 Td <${winAnsiHex(`${SITE_CONFIG.name} export`)}> Tj ET
BT /F1 9 Tf 0.39 0.45 0.55 rg 520 34 Td <${winAnsiHex(`Page ${index + 1}`)}> Tj ET`;
    pages[index] += footer;
  });

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  const fontRegularId = 3 + pages.length * 2;
  const fontBoldId = fontRegularId + 1;

  pages.forEach((content, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

async function createStyledPdfBlob(title: string, question: string, answer: string): Promise<Blob> {
  return createNativePdfBlob(title, question, answer);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipDateParts(date = new Date()) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, date: dosDate };
}

function writeU16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeU32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function createZipBlob(files: Array<{ name: string; content: string }>): Blob {
  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  const { time, date } = zipDateParts();
  let offset = 0;
  let centralSize = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    const local = new ArrayBuffer(30 + nameBytes.length);
    const localView = new DataView(local);
    writeU32(localView, 0, 0x04034b50);
    writeU16(localView, 4, 20);
    writeU16(localView, 6, 0x0800);
    writeU16(localView, 8, 0);
    writeU16(localView, 10, time);
    writeU16(localView, 12, date);
    writeU32(localView, 14, crc);
    writeU32(localView, 18, data.byteLength);
    writeU32(localView, 22, data.byteLength);
    writeU16(localView, 26, nameBytes.length);
    writeU16(localView, 28, 0);
    new Uint8Array(local, 30).set(nameBytes);

    parts.push(local, data);

    const central = new ArrayBuffer(46 + nameBytes.length);
    const centralView = new DataView(central);
    writeU32(centralView, 0, 0x02014b50);
    writeU16(centralView, 4, 20);
    writeU16(centralView, 6, 20);
    writeU16(centralView, 8, 0x0800);
    writeU16(centralView, 10, 0);
    writeU16(centralView, 12, time);
    writeU16(centralView, 14, date);
    writeU32(centralView, 16, crc);
    writeU32(centralView, 20, data.byteLength);
    writeU32(centralView, 24, data.byteLength);
    writeU16(centralView, 28, nameBytes.length);
    writeU16(centralView, 30, 0);
    writeU16(centralView, 32, 0);
    writeU16(centralView, 34, 0);
    writeU16(centralView, 36, 0);
    writeU32(centralView, 38, 0);
    writeU32(centralView, 42, offset);
    new Uint8Array(central, 46).set(nameBytes);
    centralParts.push(central);
    centralSize += central.byteLength;
    offset += local.byteLength + data.byteLength;
  });

  const centralOffset = offset;
  parts.push(...centralParts);

  const end = new ArrayBuffer(22);
  const endView = new DataView(end);
  writeU32(endView, 0, 0x06054b50);
  writeU16(endView, 4, 0);
  writeU16(endView, 6, 0);
  writeU16(endView, 8, files.length);
  writeU16(endView, 10, files.length);
  writeU32(endView, 12, centralSize);
  writeU32(endView, 16, centralOffset);
  writeU16(endView, 20, 0);
  parts.push(end);

  return new Blob(parts, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function excelColumn(index: number): string {
  let n = index + 1;
  let column = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    column = String.fromCharCode(65 + mod) + column;
    n = Math.floor((n - mod) / 26);
  }
  return column;
}

function sanitizeSheetName(name: string, fallback: string): string {
  const cleaned = name.replace(/[\]\\/*?:[\]]/g, " ").trim();
  return (cleaned || fallback).slice(0, 31);
}

function safeFilename(value: string, fallback: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || fallback
  );
}

function worksheetXml(rows: string[][]): string {
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const cols = Array.from(
    { length: columnCount },
    (_, index) =>
      `<col min="${index + 1}" max="${index + 1}" width="${index === 0 ? 24 : 42}" customWidth="1"/>`,
  ).join("");
  const sheetRows = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 1;
      const cells = row
        .map((value, colIndex) => {
          const ref = `${excelColumn(colIndex)}${r}`;
          const style = rowIndex === 0 ? ' s="1"' : "";
          return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${cols}</cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function xlsxWorkbookBlob(sheets: Array<{ name: string; rows: string[][] }>): Blob {
  const safeSheets = sheets.map((sheet, index) => ({
    name: sanitizeSheetName(sheet.name, `Feuille ${index + 1}`),
    rows: sheet.rows.length > 0 ? sheet.rows : [["Contenu"], [""]],
  }));
  const sheetDefs = safeSheets
    .map(
      (sheet, index) =>
        `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("");
  const sheetRels = safeSheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join("");
  const overrides = safeSheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");

  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${overrides}
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetDefs}</sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
</styleSheet>`,
    },
    ...safeSheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: worksheetXml(sheet.rows),
    })),
  ];

  return createZipBlob(files);
}

function buildWorkbookSheets(result: FinalPayload, question: string) {
  const answer = result.final.finalAnswer;
  const tables = extractMarkdownTables(answer);
  const summaryRows = [
    ["Champ", "Valeur"],
    ["Titre", result.final.title],
    ["Question", question],
    ["Confiance", result.final.confidence],
    ["Réponse", pdfText(answer)],
    ...result.final.keyPoints.map((point, index) => [
      `Point clé ${index + 1}`,
      pdfText(point),
    ]),
  ];

  const sheets = [{ name: "Synthèse", rows: summaryRows }];
  tables.forEach((table, index) => {
    sheets.push({
      name: `Tableau ${index + 1}`,
      rows: table.map((row) => row.map(pdfText)),
    });
  });
  return sheets;
}

function percent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

function inferTextMimeType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".json")) return "application/json";
  return "text/plain";
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getExportIntent(prompt: string): "pdf" | "xlsx" | null {
  const text = prompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const asksForDocumentAction =
    /(telecharg|download|dl|lien|export|genere|cree|fais|donne|renvoi|envoie|sort|refais|refaire|modifie|modifier|ameliore|ameliorer|mets|mettre|ajoute|ajouter|couleur|colore|forme|mise en forme|tableau|format)/.test(
      text,
    );
  const wantsPdf = /\b(pdf|imprimer|document|page|brochure|presentation)\b/.test(text);
  const wantsExcel = /\b(excel|xlsx|csv|tableur|feuille|classeur)\b/.test(text);
  if (!asksForDocumentAction && !wantsPdf && !wantsExcel) return null;
  if (wantsExcel) return "xlsx";
  if (wantsPdf) return "pdf";
  return null;
}

function initials(email: string): string {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[.\-_]/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (letters || name.slice(0, 2) || "?").toUpperCase();
}

function emptySteps(): Record<ProviderName, ProviderStep> {
  return {
    openai: { status: "idle" },
    anthropic: { status: "idle" },
    gemini: { status: "idle" },
  };
}

export function SynthClient({
  userEmail,
  conversations,
  isAdmin = false,
  creditUsage,
}: SynthClientProps) {
  const [question, setQuestion] = useState("");
  const [attachments, setAttachments] = useState<ClientAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("empty");
  const [steps, setSteps] = useState<Record<ProviderName, ProviderStep>>(
    emptySteps,
  );
  const [judging, setJudging] = useState<StepStatus | null>(null);
  const [result, setResult] = useState<FinalPayload | null>(null);
  // Échanges précédents affichés au-dessus de la réponse courante (fil complet).
  const [thread, setThread] = useState<ThreadTurn[]>([]);
  // Suggestion d'export quand le prompt demandait explicitement un PDF/Excel.
  const [pendingExport, setPendingExport] = useState<"pdf" | "xlsx" | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState(false);
  const [exportFile, setExportFile] = useState<{
    url: string;
    filename: string;
    label: string;
    type: "pdf" | "xlsx";
  } | null>(null);
  const [memoryNotice, setMemoryNotice] = useState<{
    totalTurns: number;
    includedTurns: number;
    truncated: boolean;
    shouldSuggestNewConversation: boolean;
  } | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  // Sidebar : conversations + projets gérés côté client.
  const [convos, setConvos] = useState<ConvItem[]>(() =>
    conversations.map((c) => ({
      id: c.id,
      title: c.title,
      pinned: false,
      archived: false,
      projectId: null,
      updatedAt: c.updatedAt,
    })),
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectError, setProjectError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [clarificationPrompt, setClarificationPrompt] = useState("");
  const [clarificationAnswers, setClarificationAnswers] = useState<
    Record<string, string>
  >({});
  const [clarificationOther, setClarificationOther] = useState<
    Record<string, string>
  >({});
  const [reflectionMode, setReflectionMode] =
    useState<ReflectionMode>("fast");
  const [modelOrder, setModelOrder] =
    useState<ModelChoiceId[]>(DEFAULT_MODEL_ORDER);
  const [activeModelOrder, setActiveModelOrder] =
    useState<ModelChoiceId[]>(DEFAULT_MODEL_ORDER);

  const abortRef = useRef<AbortController | null>(null);
  // Intention d'export détectée dans le prompt en cours (lue à la fin du run).
  const pendingExportRef = useRef<"pdf" | "xlsx" | null>(null);

  async function refreshSidebar() {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/conversations"),
        fetch("/api/projects"),
      ]);
      if (cRes.ok) setConvos((await cRes.json()).conversations ?? []);
      if (pRes.ok) setProjects((await pRes.json()).projects ?? []);
    } catch {
      /* hors-ligne : on garde l'état courant */
    }
  }

  useEffect(() => {
    refreshSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentPrompt = question.trim();
    if (
      clarificationPrompt &&
      currentPrompt &&
      currentPrompt !== clarificationPrompt &&
      !shouldClarify(currentPrompt)
    ) {
      setClarificationPrompt("");
      setClarificationAnswers({});
      setClarificationOther({});
    }
  }, [question, clarificationPrompt]);

  useEffect(() => {
    return () => {
      if (exportFile) URL.revokeObjectURL(exportFile.url);
    };
  }, [exportFile]);

  async function run(prompt: string) {
    // Empile la réponse courante dans le fil avant d'en lancer une nouvelle.
    if (result) {
      setThread((t) => [
        ...t,
        { question: askedQuestion, final: result.final, providers: result.providers },
      ]);
    }
    setAskedQuestion(prompt);
    setPhase("loading");
    setSteps(emptySteps());
    setActiveModelOrder(modelOrder);
    setJudging(null);
    setResult(null);
    setErrorMsg("");
    setMemoryNotice(null);
    setExportFile(null);
    // Mémorise si l'utilisateur a explicitement demandé un document exportable.
    pendingExportRef.current = getExportIntent(prompt);
    setPendingExport(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/synth/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          conversationId: activeConversationId,
          reflectionMode,
          modelOrder,
          attachments: attachments.map(({ previewUrl: _previewUrl, ...a }) => a),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setErrorMsg(
          data?.error ??
            "Impossible de générer une réponse pour le moment. Réessayez dans quelques instants.",
        );
        setPhase("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          handleEvent(JSON.parse(line));
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setPhase("empty");
        return;
      }
      setErrorMsg(
        "Impossible de générer une réponse pour le moment. Réessayez dans quelques instants.",
      );
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  }

  function handleEvent(ev: Record<string, unknown>) {
    switch (ev.type) {
      case "started":
        if (typeof ev.conversationId === "string") {
          setActiveConversationId(ev.conversationId);
        }
        if (Array.isArray(ev.modelOrder)) {
          const nextOrder = ev.modelOrder.filter(isModelChoiceId);
          if (nextOrder.length === DEFAULT_MODEL_ORDER.length) {
            setActiveModelOrder(nextOrder);
          }
        }
        setSteps(emptySteps());
        setJudging(null);
        if (
          ev.memory &&
          typeof ev.memory === "object" &&
          "shouldSuggestNewConversation" in ev.memory
        ) {
          setMemoryNotice(
            ev.memory as {
              totalTurns: number;
              includedTurns: number;
              truncated: boolean;
              shouldSuggestNewConversation: boolean;
            },
          );
        }
        break;
      case "provider_start": {
        const provider = ev.provider as ProviderName;
        setSteps((s) => ({
          ...s,
          [provider]: {
            status: "running",
            modelId: isModelChoiceId(ev.modelId) ? ev.modelId : undefined,
            model: typeof ev.model === "string" ? ev.model : undefined,
          },
        }));
        break;
      }
      case "provider_done": {
        const provider = ev.provider as ProviderName;
        setSteps((s) => ({
          ...s,
          [provider]: {
            status: ev.ok ? "ok" : "fail",
            modelId: isModelChoiceId(ev.modelId) ? ev.modelId : s[provider]?.modelId,
            model:
              typeof ev.model === "string"
                ? ev.model
                : s[provider]?.model,
            latencyMs: ev.latencyMs as number,
            error: ev.error as string | undefined,
            content: ev.content as string | undefined,
          },
        }));
        break;
      }
      case "judging":
        setJudging("running");
        break;
      case "final":
        setJudging("ok");
        setResult(ev as unknown as FinalPayload);
        setPhase("answer");
        setQuestion("");
        setAttachments([]);
        setAttachmentError("");
        // Le prompt demandait un document → propose l'export (bandeau discret).
        setPendingExport(pendingExportRef.current);
        // Rafraîchit la liste pour faire apparaître la nouvelle conversation.
        refreshSidebar();
        break;
      case "error":
        setErrorMsg(
          (ev.error as string) ??
            "Impossible de générer une réponse pour le moment.",
        );
        setPhase("error");
        break;
    }
  }

  function submit() {
    const q = question.trim() || (attachments.length > 0 ? "Analyse les pièces jointes." : "");
    if (!q || phase === "loading") return;
    // La touche Entrée envoie toujours la question. L'export PDF/Excel se fait
    // via les boutons dédiés (une demande contenant « PDF » reste une vraie
    // question, elle n'est pas détournée en téléchargement).
    const needsClarification = shouldClarify(q);
    if (needsClarification && clarificationPrompt !== q) {
      setClarificationPrompt(q);
      setClarificationAnswers({});
      setClarificationOther({});
      return;
    }
    if (!needsClarification && clarificationPrompt) {
      setClarificationPrompt("");
      setClarificationAnswers({});
      setClarificationOther({});
    }
    run(q);
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setAttachmentError("");
    const remaining = MAX_ATTACHMENTS - attachments.length;
    const selected = Array.from(files).slice(0, Math.max(0, remaining));
    if (selected.length < files.length) {
      setAttachmentError(`Limite : ${MAX_ATTACHMENTS} pièces jointes maximum.`);
    }

    const next: ClientAttachment[] = [];
    for (const file of selected) {
      if (file.type.startsWith("image/")) {
        if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
          setAttachmentError("Images acceptées : PNG, JPG, WEBP ou GIF.");
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          setAttachmentError("Image trop lourde. Limite : environ 4,8 Mo.");
          continue;
        }
        const dataUrl = await readAsDataUrl(file);
        const data = dataUrl.split(",")[1] ?? "";
        next.push({
          kind: "image",
          name: file.name,
          mimeType: file.type,
          data,
          previewUrl: dataUrl,
        });
        continue;
      }

      const mimeType = file.type || inferTextMimeType(file.name);
      if (!SUPPORTED_TEXT_TYPES.has(mimeType)) {
        setAttachmentError("Textes acceptés : TXT, MD, CSV ou JSON.");
        continue;
      }
      if (file.size > MAX_TEXT_BYTES) {
        setAttachmentError("Document texte trop lourd. Limite : environ 240 Ko.");
        continue;
      }
      next.push({
        kind: "text",
        name: file.name,
        mimeType,
        data: await file.text(),
      });
    }

    if (next.length > 0) {
      setAttachments((current) => [...current, ...next].slice(0, MAX_ATTACHMENTS));
    }
  }

  function removeAttachment(index: number) {
    setAttachments((current) => current.filter((_, i) => i !== index));
  }

  function selectClarification(questionId: string, value: string) {
    setClarificationAnswers((answers) => ({ ...answers, [questionId]: value }));
  }

  function useOtherClarification(questionId: string) {
    const value = clarificationOther[questionId]?.trim();
    if (!value) return;
    selectClarification(questionId, value);
  }

  function runWithClarifications() {
    const enriched = buildClarifiedPrompt(
      clarificationPrompt,
      clarificationAnswers,
    );
    setQuestion(enriched);
    setClarificationPrompt("");
    run(enriched);
  }

  function skipClarifications() {
    const prompt = clarificationPrompt;
    setClarificationPrompt("");
    run(prompt);
  }

  function publishDownload(
    blob: Blob,
    filename: string,
    label: string,
    type: "pdf" | "xlsx",
  ) {
    const url = URL.createObjectURL(blob);
    setExportFile((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { url, filename, label, type };
    });

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // PDF stylé : rendu HTML mis en forme → impression Chrome (« Enregistrer en
  // PDF »). Fidélité maximale, vectoriel, sans dépendance ni charge serveur.
  function printStyledPdf() {
    if (!result) return;
    const answer = [
      result.final.finalAnswer,
      result.final.keyPoints.length
        ? `\n## Points clés\n${result.final.keyPoints
            .map((point) => `- ${point}`)
            .join("\n")}`
        : "",
    ].join("\n");
    const doc = buildStyledPrintDoc(result.final.title, askedQuestion, answer);

    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    iframe.srcdoc = doc;
    iframe.onload = () => {
      const w = iframe.contentWindow;
      if (w) {
        w.focus();
        w.print();
      }
      setTimeout(() => iframe.remove(), 1500);
    };
    document.body.appendChild(iframe);
  }

  // Export PDF « natif » (téléchargement direct, mise en page basique).
  async function exportPdf() {
    if (!result) return;
    const answer = [
      result.final.finalAnswer,
      result.final.keyPoints.length
        ? `\nPoints clés\n${result.final.keyPoints
            .map((point) => `- ${point}`)
            .join("\n")}`
        : "",
    ].join("\n");
    const blob = await createStyledPdfBlob(result.final.title, askedQuestion, answer);
    publishDownload(
      blob,
      `${safeFilename(result.final.title, "synth-export")}.pdf`,
      "PDF prêt à télécharger",
      "pdf",
    );
  }

  function exportExcel() {
    if (!result) return;
    const blob = xlsxWorkbookBlob(buildWorkbookSheets(result, askedQuestion));
    publishDownload(
      blob,
      `${safeFilename(result.final.title, "synth-export")}.xlsx`,
      "Excel prêt à télécharger",
      "xlsx",
    );
  }

  function moveModel(modelId: ModelChoiceId, direction: -1 | 1) {
    setModelOrder((current) => {
      const index = current.indexOf(modelId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function setModelAt(index: number, modelId: ModelChoiceId) {
    setModelOrder((current) => {
      const existingIndex = current.indexOf(modelId);
      const next = [...current];
      if (existingIndex >= 0) {
        [next[index], next[existingIndex]] = [next[existingIndex], next[index]];
      } else {
        next[index] = modelId;
      }
      return next;
    });
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function openConversation(id: string) {
    abortRef.current?.abort();
    setMenuId(null);
    setActiveConversationId(id);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();

      const turns = Array.isArray(data.turns) ? data.turns : [];

      // Fil complet : tous les tours sauf le dernier s'affichent en historique.
      setThread(
        turns.slice(0, -1).map((t: ThreadTurn & { content: string }) => ({
          question: t.content,
          final: t.final,
          providers: t.providers,
        })),
      );

      // Dernier tour = réponse « courante » (avec repli legacy sur data.prompt).
      const current = turns.length ? turns[turns.length - 1] : data.prompt;

      if (!current || !current.final) {
        setThread([]);
        setPhase("empty");
        setResult(null);
        setAskedQuestion("");
        return;
      }

      const providers = (current.providers ?? []) as ProviderView[];
      const loadedOrder = providers
        .map((pv) => {
          const found = MODEL_CHOICES.find(
            (model) => model.provider === pv.provider,
          );
          return found?.id;
        })
        .filter(isModelChoiceId);
      const missingProviders = DEFAULT_MODEL_ORDER.filter(
        (p) => !loadedOrder.includes(p),
      );
      setActiveModelOrder([...loadedOrder, ...missingProviders]);
      const newSteps = emptySteps();
      for (const pv of providers) {
        newSteps[pv.provider] = {
          status: pv.ok ? "ok" : "fail",
          latencyMs: pv.latencyMs,
          error: pv.error,
          content: pv.content,
        };
      }
      setSteps(newSteps);

      setAskedQuestion(current.content);
      setResult({ conversationId: id, final: current.final, providers });
      setJudging("ok");
      setPhase("answer");
    } catch {
      setErrorMsg("Impossible de charger la conversation.");
      setPhase("error");
    }
  }

  function newQuestion(freshConversation = false) {
    abortRef.current?.abort();
    if (freshConversation) setActiveConversationId(null);
    setPhase("empty");
    setQuestion("");
    setAskedQuestion("");
    setResult(null);
    setThread([]);
    setErrorMsg("");
    setMemoryNotice(null);
    setPendingExport(null);
  }

  async function copyAnswer() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.final.finalAnswer);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  // ----- Actions de gestion des conversations -----

  async function patchConv(id: string, body: Partial<ConvItem>) {
    setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, ...body } : c)));
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  function togglePin(c: ConvItem) {
    setMenuId(null);
    patchConv(c.id, { pinned: !c.pinned });
  }

  function setArchived(c: ConvItem, archived: boolean) {
    setMenuId(null);
    patchConv(c.id, { archived });
    if (archived && activeConversationId === c.id) newQuestion(true);
  }

  function moveToProject(c: ConvItem, projectId: string | null) {
    setMenuId(null);
    patchConv(c.id, { projectId });
  }

  function startRename(c: ConvItem) {
    setMenuId(null);
    setRenameValue(c.title);
    setRenamingId(c.id);
  }

  function commitRename() {
    if (!renamingId) return;
    const value = renameValue.trim();
    if (value) patchConv(renamingId, { title: value });
    setRenamingId(null);
  }

  async function deleteConv(c: ConvItem) {
    setMenuId(null);
    if (!window.confirm("Supprimer définitivement cette conversation ?")) return;
    setConvos((cs) => cs.filter((x) => x.id !== c.id));
    if (activeConversationId === c.id) newQuestion(true);
    await fetch(`/api/conversations/${c.id}`, { method: "DELETE" }).catch(
      () => {},
    );
  }

  // Supprime tout l'historique de l'utilisateur (double confirmation).
  async function deleteAllHistory() {
    if (
      !window.confirm(
        "Supprimer DÉFINITIVEMENT tout votre historique de conversations ? Cette action est irréversible.",
      )
    )
      return;
    setPrivacyBusy(true);
    try {
      const res = await fetch("/api/me/history", { method: "DELETE" });
      if (res.ok) {
        setConvos([]);
        newQuestion(true);
        setSettingsOpen(false);
      }
    } finally {
      setPrivacyBusy(false);
    }
  }

  function openProjectDialog() {
    setProjectName("");
    setProjectError("");
    setProjectDialogOpen(true);
  }

  function closeProjectDialog() {
    setProjectDialogOpen(false);
    setProjectError("");
  }

  async function createProject() {
    const name = projectName.trim();
    if (!name) {
      setProjectError("Ajoutez un nom de projet.");
      return;
    }
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const { project } = await res.json();
        setProjects((ps) => [...ps, project]);
        closeProjectDialog();
      } else {
        setProjectError("Impossible de créer ce projet.");
      }
    } catch {
      setProjectError("Impossible de créer ce projet.");
    }
  }

  async function deleteProject(p: Project) {
    if (
      !window.confirm(
        `Supprimer le projet « ${p.name} » ? Les conversations seront conservées.`,
      )
    )
      return;
    setProjects((ps) => ps.filter((x) => x.id !== p.id));
    setConvos((cs) =>
      cs.map((c) => (c.projectId === p.id ? { ...c, projectId: null } : c)),
    );
    await fetch(`/api/projects/${p.id}`, { method: "DELETE" }).catch(() => {});
  }

  function openMenu(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({
      top: r.bottom + 4,
      left: Math.min(r.left - 200, window.innerWidth - 236),
    });
    setMenuId(menuId === id ? null : id);
  }

  const headerNote =
    phase === "answer"
      ? "Réponse prête"
      : phase === "loading"
        ? "Réflexion en cours…"
        : phase === "error"
          ? "Erreur"
          : "Prêt";

  const showComposer = phase !== "loading";

  const pinned = convos.filter((c) => c.pinned && !c.archived);
  const archivedList = convos.filter((c) => c.archived);
  const loose = convos.filter(
    (c) => !c.archived && !c.pinned && !c.projectId,
  );
  const menuConv = menuId ? convos.find((c) => c.id === menuId) : null;

  // Ligne de conversation (réutilisée dans chaque section).
  const renderConv = (c: ConvItem) => {
    if (renamingId === c.id) {
      return (
        <input
          key={c.id}
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setRenamingId(null);
          }}
          className="w-full rounded-[9px] border border-accent/40 bg-surface px-3 py-[9px] text-[13.5px] text-foreground outline-none"
        />
      );
    }
    return (
      <div key={c.id} className="group relative flex items-center">
        <button
          onClick={() => openConversation(c.id)}
          title={c.title}
          className={`flex-1 truncate rounded-[9px] border px-3 py-[9px] text-left text-[13.5px] leading-[1.35] transition ${
            activeConversationId === c.id
              ? "border-accent/35 bg-accent/[.08] text-foreground shadow-[inset_0_0_20px_rgba(43,245,168,.035)]"
              : "border-transparent text-muted-fg hover:bg-white/[.035] hover:text-foreground"
          }`}
        >
          {c.pinned && <span className="mr-2 text-[10px] text-accent">◆</span>}
          {c.title}
        </button>
        <button
          onClick={(e) => openMenu(e, c.id)}
          title="Options"
          className={`absolute right-1 flex h-7 w-7 items-center justify-center rounded-md text-faint transition hover:bg-white/[.08] hover:text-foreground ${
            menuId === c.id ? "flex" : "hidden group-hover:flex"
          }`}
        >
          <MoreIcon />
        </button>
      </div>
    );
  };

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="synth-orbs" />
      {/* Sidebar */}
      <aside className="synth-scroll relative z-10 m-2 hidden w-[288px] flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-accent/20 bg-[rgba(4,13,9,.86)] shadow-[inset_0_1px_0_rgba(255,255,255,.025),0_18px_70px_-42px_rgba(43,245,168,.45)] backdrop-blur-xl lg:flex">
        <div className="space-y-3 px-[14px] pb-4 pt-[14px]">
          <button
            onClick={() => newQuestion(true)}
            className="flex h-[44px] w-full items-center justify-center gap-1 rounded-xl bg-primary px-[14px] text-[14px] font-semibold tracking-[-0.01em] text-primary-fg shadow-[0_0_26px_-8px_rgba(43,245,168,.8)] transition hover:-translate-y-px hover:brightness-105"
          >
            <span className="text-[17px] font-normal leading-none">+</span>{" "}
            Nouvelle question
          </button>
          <button
            onClick={openProjectDialog}
            className="flex h-[40px] w-full items-center gap-[7px] rounded-xl border border-white/[.1] bg-black/10 px-[12px] text-[13px] font-medium text-muted-fg transition hover:border-accent/25 hover:bg-accent/[.035] hover:text-foreground"
          >
            <span className="text-[15px] leading-none">+</span> Nouveau projet
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[14px] pb-6">
          {/* Épinglées */}
          {pinned.length > 0 && (
            <Section title="ÉPINGLÉES">{pinned.map(renderConv)}</Section>
          )}

          {/* Projets */}
          {projects.length > 0 && (
            <Section title="PROJETS">
              {projects.map((p) => {
                const items = convos.filter(
                  (c) => c.projectId === p.id && !c.archived && !c.pinned,
                );
                return (
                  <div key={p.id} className="group/proj mb-1">
                    <div className="flex h-9 items-center justify-between rounded-lg px-3 text-[13.5px] text-muted-fg transition hover:bg-white/[.035] hover:text-foreground">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-accent/60 bg-accent/[.08]" />
                        <span className="truncate">{p.name}</span>
                      </span>
                      <button
                        onClick={() => deleteProject(p)}
                        title="Supprimer le projet"
                        className="hidden h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-danger-bg hover:text-danger-fg group-hover/proj:flex"
                      >
                        ×
                      </button>
                    </div>
                    {items.length > 0 && (
                      <div className="ml-5 border-l border-white/[.06] pl-1">
                        {items.map(renderConv)}
                      </div>
                    )}
                  </div>
                );
              })}
            </Section>
          )}

          {/* Récentes */}
          <Section title="RÉCENTES">
            {loose.length === 0 ? (
              <p className="px-3 text-[13px] text-faint">Aucune question.</p>
            ) : (
              loose.map(renderConv)
            )}
          </Section>

          {/* Archivées */}
          {archivedList.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-1 font-mono text-[11px] tracking-[0.04em] text-faint hover:text-muted-fg"
              >
                <span>ARCHIVÉES ({archivedList.length})</span>
                <span>{showArchived ? "▾" : "▸"}</span>
              </button>
              {showArchived && archivedList.map(renderConv)}
            </div>
          )}
        </div>

        <div className="mx-[14px] border-t border-white/[.07] py-3">
          <div className="mb-3 flex h-10 w-full items-center justify-between rounded-xl border border-accent/30 bg-accent/[.045] px-3 transition hover:bg-accent/[.075]">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex min-w-0 items-center gap-2 text-left"
            >
              <span className="text-[13px] font-semibold tabular-nums text-accent">
                {creditUsage.balance.toLocaleString("fr-FR")}
              </span>
              <span className="truncate text-[12px] text-faint">crédits</span>
            </button>
            <a
              href="/tarifs"
              className="text-[12px] font-semibold text-accent transition hover:text-accent-strong"
            >
              Recharger
            </a>
          </div>
          {isAdmin && (
            <a
              href="/admin"
              className="mb-2 flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-[13px] font-medium text-muted-fg transition hover:border-[rgba(43,245,168,.4)] hover:text-accent-strong"
            >
              <span aria-hidden>🛡</span> Panneau admin
            </a>
          )}
          <div className="flex items-center justify-between px-1">
            <div className="flex min-w-0 items-center gap-[9px]">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-accent/45 bg-accent/[.12] text-[12px] font-semibold text-accent-strong">
                {initials(userEmail)}
              </span>
              <span className="truncate text-[13px] text-muted-fg">
                {userEmail}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSettingsOpen(true)}
                title="Paramètres et utilisation"
                className="flex h-8 w-8 items-center justify-center rounded-md text-faint transition hover:bg-white/[.05] hover:text-accent"
              >
                <GearIcon />
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                title="Déconnexion"
                className="flex h-8 w-8 items-center justify-center rounded-md text-faint transition hover:bg-white/[.05] hover:text-foreground"
              >
                <PowerIcon />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="synth-scroll relative z-10 flex flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[rgba(43,245,168,.12)] bg-[rgba(8,12,11,.55)] px-6 py-[14px] backdrop-blur-xl">
          <Logo size={15} />
          <span className="font-mono text-[11px] text-faint">{headerNote}</span>
        </header>

        {phase === "empty" ? (
          <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-6 pb-10 pt-6">
            <div className="animate-synth-rise flex flex-1 flex-col items-center justify-center py-[30px] text-center">
              <div className="glass-accent animate-synth-float mb-5 flex h-[46px] w-[46px] items-center justify-center rounded-[13px] shadow-glow">
                <ThemisMark size={30} glow />
              </div>
              <h1 className="m-0 mb-[9px] text-[26px] font-semibold tracking-[-0.02em]">
                Que voulez-vous savoir ?
              </h1>
              <p className="m-0 max-w-[380px] text-[15.5px] leading-[1.5] text-muted-fg">
                Posez une question. {SITE_CONFIG.name} confronte les pistes et vous rend la
                meilleure réponse.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-[1100px] flex-1 grid-cols-1 gap-8 px-6 pb-10 pt-6 lg:grid-cols-[1fr_330px]">
            {/* Colonne principale */}
            <div className="min-w-0">
              {/* Fil : échanges précédents de la conversation */}
              {thread.length > 0 && (
                <div className="mb-8 space-y-8 border-b border-white/[.06] pb-8">
                  {thread.map((turn, ti) => (
                    <div key={ti} className="animate-synth-rise">
                      <div className="glass-soft mb-4 flex items-start gap-[11px] rounded-[13px] px-[17px] py-[13px]">
                        <span className="pt-[2px] font-mono text-[12px] text-faint">
                          Q
                        </span>
                        <span className="text-[15px] leading-[1.5] text-[#C6D2CB]">
                          {turn.question}
                        </span>
                      </div>
                      <div className="mb-2 flex flex-wrap items-center gap-[9px]">
                        <span
                          className={`inline-flex items-center gap-[6px] rounded-full border px-[11px] py-[4px] text-[11.5px] font-semibold ${
                            CONFIDENCE[turn.final.confidence].className
                          }`}
                        >
                          ● {CONFIDENCE[turn.final.confidence].label}
                        </span>
                      </div>
                      {turn.final.title && (
                        <h3 className="m-0 mb-2 text-[18px] font-semibold leading-[1.3] tracking-[-0.01em] text-foreground">
                          {turn.final.title}
                        </h3>
                      )}
                      <div className="whitespace-pre-wrap text-[15px] leading-[1.6] text-[#B8C5BD]">
                        {turn.final.finalAnswer}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {phase === "loading" && (
                <div className="flex flex-1 flex-col items-center justify-center py-[40px] text-center">
                  <div className="mb-[22px] flex items-center gap-[7px]">
                    {[0, 0.2, 0.4].map((d) => (
                      <span
                        key={d}
                        className="animate-synth-pulse h-[9px] w-[9px] rounded-full bg-accent shadow-glow"
                        style={{ animationDelay: `${d}s` }}
                      />
                    ))}
                  </div>
                  <p className="m-0 mb-5 text-[17px] font-medium text-foreground">
                    {SITE_CONFIG.name} confronte les pistes…
                  </p>
                  <div className="relative mb-6 h-[3px] w-[260px] overflow-hidden rounded-full bg-[linear-gradient(90deg,transparent,rgba(43,245,168,.1)_16%,rgba(43,245,168,.18)_50%,rgba(43,245,168,.1)_84%,transparent)]">
                    <span className="animate-synth-bar absolute left-0 top-0 h-full w-[46%] rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(43,245,168,.35)_18%,#2bf5a8_50%,rgba(43,245,168,.35)_82%,transparent_100%)] shadow-[0_0_12px_rgba(43,245,168,.95),0_0_28px_rgba(43,245,168,.45)]" />
                  </div>
                  <button
                    onClick={stop}
                    className="h-[38px] rounded-md border border-border px-[18px] text-[13.5px] font-medium text-muted-fg transition hover:border-danger-border hover:text-danger-fg"
                  >
                    Arrêter
                  </button>
                </div>
              )}

              {phase === "error" && (
                <div className="animate-synth-rise flex flex-1 flex-col items-center justify-center py-[40px] text-center">
                  <div className="w-full max-w-[440px] rounded-xl border border-danger-border bg-danger-bg p-6">
                    <h2 className="m-0 mb-2 text-[17px] font-semibold text-danger-fg">
                      Une erreur est survenue
                    </h2>
                    <p className="m-0 mb-5 text-[14.5px] leading-[1.55] text-muted-fg">
                      {errorMsg}
                    </p>
                    <button
                      onClick={() => {
                        setQuestion(askedQuestion);
                        setPhase("empty");
                      }}
                      className="h-[42px] rounded-md border border-border bg-white/[.04] px-[18px] text-[14px] font-semibold text-foreground transition hover:bg-white/[.07]"
                    >
                      Réessayer
                    </button>
                  </div>
                </div>
              )}

              {phase === "answer" && result && (
                <div className="animate-synth-rise">
                  <div className="glass-soft mb-[22px] flex items-start gap-[11px] rounded-[13px] px-[17px] py-[15px]">
                    <span className="pt-[2px] font-mono text-[12px] text-faint">
                      Q
                    </span>
                    <span className="text-[15.5px] leading-[1.5] text-[#C6D2CB]">
                      {askedQuestion}
                    </span>
                  </div>

                  <div className="mb-[14px] flex flex-wrap items-center gap-[9px]">
                    <span
                      className={`inline-flex items-center gap-[6px] rounded-full border px-[11px] py-[5px] text-[12px] font-semibold ${
                        CONFIDENCE[result.final.confidence].className
                      }`}
                    >
                      ● {CONFIDENCE[result.final.confidence].label}
                    </span>
                    <span className="font-mono text-[11px] text-faint">
                      Réponse synthétisée
                    </span>
                  </div>

                  {memoryNotice?.shouldSuggestNewConversation ? (
                    <div className="mb-5 rounded-xl border border-[rgba(43,245,168,.22)] bg-accent/[.06] px-4 py-3">
                      <p className="m-0 text-[14px] leading-[1.5] text-[#C8F7E4]">
                        Cette conversation commence à être longue. {SITE_CONFIG.name} garde
                        le contexte utile, mais un nouveau fil donnera de
                        meilleures réponses pour un autre sujet.
                      </p>
                      <button
                        onClick={() => newQuestion(true)}
                        className="mt-3 h-9 rounded-md border border-accent/30 px-3 text-[13px] font-semibold text-accent transition hover:bg-accent/[.1]"
                      >
                        Ouvrir une nouvelle conversation
                      </button>
                    </div>
                  ) : null}

                  <h1 className="m-0 mb-4 text-[23px] font-semibold leading-[1.25] tracking-[-0.02em] text-foreground">
                    {result.final.title}
                  </h1>

                  <div className="text-[16px] leading-[1.65] text-[#B8C5BD]">
                    <p className="m-0 mb-4 whitespace-pre-wrap">
                      {result.final.finalAnswer}
                    </p>

                    {result.final.keyPoints.length > 0 && (
                      <>
                        <p className="m-0 mb-2 text-[15px] font-semibold text-foreground">
                          Points clés
                        </p>
                        <ul className="m-0 mb-5 list-disc pl-5 text-muted-fg">
                          {result.final.keyPoints.map((p, i) => (
                            <li key={i} className="mb-[7px]">
                              {p}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  {result.final.disagreements.length > 0 && (
                    <details className="mb-6 rounded-lg border border-border bg-surface-soft px-4 py-[14px]">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] font-medium text-muted-fg">
                        <span className="text-accent">◇</span> Une nuance a été
                        retenue
                      </summary>
                      <div className="mt-3 space-y-2 text-[14.5px] leading-[1.55] text-muted-fg">
                        {result.final.disagreements.map((d, i) => (
                          <p key={i} className="m-0">
                            {d}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Suggestion d'export : le prompt demandait un document. */}
                  {pendingExport && (
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[rgba(43,245,168,.28)] bg-accent/[.06] px-4 py-3">
                      <div className="flex items-center gap-[10px]">
                        <span className="text-accent">
                          {pendingExport === "pdf" ? "📄" : "▦"}
                        </span>
                        <span className="text-[14px] text-foreground">
                          Votre {pendingExport === "pdf" ? "PDF" : "fichier Excel"}{" "}
                          est prêt.
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          pendingExport === "pdf"
                            ? printStyledPdf()
                            : exportExcel()
                        }
                        className="h-9 rounded-md bg-primary px-4 text-[13.5px] font-semibold text-primary-fg shadow-glow transition hover:opacity-90"
                      >
                        Ouvrir
                      </button>
                    </div>
                  )}

                  <div className="flex gap-[9px]">
                    <button
                      onClick={() => newQuestion(true)}
                      className="h-[42px] rounded-md border border-border bg-white/[.04] px-[18px] text-[14px] font-semibold text-foreground transition hover:bg-white/[.07]"
                    >
                      Nouveau fil
                    </button>
                    <button
                      onClick={printStyledPdf}
                      className="h-[42px] rounded-md border border-border bg-white/[.04] px-[16px] text-[14px] font-medium text-muted-fg transition hover:border-accent/30 hover:bg-accent/[.08] hover:text-foreground"
                    >
                      Télécharger PDF
                    </button>
                    <button
                      onClick={exportExcel}
                      className="h-[42px] rounded-md border border-border bg-white/[.04] px-[16px] text-[14px] font-medium text-muted-fg transition hover:border-accent/30 hover:bg-accent/[.08] hover:text-foreground"
                    >
                      Télécharger Excel
                    </button>
                    {exportFile ? (
                      <a
                        href={exportFile.url}
                        download={exportFile.filename}
                        className="inline-flex h-[42px] items-center rounded-md border border-accent/30 bg-accent/[.08] px-[16px] text-[14px] font-semibold text-accent transition hover:bg-accent/[.14]"
                      >
                        {exportFile.label}
                      </a>
                    ) : null}
                    <button
                      onClick={copyAnswer}
                      className="h-[42px] rounded-md px-[18px] text-[14px] font-medium text-muted-fg transition hover:text-foreground"
                    >
                      {toast ? "Réponse copiée." : "Copier la réponse"}
                    </button>
                  </div>
                  {exportFile ? (
                    <div className="mt-4 rounded-xl border border-accent/20 bg-accent/[.06] px-4 py-3 text-[14px] text-[#C8F7E4]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>
                          Votre {exportFile.type === "pdf" ? "PDF" : "Excel"} est prêt.
                        </span>
                        <a
                          href={exportFile.url}
                          download={exportFile.filename}
                          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-[13px] font-semibold text-primary-fg shadow-glow transition hover:opacity-90"
                        >
                          Télécharger
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <DeliberationPanel
              question={askedQuestion}
              modelOrder={activeModelOrder}
              steps={steps}
              judging={judging}
              result={result}
            />
          </div>
        )}

        {showComposer && (
          <div className="sticky bottom-0 bg-gradient-to-t from-background from-70% to-transparent px-6 pb-[22px] pt-[14px]">
            <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-8 lg:grid-cols-[1fr_330px]">
              <div className="min-w-0">
                {phase === "answer" && activeConversationId ? (
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <span className="text-[12.5px] text-faint">
                      Continuez cette conversation, ou démarrez un nouveau fil.
                    </span>
                    <button
                      type="button"
                      onClick={() => newQuestion(true)}
                      className="text-[12.5px] font-medium text-accent transition hover:text-accent-strong"
                    >
                      Nouveau fil
                    </button>
                  </div>
                ) : null}
              <div className="glass rounded-xl p-2 focus-within:border-[rgba(43,245,168,.5)]">
                {clarificationPrompt ? (
                  <div className="mb-2 rounded-xl border border-[rgba(43,245,168,.2)] bg-accent/[.055] p-3">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="m-0 mb-1 font-mono text-[11px] tracking-[0.08em] text-accent">
                          PRÉCISIONS UTILES
                        </p>
                        <p className="m-0 text-[14px] leading-[1.4] text-[#C8F7E4]">
                          {SITE_CONFIG.name} peut affiner le programme avec ces réponses.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setClarificationPrompt("")}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-faint transition hover:bg-white/[.05] hover:text-foreground"
                        aria-label="Fermer"
                      >
                        ×
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {SPORT_NUTRITION_CLARIFICATIONS.map((item) => (
                        <div key={item.id}>
                          <p className="m-0 mb-2 text-[12.5px] font-semibold text-foreground">
                            {item.label}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {item.options.map((option) => {
                              const active =
                                clarificationAnswers[item.id] === option;
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() =>
                                    selectClarification(item.id, option)
                                  }
                                  className={`rounded-full border px-2.5 py-1 text-[12px] transition ${
                                    active
                                      ? "border-accent/60 bg-accent text-primary-fg"
                                      : "border-border bg-surface-soft text-muted-fg hover:border-accent/30 hover:bg-accent/[.08] hover:text-foreground"
                                  }`}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-2 flex gap-1.5">
                            <input
                              value={clarificationOther[item.id] ?? ""}
                              onChange={(e) =>
                                setClarificationOther((values) => ({
                                  ...values,
                                  [item.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  useOtherClarification(item.id);
                                }
                              }}
                              placeholder="Autre..."
                              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background/60 px-2 text-[12.5px] text-foreground outline-none placeholder:text-faint focus:border-accent/50"
                            />
                            <button
                              type="button"
                              onClick={() => useOtherClarification(item.id)}
                              className="h-8 rounded-md border border-border px-2 text-[12px] text-muted-fg transition hover:border-accent/30 hover:text-foreground"
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={skipClarifications}
                        className="h-9 rounded-md border border-border px-3 text-[13px] font-medium text-muted-fg transition hover:bg-white/[.04] hover:text-foreground"
                      >
                        Ignorer
                      </button>
                      <button
                        type="button"
                        onClick={runWithClarifications}
                        className="h-9 rounded-md bg-primary px-4 text-[13px] font-semibold text-primary-fg shadow-glow transition hover:opacity-90"
                      >
                        Générer avec ces choix
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[.06] px-2 pb-2 pt-1">
                  <div className="flex rounded-lg border border-border bg-surface-soft p-1">
                    {(
                      [
                        ["fast", "Rapide"],
                        ["deep", "Profond"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setReflectionMode(mode)}
                        disabled={false}
                        className={`h-8 rounded-md px-3 text-[12.5px] font-semibold transition ${
                          reflectionMode === mode
                            ? "bg-accent text-primary-fg shadow-glow"
                            : "text-muted-fg hover:bg-white/[.04] hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {reflectionMode === "deep" && (
                    <div className="flex flex-wrap items-center gap-1">
                      {modelOrder.map((modelId, index) => (
                        <div
                          key={modelId}
                          className="flex h-8 items-center rounded-lg border border-[rgba(43,245,168,.18)] bg-accent/[.06] pl-2 text-[12.5px] font-medium text-[#C8F7E4]"
                        >
                          <select
                            value={modelId}
                            onChange={(e) => {
                              if (isModelChoiceId(e.target.value)) {
                                setModelAt(index, e.target.value);
                              }
                            }}
                            disabled={false}
                            className="h-7 min-w-[128px] bg-transparent pr-1 text-[12.5px] font-semibold text-[#C8F7E4] outline-none disabled:opacity-60"
                            aria-label={`Modèle ${index + 1}`}
                          >
                            {MODEL_SELECT_OPTIONS.map((model) => (
                              <option
                                key={model.id}
                                value={model.id}
                                className="bg-surface text-foreground"
                              >
                                {model.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => moveModel(modelId, -1)}
                            disabled={index === 0}
                            title="Monter"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition hover:bg-accent/[.12] hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveModel(modelId, 1)}
                            disabled={
                              index === modelOrder.length - 1
                            }
                            title="Descendre"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition hover:bg-accent/[.12] hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {attachments.length > 0 || attachmentError ? (
                  <div className="border-b border-white/[.06] px-2 py-2">
                    {attachments.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {attachments.map((attachment, index) => (
                          <div
                            key={`${attachment.name}-${index}`}
                            className="flex max-w-[220px] items-center gap-2 rounded-lg border border-[rgba(43,245,168,.18)] bg-accent/[.06] px-2 py-1.5"
                          >
                            {attachment.kind === "image" ? (
                              <img
                                src={attachment.previewUrl}
                                alt=""
                                className="h-8 w-8 rounded-md object-cover"
                              />
                            ) : (
                              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-soft font-mono text-[10px] text-accent">
                                TXT
                              </span>
                            )}
                            <span className="truncate text-[12.5px] text-[#C8F7E4]">
                              {attachment.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-faint transition hover:bg-white/[.05] hover:text-foreground"
                              aria-label="Retirer le fichier"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {attachmentError ? (
                      <p className="m-0 text-[12.5px] text-danger-fg">
                        {attachmentError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="Posez votre question…"
                  rows={2}
                  disabled={false}
                  className="w-full resize-none bg-transparent px-3 pb-1 pt-[10px] text-[16px] leading-[1.5] text-foreground outline-none placeholder:text-faint disabled:opacity-50"
                />
                <div className="flex items-center justify-between px-[6px] pb-[2px] pt-1">
                  <div className="flex items-center gap-2">
                    <label className="flex h-9 cursor-pointer items-center rounded-md border border-border px-3 text-[13px] font-medium text-muted-fg transition hover:border-accent/30 hover:bg-accent/[.08] hover:text-foreground">
                      Joindre
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp,image/gif,text/plain,text/markdown,text/csv,application/json,.txt,.md,.csv,.json"
                        className="hidden"
                        onChange={(e) => {
                          addFiles(e.target.files);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <span className="hidden font-mono text-[11px] text-faint sm:inline">
                      Entrée pour envoyer
                    </span>
                  </div>
                  <button
                    onClick={submit}
                    disabled={!question.trim() && attachments.length === 0}
                    className={`h-9 rounded-md px-4 text-[14px] font-semibold tracking-[-0.01em] transition ${
                      !question.trim() && attachments.length === 0
                        ? "cursor-not-allowed bg-surface-soft text-faint"
                        : "bg-primary text-primary-fg shadow-glow hover:opacity-90"
                    }`}
                  >
                    Demander à {SITE_CONFIG.name} →
                  </button>
                </div>
              </div>
              </div>
              <div className="hidden lg:block" />
            </div>
          </div>
        )}
      </main>

      {/* Menu contextuel d'une conversation */}
      {menuConv && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />
          <div
            className="glass fixed z-50 w-[224px] rounded-xl p-1"
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem
              icon={<PinIcon />}
              onClick={() => togglePin(menuConv)}
            >
              {menuConv.pinned ? "Retirer l'épingle" : "Épingler"}
            </MenuItem>
            <MenuItem
              icon={<EditIcon />}
              onClick={() => startRename(menuConv)}
            >
              Renommer
            </MenuItem>

            {(projects.length > 0 || menuConv.projectId) && (
              <div className="my-1 border-t border-border-soft pt-1">
                <p className="px-3 py-1 font-mono text-[10px] tracking-[0.06em] text-faint">
                  DÉPLACER VERS
                </p>
                {menuConv.projectId && (
                  <MenuItem
                    icon={<UndoIcon />}
                    onClick={() => moveToProject(menuConv, null)}
                  >
                    Sans projet
                  </MenuItem>
                )}
                {projects
                  .filter((p) => p.id !== menuConv.projectId)
                  .map((p) => (
                    <MenuItem
                      key={p.id}
                      icon={<FolderIcon />}
                      onClick={() => moveToProject(menuConv, p.id)}
                    >
                      {p.name}
                    </MenuItem>
                  ))}
              </div>
            )}

            <div className="my-1 border-t border-border-soft pt-1">
              <MenuItem
                icon={menuConv.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                onClick={() => setArchived(menuConv, !menuConv.archived)}
              >
                {menuConv.archived ? "Désarchiver" : "Archiver"}
              </MenuItem>
              <MenuItem
                danger
                icon={<TrashIcon />}
                onClick={() => deleteConv(menuConv)}
              >
                Supprimer
              </MenuItem>
            </div>
          </div>
        </>
      )}

      {projectDialogOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          onClick={closeProjectDialog}
        >
          <div
            className="glass w-full max-w-[460px] rounded-2xl p-5 shadow-[0_24px_80px_-40px_rgba(43,245,168,.65)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="m-0 mb-2 font-mono text-[11px] tracking-[0.08em] text-accent">
                  NOUVEAU PROJET
                </p>
                <h2 className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-foreground">
                  Organiser les conversations
                </h2>
              </div>
              <button
                type="button"
                onClick={closeProjectDialog}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/[.05] hover:text-foreground"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <label className="mb-2 block text-[13px] font-medium text-muted-fg">
              Nom du projet
            </label>
            <input
              autoFocus
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (projectError) setProjectError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") createProject();
                if (e.key === "Escape") closeProjectDialog();
              }}
              placeholder="Ex. Sport, Client A, Idées produit"
              className="h-12 w-full rounded-xl border border-[rgba(43,245,168,.24)] bg-[rgba(6,9,10,.72)] px-4 text-[15px] text-foreground outline-none transition placeholder:text-faint focus:border-accent/60 focus:shadow-[0_0_0_3px_rgba(43,245,168,.12)]"
            />
            {projectError ? (
              <p className="m-0 mt-2 text-[13px] text-danger-fg">
                {projectError}
              </p>
            ) : (
              <p className="m-0 mt-2 text-[13px] text-faint">
                Vous pourrez y déplacer vos conversations depuis le menu.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeProjectDialog}
                className="h-10 rounded-lg border border-border px-4 text-[14px] font-medium text-muted-fg transition hover:bg-white/[.04] hover:text-foreground"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={createProject}
                className="h-10 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-fg shadow-glow transition hover:opacity-90"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="glass w-full max-w-[620px] rounded-2xl p-5 shadow-[0_24px_90px_-42px_rgba(43,245,168,.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="m-0 mb-2 font-mono text-[11px] tracking-[0.08em] text-accent">
                  PARAMÈTRES
                </p>
                <h2 className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-foreground">
                  Utilisation et crédits
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition hover:bg-white/[.05] hover:text-foreground"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <UsageMetric
                label="Offre actuelle"
                value={creditUsage.planLabel}
                suffix="abonnement"
              />
              <UsageMetric
                label="Crédits disponibles"
                value={creditUsage.balance.toLocaleString("fr-FR")}
                suffix="solde actuel"
              />
              <UsageMetric
                label="Synthèses restantes"
                value={`≈ ${creditUsage.estimatedSyntheses.toLocaleString("fr-FR")}`}
                suffix="au tarif standard"
              />
            </div>

            <div className="mt-5">
              <UsageGauge
                label="Utilisation de la période"
                used={creditUsage.spentThisPeriod}
                limit={creditUsage.monthlyAllowance}
              />
              <p className="mb-0 mt-2 text-[12.5px] leading-[1.45] text-muted-fg">
                Une synthèse standard utilise environ 20 crédits. Le coût exact
                dépend du mode choisi et de la taille du contexte.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-[rgba(43,245,168,.14)] bg-accent/[.045] px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-[2px] text-accent">
                  <GaugeIcon />
                </span>
                <div>
                  <p className="m-0 text-[14px] font-semibold text-foreground">
                    Solde synchronisé avec Stripe
                  </p>
                  <p className="m-0 mt-1 text-[13px] leading-[1.45] text-muted-fg">
                    Les crédits affichés proviennent de votre portefeuille réel.
                    Chaque renouvellement payé crédite automatiquement votre offre.
                  </p>
                </div>
              </div>
            </div>

            {/* Confidentialité & données */}
            <div className="mt-6 border-t border-white/[.06] pt-5">
              <p className="m-0 mb-2 font-mono text-[11px] tracking-[0.08em] text-accent">
                CONFIDENTIALITÉ &amp; DONNÉES
              </p>
              <p className="m-0 mb-4 text-[13px] leading-[1.5] text-muted-fg">
                Vos conversations sont chiffrées au repos. L&apos;accès admin est
                restreint et audité.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/api/me/export"
                  className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-[13.5px] font-medium text-foreground transition hover:bg-white/[.04]"
                >
                  Exporter mon historique
                </a>
                <button
                  type="button"
                  onClick={deleteAllHistory}
                  disabled={privacyBusy}
                  className="inline-flex h-10 items-center rounded-lg border border-danger-border px-4 text-[13.5px] font-medium text-danger-fg transition hover:bg-danger-bg disabled:opacity-50"
                >
                  {privacyBusy ? "Suppression…" : "Supprimer tout mon historique"}
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="h-10 rounded-lg border border-border px-4 text-[14px] font-medium text-muted-fg transition hover:bg-white/[.04] hover:text-foreground"
              >
                Fermer
              </button>
              <a
                href="/tarifs"
                className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-fg shadow-glow transition hover:opacity-90"
              >
                Voir les tarifs
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <div className="px-3 pb-[4px] font-mono text-[11px] tracking-[0.06em] text-faint">
        {title}
      </div>
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  );
}

function MenuItem({
  children,
  icon,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-[9px] text-left text-[13.5px] transition hover:border-[rgba(43,245,168,.34)] hover:bg-[rgba(43,245,168,.14)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_12px_34px_-22px_rgba(43,245,168,.95)] ${
        danger
          ? "text-danger-fg hover:border-danger-fg/25 hover:bg-danger-fg/[.1]"
          : "text-foreground hover:text-[#DDFBF0]"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center ${
          danger ? "text-danger-fg" : "text-muted-fg group-hover:text-accent"
        }`}
      >
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </button>
  );
}

function UsageMetric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="rounded-xl border border-[rgba(43,245,168,.14)] bg-surface-soft/70 px-4 py-3">
      <p className="m-0 mb-1 text-[12px] text-faint">{label}</p>
      <p className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-foreground">
        {value}
      </p>
      <p className="m-0 text-[12px] text-muted-fg">{suffix}</p>
    </div>
  );
}

function UsageGauge({
  label,
  used,
  limit,
  compact = false,
}: {
  label: string;
  used: number;
  limit: number;
  compact?: boolean;
}) {
  const value = percent(used, limit);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span
          className={`font-medium text-foreground ${
            compact ? "text-[13px]" : "text-[14px]"
          }`}
        >
          {label}
        </span>
        <span className="font-mono text-[12px] text-muted-fg">
          {used.toLocaleString("fr-FR")} / {limit.toLocaleString("fr-FR")}
        </span>
      </div>
      <div className="h-[7px] overflow-hidden rounded-full bg-[linear-gradient(90deg,transparent,rgba(43,245,168,.08)_12%,rgba(43,245,168,.12)_50%,rgba(43,245,168,.08)_88%,transparent)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(43,245,168,.45)_12%,#2bf5a8_70%,rgba(127,240,194,.75)_88%,transparent_100%)] shadow-[0_0_14px_rgba(43,245,168,.72)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function IconSvg({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
    >
      {children}
    </svg>
  );
}

function PinIcon() {
  return (
    <IconSvg className="h-[14px] w-[14px]">
      <path d="M12 3l7 7" />
      <path d="M14 5l-5 5-4 1 8 8 1-4 5-5" />
      <path d="M9 15l-5 5" />
    </IconSvg>
  );
}

function EditIcon() {
  return (
    <IconSvg>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </IconSvg>
  );
}

function ArchiveIcon() {
  return (
    <IconSvg>
      <path d="M4 7h16" />
      <path d="M6 7v12h12V7" />
      <path d="M9 11h6" />
      <path d="M4 4h16v3H4z" />
    </IconSvg>
  );
}

function ArchiveRestoreIcon() {
  return (
    <IconSvg>
      <path d="M4 7h16" />
      <path d="M6 7v12h12V7" />
      <path d="M12 16V10" />
      <path d="M9 13l3-3 3 3" />
      <path d="M4 4h16v3H4z" />
    </IconSvg>
  );
}

function TrashIcon() {
  return (
    <IconSvg>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </IconSvg>
  );
}

function FolderIcon() {
  return (
    <IconSvg>
      <path d="M3 6.5h6l2 2h10v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </IconSvg>
  );
}

function UndoIcon() {
  return (
    <IconSvg>
      <path d="M9 14l-4-4 4-4" />
      <path d="M5 10h10a5 5 0 0 1 0 10h-2" />
    </IconSvg>
  );
}

function MoreIcon() {
  return (
    <IconSvg className="h-[15px] w-[15px]">
      <path d="M12 5h.01" />
      <path d="M12 12h.01" />
      <path d="M12 19h.01" />
    </IconSvg>
  );
}

function GearIcon() {
  return (
    <IconSvg>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.04.04a2 2 0 1 1-2.83 2.83l-.04-.04A1.7 1.7 0 0 0 15 19.36a1.7 1.7 0 0 0-1 .58V20a2 2 0 1 1-4 0v-.06a1.7 1.7 0 0 0-1-.58 1.7 1.7 0 0 0-1.87.34l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-.58-1H4a2 2 0 1 1 0-4h.06a1.7 1.7 0 0 0 .58-1 1.7 1.7 0 0 0-.34-1.87l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-.58V4a2 2 0 1 1 4 0v.06a1.7 1.7 0 0 0 1 .58 1.7 1.7 0 0 0 1.87-.34l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.36 9c.22.35.42.66.58 1H20a2 2 0 1 1 0 4h-.06a1.7 1.7 0 0 0-.54 1Z" />
    </IconSvg>
  );
}

function GaugeIcon() {
  return (
    <IconSvg>
      <path d="M4 14a8 8 0 1 1 16 0" />
      <path d="M12 14l4-4" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
      <path d="M12 18h.01" />
    </IconSvg>
  );
}

function PowerIcon() {
  return (
    <IconSvg>
      <path d="M12 2v10" />
      <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
    </IconSvg>
  );
}

function DeliberationPanel({
  question,
  modelOrder,
  steps,
  judging,
  result,
}: {
  question: string;
  modelOrder: ModelChoiceId[];
  steps: Record<ProviderName, ProviderStep>;
  judging: StepStatus | null;
  result: FinalPayload | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const visibleModels = modelOrder
    .map((modelId, index) => {
      const model = getModelChoice(modelId);
      return { modelId, model, step: steps[model.provider], index };
    })
    .filter(({ step }) => step.status !== "idle");
  const statusSignature = visibleModels
    .map(({ modelId, step }) => `${modelId}:${step.status}`)
    .join("|");

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (root.dataset.question !== question) {
      delete root.dataset.splitAnimated;
      delete root.dataset.mergeAnimated;
      root.dataset.question = question;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    void import("gsap").then(({ gsap }) => {
      if (cancelled || !rootRef.current) return;
      ctx = gsap.context(() => {
        if (!root.dataset.splitAnimated) {
          const paths = gsap.utils.toArray<SVGPathElement>(".delib-split");
          paths.forEach((path) => {
            const length = path.getTotalLength();
            gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
          });
          gsap.to(paths, {
            strokeDashoffset: 0,
            duration: 0.7,
            stagger: 0.1,
            ease: "power2.inOut",
          });
          root.dataset.splitAnimated = "true";
        }

        root.querySelectorAll<HTMLElement>(".delib-card:not([data-animated])").forEach((card) => {
          card.dataset.animated = "true";
          gsap.from(card, { opacity: 0, y: 16, duration: 0.42, ease: "power3.out" });
        });

        if (judging && !root.dataset.mergeAnimated) {
          const paths = gsap.utils.toArray<SVGPathElement>(".delib-merge");
          paths.forEach((path) => {
            if (path.classList.contains("delib-dissent")) {
              gsap.set(path, { opacity: 0 });
            } else {
              const length = path.getTotalLength();
              gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
            }
          });
          gsap.to(".delib-merge:not(.delib-dissent)", {
            strokeDashoffset: 0,
            duration: 0.65,
            stagger: 0.1,
            ease: "power2.inOut",
          });
          gsap.to(".delib-dissent", { opacity: 1, duration: 0.5, delay: 0.35 });
          gsap.from(".delib-diamond", {
            scale: 0,
            transformOrigin: "50% 50%",
            duration: 0.45,
            delay: 0.5,
            ease: "back.out(2)",
          });
          root.dataset.mergeAnimated = "true";
        }
      }, root);
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [question, statusSignature, judging]);

  const elapsedMs = Math.max(
    0,
    ...Object.values(steps).map((step) => step.latencyMs ?? 0),
  );
  const convergence = result
    ? result.final.confidence === "high"
      ? "Convergence forte"
      : result.final.confidence === "medium"
        ? "Convergence partielle"
        : "À vérifier"
    : judging === "running"
      ? "Synthèse en cours"
      : "Analyses en cours";
  const disagreement = result?.final.disagreements?.[0];

  return (
    <aside className="lg:sticky lg:top-[76px] lg:self-start">
      <div
        ref={rootRef}
        className="overflow-hidden rounded-2xl border border-accent/20 bg-[rgba(4,13,9,.78)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.025)] backdrop-blur-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="m-0 font-mono text-[11px] tracking-[0.16em] text-accent">
            DÉLIBÉRATION
          </p>
          <span className="font-mono text-[10.5px] text-faint">
            {elapsedMs > 0 ? `${Math.ceil(elapsedMs / 1000)} S` : "EN DIRECT"}
          </span>
        </div>

        <div className="rounded-xl border border-white/[.1] bg-black/10 px-3 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-[1px] font-mono text-[12px] text-accent">Q</span>
            <p className="m-0 line-clamp-3 text-[12.5px] leading-[1.45] text-foreground">
              {question || "Préparation de la question…"}
            </p>
          </div>
        </div>

        <svg viewBox="0 0 300 42" className="block w-full" aria-hidden>
          <path className="delib-split" d="M150 2 C150 16 40 13 40 39" fill="none" stroke="rgba(127,240,194,.58)" strokeWidth="1.4" />
          <path className="delib-split" d="M150 2 L150 39" fill="none" stroke="rgba(127,240,194,.58)" strokeWidth="1.4" />
          <path className="delib-split" d="M150 2 C150 16 260 13 260 39" fill="none" stroke="rgba(127,240,194,.58)" strokeWidth="1.4" />
          {[40, 150, 260].map((cx) => <circle key={cx} cx={cx} cy="39" r="2.3" fill="#7ff0c2" />)}
        </svg>

        <div className="space-y-2.5">
          {visibleModels.map(({ modelId, model, step, index }) => {
            const raw = step.content?.replace(/[#*_`>\[\]]/g, " ").replace(/\s+/g, " ").trim();
            const preview = raw
              ? raw.length > 145
                ? `${raw.slice(0, 145)}…`
                : raw
              : step.status === "running"
                ? "Analyse de la question en cours…"
                : step.error || "Ce modèle n’a pas pu répondre.";
            return (
              <div
                key={modelId}
                className={`delib-card rounded-xl border px-3.5 py-3 ${
                  step.status === "fail"
                    ? "border-dashed border-white/[.16] opacity-65"
                    : "border-accent/35 bg-accent/[.025]"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="m-0 font-mono text-[11px] tracking-[0.13em] text-accent">
                      MODÈLE {String.fromCharCode(65 + index)}
                    </p>
                    <p className="m-0 mt-0.5 truncate text-[10.5px] text-faint">
                      {step.model ?? model.shortLabel}
                    </p>
                  </div>
                  <span className={`rounded px-2 py-1 font-mono text-[9.5px] ${
                    step.status === "ok"
                      ? "bg-accent/[.12] text-accent"
                      : step.status === "running"
                        ? "animate-synth-pulse bg-accent/[.08] text-accent"
                        : "bg-white/[.06] text-faint"
                  }`}>
                    {step.status === "ok" ? "RÉPONDU" : step.status === "running" ? "ANALYSE" : "ÉCHEC"}
                  </span>
                </div>
                <p className="m-0 text-[12px] leading-[1.55] text-muted-fg">{preview}</p>
              </div>
            );
          })}
        </div>

        {judging ? (
          <>
            <svg viewBox="0 0 300 58" className="block w-full" aria-hidden>
              <path className="delib-merge" d="M40 2 C40 25 135 22 145 45" fill="none" stroke="rgba(43,245,168,.75)" strokeWidth="1.5" />
              <path className="delib-merge" d="M150 2 L150 43" fill="none" stroke="rgba(43,245,168,.75)" strokeWidth="1.5" />
              <path className="delib-merge delib-dissent" d="M260 2 C260 25 168 20 155 43" fill="none" stroke="rgba(127,240,194,.38)" strokeWidth="1.4" strokeDasharray="5 6" />
              <g className="delib-diamond" transform="translate(150 46) rotate(45)">
                <rect x="-9" y="-9" width="18" height="18" rx="3" fill="#2bf5a8" />
                <rect x="-13" y="-13" width="26" height="26" rx="6" fill="none" stroke="rgba(43,245,168,.45)" />
              </g>
            </svg>
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/[.07] px-3 py-1.5 text-[11.5px] font-semibold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {convergence}
              </span>
            </div>
          </>
        ) : null}

        {disagreement ? (
          <div className="delib-card mt-4 rounded-xl border border-white/[.1] bg-black/10 px-3.5 py-3">
            <p className="m-0 font-mono text-[10.5px] tracking-[0.14em] text-faint">
              POINT DE DÉSACCORD
            </p>
            <p className="m-0 mt-2 text-[12px] leading-[1.55] text-muted-fg">
              {disagreement}
            </p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function StatusDot({
  status,
  idle = false,
}: {
  status: StepStatus;
  idle?: boolean;
}) {
  if (idle || status === "idle") {
    return <span className="h-[9px] w-[9px] rounded-full bg-border" />;
  }
  if (status === "running") {
    return (
      <span className="animate-synth-pulse h-[9px] w-[9px] rounded-full bg-accent shadow-glow" />
    );
  }
  if (status === "ok") {
    return (
      <span className="h-[9px] w-[9px] rounded-full bg-accent shadow-glow" />
    );
  }
  return <span className="h-[9px] w-[9px] rounded-full bg-danger-fg" />;
}

function ProcessRow({
  label,
  subLabel,
  status,
  latencyMs,
  content,
  error,
  showDetail,
}: {
  label: string;
  subLabel?: string;
  status: StepStatus;
  latencyMs?: number;
  content?: string;
  error?: string;
  showDetail: boolean;
}) {
  const statusText =
    status === "ok" && latencyMs
      ? `a répondu · ${(latencyMs / 1000).toFixed(1)}s`
      : status === "fail"
        ? "indisponible"
        : STATUS_TEXT[status];

  const canPreview = showDetail && status === "ok" && Boolean(content);
  const preview =
    content && content.length > 240 ? `${content.slice(0, 240).trim()}…` : content;

  return (
    <div className="flex items-start gap-3 py-2">
      <span className="pt-[3px]">
        <StatusDot status={status} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[13.5px] font-medium text-foreground">{label}</p>
        {subLabel ? (
          <p className="m-0 text-[11.5px] text-faint">{subLabel}</p>
        ) : null}
        <p
          className={`m-0 text-[12px] ${
            status === "fail" ? "text-danger-fg" : "text-faint"
          }`}
          title={error}
        >
          {statusText}
        </p>
        {canPreview && (
          <div className="mt-2 rounded-lg border border-[rgba(43,245,168,.14)] bg-accent/[.045] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
            <p className="m-0 max-h-[96px] overflow-hidden whitespace-pre-wrap text-[12.5px] leading-[1.5] text-[#9FB0A8]">
              {preview}
            </p>
            {content && content.length > 240 ? (
              <details className="group mt-1">
                <summary className="cursor-pointer list-none text-[11.5px] text-accent-strong transition hover:text-accent">
                  <span className="group-open:hidden">voir plus</span>
                  <span className="hidden group-open:inline">réduire</span>
                </summary>
              <p className="m-0 max-h-[170px] overflow-y-auto whitespace-pre-wrap text-[12.5px] leading-[1.5] text-[#9FB0A8]">
                {content}
              </p>
              </details>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
