"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

interface Props {
  /** 에셋 스토리지 네임스페이스로 쓰일 상품 UUID (신규 등록 시 임시 UUID 허용) */
  productId: string;
  /** 업로드 대상 언어 (라벨 표기용) */
  langLabel: string;
  /** 처리된 HTML 을 폼 상태로 반영 */
  onImported: (html: string, warnings: string[]) => void;
  disabled?: boolean;
}

type UploadState = "idle" | "uploading" | "done" | "error";

async function safeJson(
  res: Response,
): Promise<{ error?: string; [k: string]: unknown }> {
  try {
    return await res.json();
  } catch {
    return { error: `서버 응답을 해석할 수 없습니다 (HTTP ${res.status}).` };
  }
}

export function DetailBundleUploader({
  productId,
  langLabel,
  onImported,
  disabled,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    assetCount: number;
    warnings: string[];
    html: string;
  } | null>(null);

  function handlePick() {
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError(".zip 파일만 업로드할 수 있습니다.");
      return;
    }

    setState("uploading");
    setError(null);
    setResult(null);

    try {
      // 1) 서명 업로드 URL 발급 (작은 요청 — Vercel 본문 한계 무관)
      const signRes = await fetch(
        `/api/products/${productId}/detail-bundle/sign`,
        { method: "POST" },
      );
      const signData = await safeJson(signRes);
      if (!signRes.ok) {
        throw new Error(signData?.error ?? "업로드 URL 발급에 실패했습니다.");
      }

      // 2) ZIP 을 Supabase Storage 에 직접 업로드 (supabase.co 로 직행)
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(String(signData.bucket))
        .uploadToSignedUrl(
          String(signData.path),
          String(signData.token),
          file,
        );
      if (upErr) {
        throw new Error(`업로드 실패: ${upErr.message}`);
      }

      // 3) bundleId 만 넘겨 서버가 download·처리 (요청 본문 작음)
      const res = await fetch(`/api/products/${productId}/detail-bundle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId: signData.bundleId }),
      });
      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error ?? "업로드에 실패했습니다.");
      }

      const html = String(data.html ?? "");
      const warnings = Array.isArray(data.warnings)
        ? (data.warnings as string[])
        : [];

      setResult({
        assetCount: Array.isArray(data.assets) ? data.assets.length : 0,
        warnings,
        html,
      });
      setState("done");

      // 처리 즉시 폼 상태로 반영 (별도 "적용" 클릭 없이 바로 저장 대상에 들어감)
      onImported(html, warnings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setState("error");
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            {langLabel} HTML 번들 업로드
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            HTML + 이미지를 ZIP으로 압축해 업로드하면 이미지·CSS·JS 경로가
            자동으로 변환되어 저장됩니다.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handlePick}
          disabled={disabled || state === "uploading"}
        >
          {state === "uploading" ? "처리 중..." : "ZIP 업로드"}
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileChange}
      />

      {state === "uploading" && (
        <div className="flex items-center gap-2 mt-2">
          <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
          </div>
          <span className="text-xs text-gray-500">
            이미지 업로드 및 변환 중...
          </span>
        </div>
      )}

      {error && (
        <p className="text-xs text-error mt-2 bg-error/10 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {state === "done" && result && (
        <div className="mt-3 bg-white rounded-lg px-3 py-2 text-xs text-gray-700">
          <p>
            ✓ 자산 <strong>{result.assetCount}</strong>개 변환 완료 — 적용되었습니다.
          </p>
          {result.warnings.length > 0 && (
            <div className="mt-1.5 text-amber-600">
              <p className="font-semibold">경고:</p>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
