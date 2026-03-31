"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { toast } from "@/components/ui/Toast";

import type { IrFile } from "@/types/ir";

/* ==========================================================================
   IrFileForm Component -- Cellromax Admin

   관리자 페이지 IR 파일 등록/수정 폼 컴포넌트.
   - mode: 'create' (신규 등록) / 'edit' (기존 IR 파일 수정)
   - PDF 파일 업로드 (드래그앤드롭 지원)
   - sticky 하단 버튼 바 (취소 / 등록 또는 수정)
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IrFileFormProps {
  /** 'create' 또는 'edit' */
  mode: "create" | "edit";
  /** 수정 모드에서 기존 IR 파일 데이터 */
  initialData?: IrFile;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IR_CATEGORY_OPTIONS = [
  { value: "announcement", label: "IR자료실" },
  { value: "annual_report", label: "전자공시" },
  { value: "presentation", label: "IR발표자료" },
  { value: "ethics", label: "윤리강령" },
  { value: "other", label: "기타" },
];

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bytesToMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

// ---------------------------------------------------------------------------
// Section Card Wrapper
// ---------------------------------------------------------------------------

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow-sm border border-gray-100 squircle-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-px bg-gradient-to-r from-secondary via-secondary-light to-transparent mb-6" />
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IrFileForm Component
// ---------------------------------------------------------------------------

