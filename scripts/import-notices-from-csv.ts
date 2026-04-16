import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

type NoticeCsvRow = {
  wr_id?: string | number;
  wr_subject?: string;
  wr_content?: string;
  wr_datetime?: string;
  wr_is_comment?: string | number;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const DEFAULT_CSV_PATH = String.raw`C:\Users\euna\Desktop\데이터 추출\공지사항데이터.csv`;
const LEGACY_URL_REGEX =
  /https?:\/\/www\.cellromax\.(?:co\.kr|kr)\/data\/editor\/[^\s"'<>]+/gi;

function readEnv(filePath: string) {
  const env: Record<string, string> = {};
  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    env[key] = value;
  }

  return env;
}

function getArgValue(flag: string) {
  const directIndex = process.argv.indexOf(flag);
  if (directIndex >= 0) {
    return process.argv[directIndex + 1];
  }

  const prefix = `${flag}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : undefined;
}

function normalizeText(value: unknown) {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

function normalizeHeader(key: string) {
  return key.replace(/^\uFEFF/, "").replace(/^"+|"+$/g, "").trim();
}

function parseRows(filePath: string) {
  const text = fs.readFileSync(filePath, "utf8");
  const workbook = XLSX.read(text, {
    type: "string",
    raw: true,
  });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });

  return rows
    .map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
      ) as NoticeCsvRow,
    )
    .map((row) => {
      const wrId = normalizeText(row.wr_id);
      return {
        wrId: Number(wrId),
        subject: normalizeText(row.wr_subject),
        content: normalizeText(row.wr_content),
        publishedAt: normalizeText(row.wr_datetime),
        isComment: Number(normalizeText(row.wr_is_comment) || "0"),
      };
    })
    .filter((row) => Number.isFinite(row.wrId) && row.wrId > 0)
    .filter((row) => row.isComment === 0)
    .filter((row) => row.subject && row.publishedAt);
}

function collectLegacyUrls(content: string) {
  const matches = content.match(LEGACY_URL_REGEX) ?? [];
  return Array.from(new Set(matches));
}

function buildUploadPath(oldUrl: string) {
  const parsed = new URL(oldUrl);
  const prefix = "/data/editor/";
  const index = parsed.pathname.indexOf(prefix);
  const relativePath =
    index >= 0
      ? parsed.pathname.slice(index + prefix.length)
      : path.basename(parsed.pathname);

  return `legacy-notices/${relativePath}`;
}

function buildCandidateUrls(oldUrl: string) {
  const parsed = new URL(oldUrl);
  const candidates = new Set<string>();

  candidates.add(oldUrl);

  for (const protocol of ["https:", "http:"] as const) {
    for (const host of ["www.cellromax.co.kr", "www.cellromax.kr"] as const) {
      const next = new URL(oldUrl);
      next.protocol = protocol;
      next.host = host;
      candidates.add(next.toString());
    }
  }

  // Keep original path but strip duplicated default port if any.
  parsed.port = "";
  candidates.add(parsed.toString());

  return Array.from(candidates);
}

async function downloadFile(oldUrl: string) {
  let lastError: unknown = null;

  for (const candidate of buildCandidateUrls(oldUrl)) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";

      return { arrayBuffer, contentType, sourceUrl: candidate };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Failed to download ${oldUrl}${lastError ? ` (${String(lastError)})` : ""}`,
  );
}

function replaceUrls(content: string, urlMap: Map<string, string>) {
  let next = content;
  for (const [oldUrl, newUrl] of urlMap) {
    next = next.split(oldUrl).join(newUrl);
  }
  return next;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function main() {
  const csvPath = getArgValue("--file") || DEFAULT_CSV_PATH;
  const apply = process.argv.includes("--apply");

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const env = readEnv(path.join(process.cwd(), ".env.local"));
  const serviceRoleKey =
    env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_SECRET;

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables in .env.local");
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const rows = parseRows(csvPath).sort((a, b) =>
    a.publishedAt.localeCompare(b.publishedAt),
  );

  const uniqueLegacyUrls = new Set<string>();
  for (const row of rows) {
    for (const url of collectLegacyUrls(row.content)) {
      uniqueLegacyUrls.add(url);
    }
  }

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          csvPath,
          rowCount: rows.length,
          rowsWithImages: rows.filter((row) => collectLegacyUrls(row.content).length > 0)
            .length,
          uniqueImageUrls: uniqueLegacyUrls.size,
          sample: rows.slice(0, 5).map((row) => ({
            wrId: row.wrId,
            subject: row.subject,
            publishedAt: row.publishedAt,
            imageCount: collectLegacyUrls(row.content).length,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const uploadCache = new Map<string, string>();
  const errors: string[] = [];
  let uploadedFiles = 0;
  let upsertedRows = 0;

  for (const row of rows) {
    const oldUrls = collectLegacyUrls(row.content);
    const rowUrlMap = new Map<string, string>();

    for (const oldUrl of oldUrls) {
      if (uploadCache.has(oldUrl)) {
        rowUrlMap.set(oldUrl, uploadCache.get(oldUrl)!);
        continue;
      }

      try {
        const { arrayBuffer, contentType } = await downloadFile(oldUrl);
        const uploadPath = buildUploadPath(oldUrl);

        const { error: uploadError } = await supabase.storage
          .from("newsroom")
          .upload(uploadPath, arrayBuffer, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("newsroom").getPublicUrl(uploadPath);

        uploadCache.set(oldUrl, publicUrl);
        rowUrlMap.set(oldUrl, publicUrl);
        uploadedFiles += 1;
      } catch (error) {
        errors.push(`wr_id=${row.wrId} upload failed: ${oldUrl} -> ${String(error)}`);
      }
    }

    const replacedContent = replaceUrls(row.content, rowUrlMap);
    const uploadedImages = uniqueStrings(
      oldUrls
        .map((oldUrl) => rowUrlMap.get(oldUrl) || uploadCache.get(oldUrl) || "")
        .filter(Boolean),
    );

    const payload: Record<string, JsonValue> = {
      legacy_notice_id: row.wrId,
      post_type: "notice",
      title_ko: row.subject,
      title_en: null,
      title_zh: null,
      title_vi: null,
      content_ko: replacedContent || null,
      content_en: null,
      content_zh: null,
      content_vi: null,
      youtube_id: null,
      thumbnail_url: uploadedImages[0] || null,
      images: uploadedImages,
      attachments: [],
      is_pinned: false,
      is_active: true,
      published_at: row.publishedAt,
    };

    const { error: upsertError } = await supabase
      .from("posts")
      .upsert(payload, {
        onConflict: "legacy_notice_id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      errors.push(`wr_id=${row.wrId} upsert failed -> ${upsertError.message}`);
      continue;
    }

    upsertedRows += 1;
  }

  const { data: importedNotices, error: verifyError } = await supabase
    .from("posts")
    .select("id, legacy_notice_id, title_ko, published_at, thumbnail_url")
    .not("legacy_notice_id", "is", null)
    .order("legacy_notice_id", { ascending: true });

  if (verifyError) {
    throw verifyError;
  }

  console.log(
    JSON.stringify(
      {
        mode: "apply",
        csvPath,
        rowCount: rows.length,
        uniqueImageUrls: uniqueLegacyUrls.size,
        uploadedFiles,
        upsertedRows,
        importedNoticeCount: importedNotices?.length ?? 0,
        errors,
        sample: (importedNotices ?? []).slice(0, 5),
      },
      null,
      2,
    ),
  );

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
