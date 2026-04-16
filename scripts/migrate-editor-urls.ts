import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const LEGACY_PREFIX = "https://www.cellromax.co.kr/data/editor/";
const URL_REGEX =
  /https:\/\/www\.cellromax\.co\.kr\/data\/editor\/[^\s"'<>]+/g;

const TABLE_CONFIGS = [
  {
    table: "products",
    bucket: "products",
    idField: "id",
    labelField: "slug",
    fields: [
      "thumbnail_url",
      "images",
      "detail_images",
      "detail_image_url",
      "nutrition_image_url",
      "detail_html_ko",
      "detail_html_en",
      "detail_html_zh",
      "detail_html_vi",
    ],
  },
  {
    table: "posts",
    bucket: "newsroom",
    idField: "id",
    labelField: "title_ko",
    fields: [
      "thumbnail_url",
      "images",
      "content_ko",
      "content_en",
      "content_zh",
      "content_vi",
      "attachments",
    ],
  },
  {
    table: "ir_files",
    bucket: "ir-files",
    idField: "id",
    labelField: "title",
    fields: ["thumbnail_url", "file_url", "content"],
  },
] as const;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type TableConfig = (typeof TABLE_CONFIGS)[number];

function readEnv(filePath: string) {
  const env: Record<string, string> = {};
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [key, ...rest] = trimmed.split("=");
    env[key.trim()] = rest.join("=").trim();
  }
  return env;
}

function collectLegacyUrls(value: JsonValue, urls: Set<string>) {
  if (typeof value === "string") {
    if (value.startsWith(LEGACY_PREFIX)) {
      urls.add(value);
      return;
    }
    const matches = value.match(URL_REGEX);
    if (matches) {
      for (const match of matches) {
        urls.add(match);
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectLegacyUrls(item, urls);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectLegacyUrls(item, urls);
    }
  }
}

function replaceLegacyUrls(
  value: JsonValue,
  urlMap: Map<string, string>,
): JsonValue {
  if (typeof value === "string") {
    let next = value;
    for (const [oldUrl, newUrl] of urlMap) {
      if (next.includes(oldUrl)) {
        next = next.split(oldUrl).join(newUrl);
      }
    }
    return next;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceLegacyUrls(item, urlMap));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceLegacyUrls(item, urlMap),
      ]),
    );
  }

  return value;
}

function buildUploadPath(oldUrl: string) {
  const parsed = new URL(oldUrl);
  const prefix = "/data/editor/";
  const index = parsed.pathname.indexOf(prefix);
  const relativePath =
    index >= 0 ? parsed.pathname.slice(index + prefix.length) : path.basename(parsed.pathname);

  return `legacy-editor/${relativePath}`;
}

async function downloadFile(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${url}`);
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  return { arrayBuffer, contentType };
}

async function scanTable(
  supabase: ReturnType<typeof createClient>,
  config: TableConfig,
) {
  const select = [config.idField, config.labelField, ...config.fields].join(",");
  const { data, error } = await supabase.from(config.table).select(select).limit(1000);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Record<string, JsonValue>[];
  const matches = rows
    .map((row) => {
      const urls = new Set<string>();
      const matchedFields: string[] = [];
      for (const field of config.fields) {
        const value = row[field];
        const beforeSize = urls.size;
        collectLegacyUrls(value as JsonValue, urls);
        if (urls.size > beforeSize) {
          matchedFields.push(field);
        }
      }
      return {
        row,
        matchedFields,
        urls,
      };
    })
    .filter((item) => item.matchedFields.length > 0);

  return matches;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const env = readEnv(path.join(process.cwd(), ".env.local"));

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const scanResults = [];

  for (const config of TABLE_CONFIGS) {
    const matches = await scanTable(supabase, config);
    const uniqueUrls = new Set<string>();
    for (const match of matches) {
      for (const url of match.urls) {
        uniqueUrls.add(url);
      }
    }

    scanResults.push({
      config,
      matches,
      uniqueUrls,
    });
  }

  const summary = scanResults.map(({ config, matches, uniqueUrls }) => ({
    table: config.table,
    bucket: config.bucket,
    matchedRows: matches.length,
    uniqueUrls: uniqueUrls.size,
    sampleRows: matches.slice(0, 10).map(({ row, matchedFields }) => ({
      id: row[config.idField],
      label: row[config.labelField],
      matchedFields,
    })),
  }));

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          summary,
        },
        null,
        2,
      ),
    );
    return;
  }

  const uploadCache = new Map<string, string>();
  const errors: string[] = [];
  let updatedRows = 0;
  let uploadedFiles = 0;

  for (const { config, matches } of scanResults) {
    for (const match of matches) {
      const rowUrlMap = new Map<string, string>();

      for (const oldUrl of match.urls) {
        const cacheKey = `${config.bucket}:${oldUrl}`;
        if (uploadCache.has(cacheKey)) {
          rowUrlMap.set(oldUrl, uploadCache.get(cacheKey)!);
          continue;
        }

        try {
          const { arrayBuffer, contentType } = await downloadFile(oldUrl);
          const uploadPath = buildUploadPath(oldUrl);

          const { error: uploadError } = await supabase.storage
            .from(config.bucket)
            .upload(uploadPath, arrayBuffer, {
              contentType,
              upsert: true,
            });

          if (uploadError) {
            throw uploadError;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from(config.bucket).getPublicUrl(uploadPath);

          uploadCache.set(cacheKey, publicUrl);
          rowUrlMap.set(oldUrl, publicUrl);
          uploadedFiles += 1;
        } catch (error) {
          errors.push(
            `${config.table}:${String(match.row[config.idField])}:${oldUrl} -> ${String(error)}`,
          );
        }
      }

      if (rowUrlMap.size === 0) {
        continue;
      }

      const updatePayload: Record<string, JsonValue> = {};
      let changed = false;

      for (const field of config.fields) {
        const original = match.row[field] as JsonValue;
        const replaced = replaceLegacyUrls(original, rowUrlMap);
        if (JSON.stringify(original) !== JSON.stringify(replaced)) {
          updatePayload[field] = replaced;
          changed = true;
        }
      }

      if (!changed) {
        continue;
      }

      const { error: updateError } = await supabase
        .from(config.table)
        .update(updatePayload)
        .eq(config.idField, match.row[config.idField] as string);

      if (updateError) {
        errors.push(
          `${config.table}:${String(match.row[config.idField])}: update -> ${updateError.message}`,
        );
        continue;
      }

      updatedRows += 1;
    }
  }

  const rescanSummary = [];
  for (const config of TABLE_CONFIGS) {
    const matches = await scanTable(supabase, config);
    const uniqueUrls = new Set<string>();
    for (const match of matches) {
      for (const url of match.urls) {
        uniqueUrls.add(url);
      }
    }
    rescanSummary.push({
      table: config.table,
      matchedRows: matches.length,
      uniqueUrls: uniqueUrls.size,
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: "apply",
        uploadedFiles,
        updatedRows,
        errors,
        summary: rescanSummary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
