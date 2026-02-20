import { useTranslations } from "next-intl";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { IrFile, IrCategory } from "@/types/ir";
import type { BadgeVariant } from "@/components/ui/Badge";

/* ==========================================================================
   IrFileCard — IR 파일 다운로드 카드
   서버 컴포넌트 — 'use client' 불필요
   ========================================================================== */

// ---------------------------------------------------------------------------
// Category → Badge Variant 매핑
// ---------------------------------------------------------------------------

const categoryBadgeMap: Record<IrCategory, BadgeVariant> = {
  announcement: "info",
  annual_report: "gold",
  presentation: "primary",
  other: "outline",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// IrFileCard Component
// ---------------------------------------------------------------------------

interface IrFileCardProps {
  file: IrFile;
}

export function IrFileCard({ file }: IrFileCardProps) {
  const t = useTranslations("ir");
  const badgeVariant = categoryBadgeMap[file.category];
  const fileSize = formatFileSize(file.file_size);

  return (
    <Card interactive>
      <CardBody>
        {/* Badge + Date */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge variant={badgeVariant} size="sm">
            {t(`categories.${file.category}`)}
          </Badge>
          <time className="text-xs text-gray-400" dateTime={file.published_at}>
            {formatDate(file.published_at)}
          </time>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-primary leading-snug line-clamp-2 min-h-[2.5rem]">
          {file.title}
        </h3>

        {/* File Info */}
        {(file.file_type || fileSize) && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
            <svg
              className="size-3.5 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
            </svg>
            <span>
              {file.file_type?.toUpperCase()}
              {fileSize && ` · ${fileSize}`}
            </span>
          </div>
        )}
      </CardBody>

      <CardFooter>
        <Button
          href={file.file_url}
          target="_blank"
          rel="noopener noreferrer"
          variant="ghost"
          size="xs"
          className="w-full"
        >
          <svg
            className="size-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
          </svg>
          {t("files.download")}
        </Button>
      </CardFooter>
    </Card>
  );
}
