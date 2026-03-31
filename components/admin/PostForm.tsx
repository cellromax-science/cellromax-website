"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { toast } from "@/components/ui/Toast";

import type { Post, Attachment } from "@/types/newsroom";

/* ==========================================================================
   PostForm Component -- Cellromax Admin

   관리자 페이지 게시글(뉴스룸) 등록/수정 폼 컴포넌트.
   - mode: 'create' (신규 등록) / 'edit' (기존 게시글 수정)
   - 4개 섹션으로 구분된 카드 기반 레이아웃
   - 다국어(한/영/중/베) 입력 필드 지원
   - YouTube URL 자동 파싱 및 미리보기
   - 이미지 업로더 (썸네일, 갤러리)
   - sticky 하단 버튼 바 (취소 / 임시저장 / 게시)
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostFormProps {
  /** 'create' 또는 'edit' */
  mode: "create" | "edit";
  /** 수정 모드에서 기존 게시글 데이터 */
  initialData?: Post;
}

/** 게시 유형 Select 옵션 */
const POST_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "notice", label: "공지사항" },
  { value: "news", label: "회사소식" },
  { value: "video", label: "홍보영상" },
];

/** 갤러리 이미지 최대 개수 */
const MAX_GALLERY_IMAGES = 5;

/** 빈 문자열을 null로 변환 */
function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * YouTube URL에서 영상 ID를 추출합니다.
 *
 * 지원 형식:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
    /(?:youtube\.com\/shorts\/)([^?\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Section Card Wrapper
// ---------------------------------------------------------------------------

/** 섹션별 흰색 배경 카드 래퍼 */
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow-sm border border-gray-100 squircle-lg p-6">
      {/* 섹션 제목 */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {/* 골드 디바이더 */}
      <div className="h-px bg-gradient-to-r from-secondary via-secondary-light to-transparent mb-6" />
      {/* 섹션 콘텐츠 */}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

/** 인라인 토글 스위치 */
function ToggleSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
          value ? "bg-primary" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostForm Component
// ---------------------------------------------------------------------------

export function PostForm({ mode, initialData }: PostFormProps) {
  const router = useRouter();
  const pathname = usePathname();

  // 현재 locale 추출 (e.g. /ko/admin/newsroom -> 'ko')
  const locale = pathname.split("/")[1];

  // --------------------------------------------------------------------------
  // Form State
  // --------------------------------------------------------------------------

  // 기본 정보
  const [postType, setPostType] = useState<string>(
    initialData?.post_type ?? ""
  );
  const [titleKo, setTitleKo] = useState(initialData?.title_ko ?? "");
  const [titleEn, setTitleEn] = useState(initialData?.title_en ?? "");
  const [titleZh, setTitleZh] = useState(initialData?.title_zh ?? "");
  const [titleVi, setTitleVi] = useState(initialData?.title_vi ?? "");
  const [isPinned, setIsPinned] = useState(initialData?.is_pinned ?? false);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [publishedAt, setPublishedAt] = useState(() => {
    if (initialData?.published_at) {
      // ISO 문자열을 datetime-local 형식으로 변환 (YYYY-MM-DDTHH:mm)
      const date = new Date(initialData.published_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    return "";
  });

  // 이미지
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    initialData?.thumbnail_url ?? null
  );
  const [galleryImages, setGalleryImages] = useState<(string | null)[]>(
    initialData?.images?.length ? initialData.images : []
  );

  // 영상 정보
  const [youtubeUrl, setYoutubeUrl] = useState(() => {
    if (initialData?.youtube_id) {
      return `https://www.youtube.com/watch?v=${initialData.youtube_id}`;
    }
    return "";
  });

  // 첨부파일
  const [attachments, setAttachments] = useState<Attachment[]>(
    initialData?.attachments ?? []
  );
  const [isUploading, setIsUploading] = useState(false);

  // 본문 내용
  const [contentKo, setContentKo] = useState(initialData?.content_ko ?? "");
  const [contentEn, setContentEn] = useState(initialData?.content_en ?? "");
  const [contentZh, setContentZh] = useState(initialData?.content_zh ?? "");
  const [contentVi, setContentVi] = useState(initialData?.content_vi ?? "");

  // --------------------------------------------------------------------------
  // Submit State
  // --------------------------------------------------------------------------

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftSubmitting, setIsDraftSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --------------------------------------------------------------------------
  // Derived State
  // --------------------------------------------------------------------------

  /** 현재 YouTube URL에서 추출된 영상 ID */
  const currentYouTubeId = youtubeUrl.trim()
    ? extractYouTubeId(youtubeUrl.trim())
    : null;

  // --------------------------------------------------------------------------
  // Gallery Image Handlers
  // --------------------------------------------------------------------------

  // --------------------------------------------------------------------------
  // Attachment Handlers
  // --------------------------------------------------------------------------

  /** 첨부파일 업로드 */
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newAttachments: Attachment[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", "newsroom");

        const res = await fetch("/api/upload-file", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `${file.name} 업로드 실패`);
        }

        const data = await res.json();
        newAttachments.push({
          url: data.url,
          name: data.name,
          size: data.size,
          type: data.type,
        });
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
      toast.success(`${newAttachments.length}개 파일이 업로드되었습니다.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "파일 업로드에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }, []);

  /** 첨부파일 삭제 */
  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // --------------------------------------------------------------------------
  // Gallery Image Handlers
  // --------------------------------------------------------------------------

  /** 갤러리 이미지 추가 슬롯 */
  const addGallerySlot = useCallback(() => {
    if (galleryImages.length < MAX_GALLERY_IMAGES) {
      setGalleryImages((prev) => [...prev, null]);
    }
  }, [galleryImages.length]);

  /** 갤러리 이미지 업로드 완료/삭제 */
  const updateGalleryImage = useCallback(
    (index: number, url: string | null) => {
      setGalleryImages((prev) => {
        const next = [...prev];
        next[index] = url;
        return next;
      });
    },
    []
  );

  /** 갤러리 이미지 슬롯 삭제 */
  const removeGallerySlot = useCallback((index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!postType) {
      newErrors.postType = "게시 유형을 선택해주세요.";
    }
    if (!titleKo.trim()) {
      newErrors.titleKo = "제목(한국어)은 필수 항목입니다.";
    }
    if (postType === "video") {
      const extractedId = youtubeUrl.trim()
        ? extractYouTubeId(youtubeUrl.trim())
        : null;
      if (!extractedId) {
        newErrors.youtubeUrl =
          "올바른 YouTube URL을 입력해주세요.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [postType, titleKo, youtubeUrl]);

  // --------------------------------------------------------------------------
  // Build Request Body
  // --------------------------------------------------------------------------

  const buildRequestBody = useCallback(
    (overrideActive?: boolean) => {
      // 갤러리 이미지: null 제거, 유효한 URL만 전송
      const validImages = galleryImages.filter(
        (url): url is string => url != null && url.trim() !== ""
      );

      // YouTube ID 추출
      const youtubeId = youtubeUrl.trim()
        ? extractYouTubeId(youtubeUrl.trim())
        : null;

      return {
        post_type: postType,
        title_ko: titleKo.trim(),
        title_en: emptyToNull(titleEn),
        title_zh: emptyToNull(titleZh),
        title_vi: emptyToNull(titleVi),
        content_ko: emptyToNull(contentKo),
        content_en: emptyToNull(contentEn),
        content_zh: emptyToNull(contentZh),
        content_vi: emptyToNull(contentVi),
        youtube_id: youtubeId,
        thumbnail_url: thumbnailUrl,
        images: validImages,
        attachments,
        is_pinned: isPinned,
        is_active: overrideActive ?? isActive,
        published_at: publishedAt || undefined,
      };
    },
    [
      postType,
      titleKo,
      titleEn,
      titleZh,
      titleVi,
      contentKo,
      contentEn,
      contentZh,
      contentVi,
      youtubeUrl,
      thumbnailUrl,
      galleryImages,
      attachments,
      isPinned,
      isActive,
      publishedAt,
    ]
  );

  // --------------------------------------------------------------------------
  // Submit Handlers
  // --------------------------------------------------------------------------

  /** 게시하기 (is_active = true) */
  const handlePublish = useCallback(async () => {
    if (!validate()) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const body = buildRequestBody(true);
      const url =
        mode === "create"
          ? "/api/posts"
          : `/api/posts/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || errorData?.message || "게시글 저장에 실패했습니다."
        );
      }

      toast.success(
        mode === "create"
          ? "게시글이 등록되었습니다."
          : "게시글이 수정되었습니다."
      );
      router.push(`/${locale}/admin/posts`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "게시글 저장에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, buildRequestBody, mode, initialData?.id, router, locale]);

  /** 임시저장 (is_active = false) */
  const handleDraft = useCallback(async () => {
    // 임시저장은 최소 필수 필드만 검사
    const newErrors: Record<string, string> = {};

    if (!postType) {
      newErrors.postType = "게시 유형을 선택해주세요.";
    }
    if (!titleKo.trim()) {
      newErrors.titleKo = "제목(한국어)은 필수 항목입니다.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("게시 유형과 제목을 입력해주세요.");
      return;
    }

    setIsDraftSubmitting(true);
    try {
      const body = buildRequestBody(false);
      const url =
        mode === "create"
          ? "/api/posts"
          : `/api/posts/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error ||
            errorData?.message ||
            "임시저장에 실패했습니다."
        );
      }

      toast.success("임시저장되었습니다.");
      router.push(`/${locale}/admin/posts`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "임시저장에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsDraftSubmitting(false);
    }
  }, [postType, titleKo, buildRequestBody, mode, initialData?.id, router, locale]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  const isAnySubmitting = isSubmitting || isDraftSubmitting || isUploading;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* ================================================================
          섹션 1: 기본 정보
          ================================================================ */}
      <FormSection title="기본 정보">
        {/* 게시 유형 */}
        <div className="mb-4">
          <Select
            label="게시 유형"
            required
            value={postType}
            onChange={(e) => setPostType(e.target.value)}
            options={POST_TYPE_OPTIONS}
            placeholder="게시 유형을 선택하세요"
            error={errors.postType}
          />
        </div>

        {/* 제목 다국어 -- 2열 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            label="제목 (한국어)"
            required
            value={titleKo}
            onChange={(e) => setTitleKo(e.target.value)}
            placeholder="게시글 제목을 입력하세요"
            error={errors.titleKo}
          />
          <Input
            label="제목 (영어)"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder="Enter post title"
          />
          <Input
            label="제목 (중국어)"
            value={titleZh}
            onChange={(e) => setTitleZh(e.target.value)}
            placeholder="请输入标题"
          />
          <Input
            label="제목 (베트남어)"
            value={titleVi}
            onChange={(e) => setTitleVi(e.target.value)}
            placeholder="Nhap tieu de"
          />
        </div>

        {/* 토글 스위치 + 게시 일시 */}
        <div className="flex flex-wrap items-center gap-8">
          <ToggleSwitch
            label="상단 고정"
            value={isPinned}
            onChange={setIsPinned}
          />
          <ToggleSwitch
            label="노출 여부"
            value={isActive}
            onChange={setIsActive}
          />
          <div className="w-56">
            <Input
              label="게시 일시"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
          </div>
        </div>
      </FormSection>

      {/* ================================================================
          섹션 2: 이미지
          ================================================================ */}
      <FormSection title="이미지">
        {/* 썸네일 */}
        <div className="mb-6">
          <ImageUploader
            label="썸네일 이미지"
            value={thumbnailUrl}
            onChange={setThumbnailUrl}
            bucket="posts"
            maxSize={2 * 1024 * 1024}
          />
        </div>

        {/* 갤러리 이미지 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              갤러리 이미지{" "}
              <span className="text-gray-400 font-normal">
                ({galleryImages.length}/{MAX_GALLERY_IMAGES})
              </span>
            </label>
            {galleryImages.length < MAX_GALLERY_IMAGES && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={addGallerySlot}
                disabled={isAnySubmitting}
              >
                <PlusIcon />
                이미지 추가
              </Button>
            )}
          </div>

          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {galleryImages.map((url, index) => (
                <div key={index} className="relative">
                  <ImageUploader
                    label={`갤러리 ${index + 1}`}
                    value={url}
                    onChange={(newUrl) => updateGalleryImage(index, newUrl)}
                    bucket="posts"
                    maxSize={2 * 1024 * 1024}
                  />
                  {/* 슬롯 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() => removeGallerySlot(index)}
                    className="absolute top-0 right-0 -mt-2 -mr-2 flex items-center justify-center w-6 h-6 rounded-full bg-error text-white shadow-sm hover:bg-error-dark transition-colors duration-150 z-10"
                    aria-label={`갤러리 이미지 ${index + 1} 삭제`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      width="12"
                      height="12"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center border-2 border-dashed border-gray-200 squircle-lg">
              아직 갤러리 이미지가 없습니다. &quot;이미지 추가&quot; 버튼을
              클릭하여 추가하세요.
            </p>
          )}
        </div>
      </FormSection>

      {/* ================================================================
          섹션 3: 영상 정보 (post_type이 'video'일 때만 표시)
          ================================================================ */}
      {postType === "video" && (
        <FormSection title="영상 정보">
          {/* YouTube URL 입력 */}
          <div className="mb-4">
            <Input
              label="YouTube URL"
              required
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
              helperText="YouTube 영상의 URL을 입력하면 자동으로 영상 ID가 추출됩니다."
              error={errors.youtubeUrl}
            />
          </div>

          {/* YouTube 미리보기 */}
          {currentYouTubeId ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                영상 미리보기
              </label>
              <div className="relative w-full aspect-video squircle-lg overflow-hidden border border-gray-200">
                <iframe
                  src={`https://www.youtube.com/embed/${currentYouTubeId}`}
                  title="YouTube 영상 미리보기"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                영상 ID: <code className="px-1.5 py-0.5 bg-gray-100 squircle-sm text-gray-700">{currentYouTubeId}</code>
              </p>
            </div>
          ) : youtubeUrl.trim() ? (
            <div className="flex items-center gap-2 p-3 bg-warning/10 text-warning-dark squircle-md">
              <WarningIcon />
              <p className="text-sm font-medium">
                올바른 YouTube URL을 입력해주세요.
              </p>
            </div>
          ) : null}
        </FormSection>
      )}

      {/* ================================================================
          섹션 4: 본문 내용
          ================================================================ */}
      <FormSection title="본문 내용">
        <div className="grid grid-cols-1 gap-4">
          <RichTextEditor
            label="본문 (한국어)"
            value={contentKo}
            onChange={setContentKo}
            placeholder="게시글 본문을 입력하세요"
          />
          <RichTextEditor
            label="본문 (영어)"
            value={contentEn}
            onChange={setContentEn}
            placeholder="Enter post content"
          />
          <RichTextEditor
            label="본문 (중국어)"
            value={contentZh}
            onChange={setContentZh}
            placeholder="请输入正文内容"
          />
          <RichTextEditor
            label="본문 (베트남어)"
            value={contentVi}
            onChange={setContentVi}
            placeholder="Nhập nội dung bài viết"
          />
        </div>
      </FormSection>

      {/* ================================================================
          섹션 5: 첨부파일
          ================================================================ */}
      <FormSection title="첨부파일">
        {/* 업로드 영역 */}
        <div className="mb-4">
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed squircle-lg cursor-pointer transition-colors duration-150 ${
              isUploading
                ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                : "border-gray-300 hover:border-primary hover:bg-primary/5"
            }`}
          >
            {isUploading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm font-medium">업로드 중...</span>
              </div>
            ) : (
              <>
                <UploadIcon />
                <p className="mt-2 text-sm text-gray-500">
                  클릭하여 파일을 선택하거나 드래그하여 업로드
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, Word, Excel, PPT, HWP, ZIP (최대 50MB)
                </p>
              </>
            )}
            <input
              id="file-upload"
              type="file"
              className="hidden"
              multiple
              disabled={isUploading || isAnySubmitting}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.zip"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </label>
        </div>

        {/* 첨부파일 목록 */}
        {attachments.length > 0 ? (
          <ul className="space-y-2">
            {attachments.map((file, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 squircle-md border border-gray-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon type={file.type} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  disabled={isAnySubmitting}
                  className="shrink-0 p-1.5 text-gray-400 hover:text-error transition-colors duration-150"
                  aria-label={`${file.name} 삭제`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="16" height="16" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 text-center py-2">
            첨부된 파일이 없습니다.
          </p>
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
            disabled={isAnySubmitting}
          >
            취소
          </Button>

          {/* 우측: 임시저장 + 게시하기 */}
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={handleDraft}
              loading={isDraftSubmitting}
              disabled={isAnySubmitting}
            >
              임시저장
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handlePublish}
              loading={isSubmitting}
              disabled={isAnySubmitting}
            >
              {mode === "create" ? "게시하기" : "수정하기"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Icon Components
// ---------------------------------------------------------------------------

/** + 아이콘 (갤러리 이미지 추가 버튼용) */
function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

/** 경고 아이콘 (YouTube URL 오류 표시용) */
function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  );
}

/** 파일 크기를 읽기 쉬운 형태로 포맷팅 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** 업로드 아이콘 */
function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width="24"
      height="24"
      aria-hidden="true"
      className="text-gray-400"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

/** 파일 타입별 아이콘 */
function FileIcon({ type }: { type: string }) {
  const isPdf = type === "application/pdf";
  const isWord = type.includes("word") || type.includes("document");
  const isExcel = type.includes("excel") || type.includes("spreadsheet");
  const isPpt = type.includes("powerpoint") || type.includes("presentation");

  let color = "text-gray-400";
  if (isPdf) color = "text-red-500";
  else if (isWord) color = "text-blue-500";
  else if (isExcel) color = "text-green-500";
  else if (isPpt) color = "text-orange-500";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width="20"
      height="20"
      aria-hidden="true"
      className={`shrink-0 ${color}`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

export type { PostFormProps };