export function IrFileForm({ mode, initialData }: IrFileFormProps) {
  const router = useRouter();
  const pathname = usePathname();

  // 현재 locale 추출
  const locale = pathname.split("/")[1];

  // --------------------------------------------------------------------------
  // Form State
  // --------------------------------------------------------------------------

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [category, setCategory] = useState<string>(initialData?.category ?? "");
  const [publishedAt, setPublishedAt] = useState(() => {
    if (initialData?.published_at) {
      const date = new Date(initialData.published_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }
    return "";
  });
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  // 본문 내용 & 썸네일
  const [content, setContent] = useState(initialData?.content ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initialData?.thumbnail_url ?? null);

  // PDF 업로드 상태
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialData?.file_url ?? null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(initialData?.file_name ?? null);
  const [pdfFileSize, setPdfFileSize] = useState<number | null>(initialData?.file_size ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // --------------------------------------------------------------------------
  // Submit State
  // --------------------------------------------------------------------------

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --------------------------------------------------------------------------
  // PDF Upload
  // --------------------------------------------------------------------------

  const uploadPdf = useCallback((file: File) => {
    if (file.type !== "application/pdf") {
      setUploadError("PDF 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      setUploadError(`파일 크기가 ${bytesToMB(MAX_PDF_SIZE)}MB를 초과합니다.`);
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "ir-files");

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          const uploadedUrl = response.url || response.publicUrl || response.data?.url;
          if (uploadedUrl) {
            setPdfUrl(uploadedUrl);
            setPdfFileName(file.name);
            setPdfFileSize(file.size);
          } else {
            setUploadError("서버 응답에서 파일 URL을 찾을 수 없습니다.");
          }
        } catch {
          setUploadError("서버 응답을 처리할 수 없습니다.");
        }
      } else {
        let errorMessage = "파일 업로드에 실패했습니다.";
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          if (errorResponse.error || errorResponse.message) {
            errorMessage = errorResponse.error || errorResponse.message;
          }
        } catch {
          // 기본 에러 메시지 사용
        }
        setUploadError(errorMessage);
      }
      setIsUploading(false);
      setUploadProgress(0);
    });

    xhr.addEventListener("error", () => {
      xhrRef.current = null;
      setUploadError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      setIsUploading(false);
      setUploadProgress(0);
    });

    xhr.addEventListener("abort", () => {
      xhrRef.current = null;
      setIsUploading(false);
      setUploadProgress(0);
    });

    xhr.open("POST", "/api/upload-pdf");
    xhr.send(formData);
  }, []);

  // --------------------------------------------------------------------------
  // Drag & Drop Handlers
  // --------------------------------------------------------------------------

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentTarget = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadPdf(files[0]);
    }
  }, [uploadPdf]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadPdf(files[0]);
    }
    e.target.value = "";
  }, [uploadPdf]);

  const handleRemovePdf = useCallback(() => {
    setPdfUrl(null);
    setPdfFileName(null);
    setPdfFileSize(null);
    setUploadError(null);
  }, []);

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "제목을 입력해주세요.";
    }
    if (!category) {
      newErrors.category = "카테고리를 선택해주세요.";
    }
    if (!publishedAt) {
      newErrors.publishedAt = "게시일을 선택해주세요.";
    }
    if (!pdfUrl) {
      newErrors.pdfUrl = "PDF 파일을 업로드해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, category, publishedAt, pdfUrl]);

  // --------------------------------------------------------------------------
  // Submit Handler
  // --------------------------------------------------------------------------

  const handleSubmit = useCallback(async () => {
    if (!validate()) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        title: title.trim(),
        category,
        published_at: publishedAt,
        file_url: pdfUrl,
        file_name: pdfFileName,
        file_size: pdfFileSize,
        file_type: "application/pdf",
        is_active: isActive,
        content: content.trim() || null,
        thumbnail_url: thumbnailUrl,
      };

      const url =
        mode === "create"
          ? "/api/ir-files"
          : `/api/ir-files/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || "IR 파일 저장에 실패했습니다."
        );
      }

      toast.success(
        mode === "create"
          ? "IR 파일이 등록되었습니다."
          : "IR 파일이 수정되었습니다."
      );
      router.push(`/${locale}/admin/ir-files`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "IR 파일 저장에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, title, category, publishedAt, pdfUrl, pdfFileName, pdfFileSize, isActive, content, thumbnailUrl, mode, initialData?.id, router, locale]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* ================================================================
          섹션 1: 기본 정보
          ================================================================ */}
      <FormSection title="기본 정보">
        <div className="space-y-4">
          {/* 제목 */}
          <Input
            label="제목"
            required
            placeholder="IR 파일 제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
          />

          {/* 카테고리 + 게시일 -- 2열 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="카테고리"
              required
              placeholder="카테고리를 선택하세요"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={IR_CATEGORY_OPTIONS}
              error={errors.category}
            />
            <Input
              label="게시일"
              required
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              error={errors.publishedAt}
            />
          </div>

          {/* 활성 상태 */}
          <Checkbox
            label="활성 상태 (공개)"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        </div>
      </FormSection>

      {/* ================================================================
          섹션 2: 썸네일 이미지
          ================================================================ */}
      <FormSection title="썸네일 이미지">
        <ImageUploader
          label="썸네일 이미지"
          value={thumbnailUrl}
          onChange={setThumbnailUrl}
          bucket="ir-files"
          maxSize={2 * 1024 * 1024}
        />
      </FormSection>

      {/* ================================================================
          섹션 3: 본문 내용
          ================================================================ */}
      <FormSection title="본문 내용">
        <Textarea
          label="본문 내용"
          rows={8}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="IR 자료의 본문 내용을 입력하세요"
        />
      </FormSection>

      {/* ================================================================
          섹션 4: PDF 파일
          ================================================================ */}
      <FormSection title="PDF 파일">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleInputChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        {pdfUrl && !isUploading ? (
          /* 업로드 완료 상태 */
          <div className="flex items-center gap-3 p-4 border border-gray-200 squircle-md bg-gray-50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center squircle-sm bg-error/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-error" aria-hidden="true">
                <path d="M5 3C5 2.44772 5.44772 2 6 2H11L15 6V17C15 17.5523 14.5523 18 14 18H6C5.44772 18 5 17.5523 5 17V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M11 2V6H15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <text x="7" y="14" fill="currentColor" fontSize="5" fontWeight="bold">PDF</text>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{pdfFileName}</p>
              {pdfFileSize && (
                <p className="text-xs text-gray-400">{bytesToMB(pdfFileSize)} MB</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleRemovePdf}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
              aria-label="파일 삭제"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : isUploading ? (
          /* 업로드 진행 중 */
          <div className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 squircle-lg">
            <svg className="animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-medium text-gray-600">업로드 중... {uploadProgress}%</p>
            <div className="w-full max-w-xs h-2 bg-gray-200 squircle-xs overflow-hidden">
              <div
                className="h-full bg-primary squircle-xs transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        ) : (
          /* 기본 드래그앤드롭 영역 */
          <div
            className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed squircle-lg cursor-pointer transition-all ${
              isDragOver
                ? "border-primary bg-primary/5"
                : uploadError || errors.pdfUrl
                  ? "border-error/50 hover:border-error"
                  : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="PDF 파일을 드래그하거나 클릭하여 선택"
          >
            <svg
              className={isDragOver ? "text-primary" : "text-gray-400"}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              width="36"
              height="36"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            <div className="text-center">
              <p className={`text-sm font-medium ${isDragOver ? "text-primary" : "text-gray-600"}`}>
                PDF 파일을 드래그하거나 클릭하여 선택
              </p>
              <p className="mt-1 text-xs text-gray-400">
                PDF / 최대 50MB
              </p>
            </div>
          </div>
        )}

        {uploadError && (
          <p className="mt-2 text-sm text-error" role="alert">{uploadError}</p>
        )}
        {!uploadError && errors.pdfUrl && (
          <p className="mt-2 text-sm text-error" role="alert">{errors.pdfUrl}</p>
        )}
      </FormSection>

      {/* ================================================================
          하단 Sticky 버튼 바
          ================================================================ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* 좌측: 취소 */}
          <Button
            variant="outline"
            size="md"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            취소
          </Button>

          {/* 우측: 등록/수정 */}
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || isUploading}
          >
            {mode === "create" ? "등록하기" : "수정하기"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { IrFileFormProps };
