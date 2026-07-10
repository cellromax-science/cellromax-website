"use client";

import { useState, useCallback, useRef } from "react";

/* ==========================================================================
   ImageUploader Component — Cellromax Admin Design System

   관리자 페이지용 이미지 업로드 컴포넌트.
   - 드래그 앤 드롭 + 클릭 파일 선택 지원
   - 클라이언트 측 파일 유효성 검증 (형식, 크기)
   - XMLHttpRequest 기반 업로드 프로그레스 표시
   - 업로드 완료 후 이미지 미리보기 + 삭제 기능
   - Supabase Storage 연동 (/api/upload 엔드포인트)
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImageUploaderProps {
  /** 업로드된 이미지 URL (편집 모드에서 기존 이미지 표시) */
  value?: string | null;
  /** URL 변경 콜백 */
  onChange: (url: string | null) => void;
  /** Storage 버킷 이름 (기본: 'products') */
  bucket?: string;
  /** 최대 파일 크기 (bytes, 기본: 2MB) */
  maxSize?: number;
  /** 라벨 텍스트 */
  label?: string;
  /** 필수 여부 */
  required?: boolean;
  /** 에러 메시지 */
  error?: string;
  /** 비활성화 */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 허용되는 MIME 타입 목록 */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** accept 속성용 문자열 */
const ACCEPT_STRING = ACCEPTED_TYPES.join(",");

/** 허용 확장자 안내 텍스트 */
const FORMAT_LABEL = "JPG, PNG, WebP";

/** 기본 최대 파일 크기: 2MB */
const DEFAULT_MAX_SIZE = 2 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 바이트를 사람이 읽을 수 있는 MB 단위로 변환 */
function bytesToMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(0);
}

/** 파일 형식 유효성 검사 */
function isValidFileType(file: File): boolean {
  return (ACCEPTED_TYPES as readonly string[]).includes(file.type);
}

/** 파일 크기 유효성 검사 */
function isValidFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize;
}

// ---------------------------------------------------------------------------
// Icons (인라인 SVG)
// ---------------------------------------------------------------------------

/** 업로드 아이콘 — 클라우드 + 화살표 */
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width="40"
      height="40"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
      />
    </svg>
  );
}

/** 삭제 아이콘 — X 표시 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18 18 6M6 6l12 12"
      />
    </svg>
  );
}

/** 로딩 스피너 */
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={["animate-spin", className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ImageUploader Component
// ---------------------------------------------------------------------------

/**
 * 관리자 페이지용 이미지 업로더 컴포넌트
 *
 * @example
 * ```tsx
 * const [imageUrl, setImageUrl] = useState<string | null>(null);
 *
 * <ImageUploader
 *   value={imageUrl}
 *   onChange={setImageUrl}
 *   label="제품 이미지"
 *   required
 *   bucket="products"
 *   maxSize={2 * 1024 * 1024}
 * />
 * ```
 */
export function ImageUploader({
  value = null,
  onChange,
  bucket = "products",
  maxSize = DEFAULT_MAX_SIZE,
  label,
  required = false,
  error: externalError,
  disabled = false,
}: ImageUploaderProps) {
  // ---- State ----
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [internalError, setInternalError] = useState<string | null>(null);

  // ---- Refs ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // 표시할 에러 메시지: 외부 prop 우선, 내부 에러 폴백
  const displayError = externalError || internalError;

  // 이미지가 이미 존재하는지 여부
  const hasImage = !!value;

  // --------------------------------------------------------------------------
  // File Validation
  // --------------------------------------------------------------------------

  /** 파일 유효성 검사 후 에러 메시지 반환 (통과 시 null) */
  const validateFile = useCallback(
    (file: File): string | null => {
      if (!isValidFileType(file)) {
        return `허용되지 않는 파일 형식입니다. ${FORMAT_LABEL} 파일만 업로드할 수 있습니다.`;
      }
      if (!isValidFileSize(file, maxSize)) {
        return `파일 크기가 ${bytesToMB(maxSize)}MB를 초과합니다.`;
      }
      return null;
    },
    [maxSize],
  );

  // --------------------------------------------------------------------------
  // Upload Handler
  // --------------------------------------------------------------------------

  /**
   * 파일 업로드 (2단계)
   *
   * Vercel 서버리스 함수의 요청 본문 제한(4.5MB)을 우회하기 위해,
   * 파일 바이트는 우리 API 함수를 거치지 않고 Supabase Storage로 직접 전송한다.
   *   1단계: /api/upload 에 작은 JSON을 보내 서명 업로드 URL을 발급받는다.
   *   2단계: 발급받은 서명 URL로 파일을 직접 PUT한다 (프로그레스 지원 위해 XHR 사용).
   */
  const uploadFile = useCallback(
    async (file: File) => {
      setInternalError(null);
      setIsUploading(true);
      setProgress(0);

      // ---- 1단계: 서명 업로드 URL 발급 (작은 JSON 요청) ----
      let signedUrl: string;
      let publicUrl: string;
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
            bucket,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setInternalError(data?.error ?? "이미지 업로드에 실패했습니다.");
          setIsUploading(false);
          setProgress(0);
          return;
        }

        signedUrl = data?.signedUrl;
        publicUrl = data?.publicUrl;

        if (!signedUrl || !publicUrl) {
          setInternalError("서버 응답에서 업로드 정보를 찾을 수 없습니다.");
          setIsUploading(false);
          setProgress(0);
          return;
        }
      } catch {
        setInternalError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
        setIsUploading(false);
        setProgress(0);
        return;
      }

      // ---- 2단계: Supabase Storage로 파일 직접 PUT ----
      // IrFileForm의 PDF 업로드와 동일한 방식 (서명 URL로 raw body PUT)
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      // 업로드 진행률 추적
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      });

      // 업로드 완료
      xhr.addEventListener("load", () => {
        xhrRef.current = null;

        if (xhr.status >= 200 && xhr.status < 300) {
          onChange(publicUrl);
        } else {
          // HTTP 에러 처리
          let errorMessage = "이미지 업로드에 실패했습니다.";
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            if (errorResponse.error || errorResponse.message) {
              errorMessage = errorResponse.error || errorResponse.message;
            }
          } catch {
            // JSON 파싱 실패 시 기본 에러 메시지 사용
          }
          setInternalError(errorMessage);
        }

        setIsUploading(false);
        setProgress(0);
      });

      // 네트워크 에러
      xhr.addEventListener("error", () => {
        xhrRef.current = null;
        setInternalError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
        setIsUploading(false);
        setProgress(0);
      });

      // 업로드 취소
      xhr.addEventListener("abort", () => {
        xhrRef.current = null;
        setIsUploading(false);
        setProgress(0);
      });

      xhr.open("PUT", signedUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    },
    [bucket, onChange],
  );

  // --------------------------------------------------------------------------
  // File Processing
  // --------------------------------------------------------------------------

  /** 파일 선택 또는 드롭 시 처리 */
  const handleFile = useCallback(
    (file: File) => {
      // 클라이언트 검증
      const validationError = validateFile(file);
      if (validationError) {
        setInternalError(validationError);
        return;
      }

      // 검증 통과 — 업로드 시작
      uploadFile(file);
    },
    [validateFile, uploadFile],
  );

  // --------------------------------------------------------------------------
  // Event Handlers — Drag & Drop
  // --------------------------------------------------------------------------

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading) {
        setIsDragOver(true);
      }
    },
    [disabled, isUploading],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // relatedTarget이 드롭 영역 내부 요소가 아닐 때만 해제
      const currentTarget = e.currentTarget as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (!currentTarget.contains(relatedTarget)) {
        setIsDragOver(false);
      }
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading) {
        e.dataTransfer.dropEffect = "copy";
      }
    },
    [disabled, isUploading],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled || isUploading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, isUploading, handleFile],
  );

  // --------------------------------------------------------------------------
  // Event Handlers — File Input
  // --------------------------------------------------------------------------

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // input 값 초기화 (같은 파일 재선택 허용)
      e.target.value = "";
    },
    [handleFile],
  );

  /** 드롭 영역 클릭 시 파일 선택 다이얼로그 열기 */
  const handleDropZoneClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  /** 키보드 접근성: Enter/Space로 파일 선택 다이얼로그 열기 */
  const handleDropZoneKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled && !isUploading) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled, isUploading],
  );

  // --------------------------------------------------------------------------
  // Event Handlers — Delete
  // --------------------------------------------------------------------------

  /** 이미지 삭제 (미리보기 제거 + onChange(null) 호출) */
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled) {
        onChange(null);
        setInternalError(null);
      }
    },
    [disabled, onChange],
  );

  // --------------------------------------------------------------------------
  // Render — 드롭 영역 클래스 조합
  // --------------------------------------------------------------------------

  const dropZoneClasses = [
    // 기본 레이아웃
    "relative flex flex-col items-center justify-center",
    "w-full min-h-[200px]",
    // 테두리
    "border-2 border-dashed squircle-lg",
    // 트랜지션
    "transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
    // 커서
    !disabled && !isUploading && !hasImage ? "cursor-pointer" : "",
    // 상태별 스타일링
    isDragOver && !disabled
      ? "border-primary bg-primary/5"
      : displayError
        ? "border-error/50 bg-error/5"
        : "border-gray-300 hover:border-gray-400",
    // 비활성화 상태
    disabled && "opacity-50 cursor-not-allowed",
  ]
    .filter(Boolean)
    .join(" ");

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="w-full">
      {/* ---- 라벨 ---- */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && (
            <span className="text-error ml-0.5" aria-label="필수 항목">
              *
            </span>
          )}
        </label>
      )}

      {/* ---- 숨겨진 파일 입력 ---- */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* ---- 드롭 영역 / 미리보기 영역 ---- */}
      <div
        className={dropZoneClasses}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!hasImage ? handleDropZoneClick : undefined}
        onKeyDown={!hasImage ? handleDropZoneKeyDown : undefined}
        role={!hasImage ? "button" : undefined}
        tabIndex={!hasImage && !disabled ? 0 : undefined}
        aria-label={
          !hasImage
            ? "이미지를 드래그하거나 클릭하여 선택"
            : "업로드된 이미지 미리보기"
        }
        aria-disabled={disabled || undefined}
      >
        {/* ======== 업로드 완료 상태: 이미지 미리보기 ======== */}
        {hasImage && !isUploading && (
          <div className="relative w-full">
            {/* 미리보기 이미지 */}
            <div className="flex items-center justify-center p-4">
              <img
                src={value}
                alt="업로드된 이미지 미리보기"
                className="max-h-[240px] w-auto object-contain squircle-sm"
              />
            </div>

            {/* 삭제 버튼 — 오른쪽 상단 */}
            {!disabled && (
              <button
                type="button"
                onClick={handleDelete}
                className={[
                  "absolute top-2 right-2",
                  "flex items-center justify-center",
                  "w-7 h-7 rounded-full",
                  "bg-error text-white",
                  "shadow-md",
                  "transition-all duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
                  "hover:bg-error-dark hover:scale-110",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2",
                ].join(" ")}
                aria-label="이미지 삭제"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        )}

        {/* ======== 업로드 진행 중: 프로그레스 오버레이 ======== */}
        {isUploading && (
          <div className="flex flex-col items-center justify-center gap-4 py-8 px-4 w-full">
            {/* 스피너 */}
            <Spinner className="text-primary" />

            {/* 진행률 텍스트 */}
            <p className="text-sm font-medium text-gray-600">
              업로드 중... {progress}%
            </p>

            {/* 프로그레스 바 */}
            <div className="w-full max-w-xs h-2 bg-gray-200 squircle-xs overflow-hidden">
              <div
                className="h-full bg-primary squircle-xs transition-all duration-[200ms] ease-[cubic-bezier(0,0,0.2,1)]"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`업로드 진행률 ${progress}%`}
              />
            </div>
          </div>
        )}

        {/* ======== 기본 상태: 업로드 안내 ======== */}
        {!hasImage && !isUploading && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 px-4">
            {/* 업로드 아이콘 */}
            <UploadIcon
              className={
                isDragOver ? "text-primary" : "text-gray-400"
              }
            />

            {/* 안내 텍스트 */}
            <div className="text-center">
              <p
                className={[
                  "text-sm font-medium",
                  isDragOver ? "text-primary" : "text-gray-600",
                ].join(" ")}
              >
                이미지를 드래그하거나 클릭하여 선택
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {FORMAT_LABEL} / 최대 {bytesToMB(maxSize)}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ---- 에러 메시지 ---- */}
      {displayError && (
        <p className="mt-2 text-sm text-error" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}

export type { ImageUploaderProps };
