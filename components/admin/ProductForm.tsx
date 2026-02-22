"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { toast } from "@/components/ui/Toast";

import type {
  Product,
  ProductCategory,
  ProductSubcategory,
} from "@/types/product";

/* ==========================================================================
   ProductForm Component -- Cellromax Admin

   관리자 페이지 제품 등록/수정 폼 컴포넌트.
   - mode: 'create' (신규 등록) / 'edit' (기존 제품 수정)
   - 8개 섹션으로 구분된 카드 기반 레이아웃
   - 다국어(한/영/중/베) 입력 필드 지원
   - 하위카테고리 동적 로드
   - URL 슬러그 자동/수동 생성
   - 이미지 업로더 (썸네일, 갤러리, 상세페이지, 영양정보)
   - sticky 하단 버튼 바 (취소 / 임시저장 / 게시)
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductFormProps {
  /** 'create' 또는 'edit' */
  mode: "create" | "edit";
  /** 수정 모드에서 기존 제품 데이터 */
  initialData?: Product;
}

/** 카테고리 Select 옵션 */
const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "health_functional", label: "건강기능식품" },
  { value: "general_food", label: "일반식품" },
  { value: "cosmetic", label: "화장품" },
  { value: "medicine", label: "의약품" },
  { value: "nutra_pet", label: "뉴트라펫" },
  { value: "other", label: "기타" },
];

/** 갤러리 이미지 최대 개수 */
const MAX_GALLERY_IMAGES = 5;

/** 빈 문자열을 null로 변환 */
function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** 슬러그 자동 생성: 공백 -> 하이픈, 특수문자 제거, 소문자 변환 */
function generateSlug(nameKo: string): string {
  return nameKo
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w가-힣-]/g, "")
    .replace(/-+/g, "-");
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
// ProductForm Component
// ---------------------------------------------------------------------------

export function ProductForm({ mode, initialData }: ProductFormProps) {
  const router = useRouter();
  const pathname = usePathname();

  // 현재 locale 추출 (e.g. /ko/admin/products -> 'ko')
  const locale = pathname.split("/")[1];

  // --------------------------------------------------------------------------
  // Form State
  // --------------------------------------------------------------------------

  // 기본 정보
  const [nameKo, setNameKo] = useState(initialData?.name_ko ?? "");
  const [nameEn, setNameEn] = useState(initialData?.name_en ?? "");
  const [nameZh, setNameZh] = useState(initialData?.name_zh ?? "");
  const [nameVi, setNameVi] = useState(initialData?.name_vi ?? "");
  const [category, setCategory] = useState<string>(
    initialData?.category ?? ""
  );
  const [subcategoryId, setSubcategoryId] = useState<string>(
    initialData?.subcategory_id ?? ""
  );
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [isSlugManual, setIsSlugManual] = useState(mode === "edit");
  const [isNew, setIsNew] = useState(initialData?.is_new ?? false);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(
    String(initialData?.sort_order ?? 0)
  );

  // 이미지
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    initialData?.thumbnail_url ?? null
  );
  const [galleryImages, setGalleryImages] = useState<(string | null)[]>(
    initialData?.images?.length ? initialData.images : []
  );
  const [detailImageUrl, setDetailImageUrl] = useState<string | null>(
    initialData?.detail_image_url ?? null
  );
  const [nutritionImageUrl, setNutritionImageUrl] = useState<string | null>(
    initialData?.nutrition_image_url ?? null
  );

  // 성분 정보
  const [ingredientsKo, setIngredientsKo] = useState(
    initialData?.ingredients_ko ?? ""
  );
  const [ingredientsEn, setIngredientsEn] = useState(
    initialData?.ingredients_en ?? ""
  );
  const [ingredientsZh, setIngredientsZh] = useState(
    initialData?.ingredients_zh ?? ""
  );
  const [ingredientsVi, setIngredientsVi] = useState(
    initialData?.ingredients_vi ?? ""
  );

  // 기능성 정보
  const [functionalityKo, setFunctionalityKo] = useState(
    initialData?.functionality_ko ?? ""
  );
  const [functionalityEn, setFunctionalityEn] = useState(
    initialData?.functionality_en ?? ""
  );
  const [functionalityZh, setFunctionalityZh] = useState(
    initialData?.functionality_zh ?? ""
  );
  const [functionalityVi, setFunctionalityVi] = useState(
    initialData?.functionality_vi ?? ""
  );

  // 섭취량 및 섭취방법
  const [howToUseKo, setHowToUseKo] = useState(
    initialData?.how_to_use_ko ?? ""
  );
  const [howToUseEn, setHowToUseEn] = useState(
    initialData?.how_to_use_en ?? ""
  );
  const [howToUseZh, setHowToUseZh] = useState(
    initialData?.how_to_use_zh ?? ""
  );
  const [howToUseVi, setHowToUseVi] = useState(
    initialData?.how_to_use_vi ?? ""
  );

  // 기타정보
  const [otherInfoKo, setOtherInfoKo] = useState(
    initialData?.other_info_ko ?? ""
  );
  const [otherInfoEn, setOtherInfoEn] = useState(
    initialData?.other_info_en ?? ""
  );
  const [otherInfoZh, setOtherInfoZh] = useState(
    initialData?.other_info_zh ?? ""
  );
  const [otherInfoVi, setOtherInfoVi] = useState(
    initialData?.other_info_vi ?? ""
  );

  // --------------------------------------------------------------------------
  // Subcategory State
  // --------------------------------------------------------------------------

  const [subcategories, setSubcategories] = useState<
    { value: string; label: string }[]
  >([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);

  // --------------------------------------------------------------------------
  // Submit State
  // --------------------------------------------------------------------------

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftSubmitting, setIsDraftSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --------------------------------------------------------------------------
  // Slug Auto-generation
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!isSlugManual && nameKo) {
      setSlug(generateSlug(nameKo));
    }
    if (!isSlugManual && !nameKo) {
      setSlug("");
    }
  }, [nameKo, isSlugManual]);

  /** 슬러그 필드 직접 편집 시 자동 생성 비활성화 */
  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsSlugManual(true);
      setSlug(e.target.value);
    },
    []
  );

  /** 자동 생성 토글 */
  const toggleSlugAutoGenerate = useCallback(() => {
    const next = !isSlugManual;
    setIsSlugManual(next);
    if (!next && nameKo) {
      setSlug(generateSlug(nameKo));
    }
  }, [isSlugManual, nameKo]);

  // --------------------------------------------------------------------------
  // Subcategory Dynamic Loading
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!category) {
      setSubcategories([]);
      setSubcategoryId("");
      return;
    }

    let cancelled = false;
    setIsLoadingSubcategories(true);

    fetch(`/api/subcategories?category=${encodeURIComponent(category)}`)
      .then((res) => res.json())
      .then((data: ProductSubcategory[] | { data: ProductSubcategory[] }) => {
        if (cancelled) return;
        // API 응답 구조 호환: 배열 직접 또는 { data: [...] } 형태
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
            ? data.data
            : [];
        setSubcategories(
          list
            .filter((sc) => sc.is_active)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((sc) => ({
              value: sc.id,
              label: sc.name_ko,
            }))
        );
      })
      .catch(() => {
        if (!cancelled) setSubcategories([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSubcategories(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  /** 카테고리 변경 핸들러 */
  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setCategory(e.target.value);
      setSubcategoryId("");
    },
    []
  );

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

    if (!nameKo.trim()) {
      newErrors.nameKo = "제품명(한국어)은 필수 항목입니다.";
    }
    if (!category) {
      newErrors.category = "카테고리를 선택해주세요.";
    }
    if (!slug.trim()) {
      newErrors.slug = "URL 슬러그는 필수 항목입니다.";
    }
    if (!thumbnailUrl) {
      newErrors.thumbnailUrl = "썸네일 이미지를 업로드해주세요.";
    }
    if (!ingredientsKo.trim()) {
      newErrors.ingredientsKo = "주요 성분(한국어)은 필수 항목입니다.";
    }
    if (!functionalityKo.trim()) {
      newErrors.functionalityKo = "기능성(한국어)은 필수 항목입니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [nameKo, category, slug, thumbnailUrl, ingredientsKo, functionalityKo]);

  // --------------------------------------------------------------------------
  // Build Request Body
  // --------------------------------------------------------------------------

  const buildRequestBody = useCallback(
    (overrideActive?: boolean) => {
      // 갤러리 이미지: null 제거, 유효한 URL만 전송
      const validImages = galleryImages.filter(
        (url): url is string => url != null && url.trim() !== ""
      );

      return {
        slug: slug.trim(),
        name_ko: nameKo.trim(),
        name_en: emptyToNull(nameEn),
        name_zh: emptyToNull(nameZh),
        name_vi: emptyToNull(nameVi),
        category: category as ProductCategory,
        subcategory_id: emptyToNull(subcategoryId),
        thumbnail_url: thumbnailUrl,
        images: validImages,
        detail_image_url: detailImageUrl,
        nutrition_image_url: nutritionImageUrl,
        ingredients_ko: emptyToNull(ingredientsKo),
        ingredients_en: emptyToNull(ingredientsEn),
        ingredients_zh: emptyToNull(ingredientsZh),
        ingredients_vi: emptyToNull(ingredientsVi),
        functionality_ko: emptyToNull(functionalityKo),
        functionality_en: emptyToNull(functionalityEn),
        functionality_zh: emptyToNull(functionalityZh),
        functionality_vi: emptyToNull(functionalityVi),
        how_to_use_ko: emptyToNull(howToUseKo),
        how_to_use_en: emptyToNull(howToUseEn),
        how_to_use_zh: emptyToNull(howToUseZh),
        how_to_use_vi: emptyToNull(howToUseVi),
        other_info_ko: emptyToNull(otherInfoKo),
        other_info_en: emptyToNull(otherInfoEn),
        other_info_zh: emptyToNull(otherInfoZh),
        other_info_vi: emptyToNull(otherInfoVi),
        is_active: overrideActive ?? isActive,
        is_new: isNew,
        sort_order: parseInt(sortOrder, 10) || 0,
      };
    },
    [
      slug,
      nameKo,
      nameEn,
      nameZh,
      nameVi,
      category,
      subcategoryId,
      thumbnailUrl,
      galleryImages,
      detailImageUrl,
      nutritionImageUrl,
      ingredientsKo,
      ingredientsEn,
      ingredientsZh,
      ingredientsVi,
      functionalityKo,
      functionalityEn,
      functionalityZh,
      functionalityVi,
      howToUseKo,
      howToUseEn,
      howToUseZh,
      howToUseVi,
      otherInfoKo,
      otherInfoEn,
      otherInfoZh,
      otherInfoVi,
      isActive,
      isNew,
      sortOrder,
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
          ? "/api/products"
          : `/api/products/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || errorData?.message || "제품 저장에 실패했습니다."
        );
      }

      toast.success(
        mode === "create"
          ? "제품이 등록되었습니다."
          : "제품이 수정되었습니다."
      );
      router.push(`/${locale}/admin/products`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "제품 저장에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, buildRequestBody, mode, initialData?.id, router, locale]);

  /** 임시저장 (is_active = false) */
  const handleDraft = useCallback(async () => {
    // 임시저장은 최소 필수 필드만 검사
    if (!nameKo.trim()) {
      setErrors({ nameKo: "제품명(한국어)은 필수 항목입니다." });
      toast.error("제품명을 입력해주세요.");
      return;
    }
    if (!slug.trim()) {
      setErrors((prev) => ({
        ...prev,
        slug: "URL 슬러그는 필수 항목입니다.",
      }));
      toast.error("URL 슬러그를 입력해주세요.");
      return;
    }
    if (!category) {
      setErrors((prev) => ({
        ...prev,
        category: "카테고리를 선택해주세요.",
      }));
      toast.error("카테고리를 선택해주세요.");
      return;
    }

    setIsDraftSubmitting(true);
    try {
      const body = buildRequestBody(false);
      const url =
        mode === "create"
          ? "/api/products"
          : `/api/products/${initialData?.id}`;
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
      router.push(`/${locale}/admin/products`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "임시저장에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsDraftSubmitting(false);
    }
  }, [nameKo, slug, category, buildRequestBody, mode, initialData?.id, router, locale]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  const isAnySubmitting = isSubmitting || isDraftSubmitting;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* ================================================================
          섹션 1: 기본 정보
          ================================================================ */}
      <FormSection title="기본 정보">
        {/* 제품명 다국어 -- 2열 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            label="제품명 (한국어)"
            required
            value={nameKo}
            onChange={(e) => setNameKo(e.target.value)}
            placeholder="예: 셀로맥스 프리미엄 비타민"
            error={errors.nameKo}
          />
          <Input
            label="제품명 (영어)"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="e.g. Cellromax Premium Vitamin"
          />
          <Input
            label="제품명 (중국어)"
            value={nameZh}
            onChange={(e) => setNameZh(e.target.value)}
            placeholder="例: Cellromax 优质维生素"
          />
          <Input
            label="제품명 (베트남어)"
            value={nameVi}
            onChange={(e) => setNameVi(e.target.value)}
            placeholder="VD: Cellromax Vitamin Cao Cap"
          />
        </div>

        {/* 카테고리 + 하위카테고리 -- 2열 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Select
            label="카테고리"
            required
            value={category}
            onChange={handleCategoryChange}
            options={CATEGORY_OPTIONS}
            placeholder="카테고리를 선택하세요"
            error={errors.category}
          />
          <Select
            label="하위카테고리"
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            options={subcategories}
            placeholder={
              !category
                ? "카테고리를 먼저 선택하세요"
                : isLoadingSubcategories
                  ? "불러오는 중..."
                  : "하위카테고리를 선택하세요"
            }
            disabled={!category || isLoadingSubcategories}
          />
        </div>

        {/* URL 슬러그 */}
        <div className="mb-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="URL 슬러그"
                required
                value={slug}
                onChange={handleSlugChange}
                placeholder="제품명 입력 시 자동 생성"
                helperText="URL에 사용되는 고유 식별자입니다. 영문, 숫자, 한글, 하이픈만 사용 가능합니다."
                error={errors.slug}
              />
            </div>
            <button
              type="button"
              onClick={toggleSlugAutoGenerate}
              className={`mb-[2px] shrink-0 px-3 py-2.5 text-xs font-medium squircle-sm transition-colors duration-150 ${
                isSlugManual
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {isSlugManual ? "자동 생성" : "자동 생성 중"}
            </button>
          </div>
        </div>

        {/* 토글 스위치 + 노출 순서 */}
        <div className="flex flex-wrap items-center gap-8">
          <ToggleSwitch label="신제품 여부" value={isNew} onChange={setIsNew} />
          <ToggleSwitch
            label="노출 여부"
            value={isActive}
            onChange={setIsActive}
          />
          <div className="w-32">
            <Input
              label="노출 순서"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
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
            required
            value={thumbnailUrl}
            onChange={setThumbnailUrl}
            bucket="products"
            maxSize={2 * 1024 * 1024}
            error={errors.thumbnailUrl}
          />
        </div>

        {/* 갤러리 이미지 */}
        <div className="mb-6">
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
                    bucket="products"
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

        {/* 상세페이지 + 영양정보 -- 2열 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUploader
            label="상세페이지 (최대 10MB)"
            value={detailImageUrl}
            onChange={setDetailImageUrl}
            bucket="products"
            maxSize={10 * 1024 * 1024}
          />
          <ImageUploader
            label="영양정보 (최대 10MB)"
            value={nutritionImageUrl}
            onChange={setNutritionImageUrl}
            bucket="products"
            maxSize={10 * 1024 * 1024}
          />
        </div>
      </FormSection>

      {/* ================================================================
          섹션 3: 성분 정보
          ================================================================ */}
      <FormSection title="성분 정보">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textarea
            label="주요 성분 (한국어)"
            required
            rows={3}
            value={ingredientsKo}
            onChange={(e) => setIngredientsKo(e.target.value)}
            placeholder="제품의 주요 성분을 입력하세요"
            error={errors.ingredientsKo}
          />
          <Textarea
            label="주요 성분 (영어)"
            rows={3}
            value={ingredientsEn}
            onChange={(e) => setIngredientsEn(e.target.value)}
            placeholder="Enter main ingredients"
          />
          <Textarea
            label="주요 성분 (중국어)"
            rows={3}
            value={ingredientsZh}
            onChange={(e) => setIngredientsZh(e.target.value)}
            placeholder="请输入主要成分"
          />
          <Textarea
            label="주요 성분 (베트남어)"
            rows={3}
            value={ingredientsVi}
            onChange={(e) => setIngredientsVi(e.target.value)}
            placeholder="Nhap thanh phan chinh"
          />
        </div>
      </FormSection>

      {/* ================================================================
          섹션 4: 기능성 정보
          ================================================================ */}
      <FormSection title="기능성 정보">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textarea
            label="기능성 (한국어)"
            required
            rows={3}
            value={functionalityKo}
            onChange={(e) => setFunctionalityKo(e.target.value)}
            placeholder="제품의 기능성 정보를 입력하세요"
            error={errors.functionalityKo}
          />
          <Textarea
            label="기능성 (영어)"
            rows={3}
            value={functionalityEn}
            onChange={(e) => setFunctionalityEn(e.target.value)}
            placeholder="Enter functionality information"
          />
          <Textarea
            label="기능성 (중국어)"
            rows={3}
            value={functionalityZh}
            onChange={(e) => setFunctionalityZh(e.target.value)}
            placeholder="请输入功能性信息"
          />
          <Textarea
            label="기능성 (베트남어)"
            rows={3}
            value={functionalityVi}
            onChange={(e) => setFunctionalityVi(e.target.value)}
            placeholder="Nhap thong tin chuc nang"
          />
        </div>
      </FormSection>

      {/* ================================================================
          섹션 5: 섭취량 및 섭취방법
          ================================================================ */}
      <FormSection title="섭취량 및 섭취방법">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textarea
            label="섭취량 및 섭취방법 (한국어)"
            rows={3}
            value={howToUseKo}
            onChange={(e) => setHowToUseKo(e.target.value)}
            placeholder="1일 1회, 1회 1정을 물과 함께 섭취하세요"
          />
          <Textarea
            label="섭취량 및 섭취방법 (영어)"
            rows={3}
            value={howToUseEn}
            onChange={(e) => setHowToUseEn(e.target.value)}
            placeholder="Take 1 tablet once daily with water"
          />
          <Textarea
            label="섭취량 및 섭취방법 (중국어)"
            rows={3}
            value={howToUseZh}
            onChange={(e) => setHowToUseZh(e.target.value)}
            placeholder="每日一次，每次一片，用水送服"
          />
          <Textarea
            label="섭취량 및 섭취방법 (베트남어)"
            rows={3}
            value={howToUseVi}
            onChange={(e) => setHowToUseVi(e.target.value)}
            placeholder="Uong 1 vien moi ngay voi nuoc"
          />
        </div>
      </FormSection>

      {/* ================================================================
          섹션 6: 기타정보
          ================================================================ */}
      <FormSection title="기타정보">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textarea
            label="기타정보 (한국어)"
            rows={3}
            value={otherInfoKo}
            onChange={(e) => setOtherInfoKo(e.target.value)}
            placeholder="기타 제품 관련 정보를 입력하세요"
          />
          <Textarea
            label="기타정보 (영어)"
            rows={3}
            value={otherInfoEn}
            onChange={(e) => setOtherInfoEn(e.target.value)}
            placeholder="Enter additional information"
          />
          <Textarea
            label="기타정보 (중국어)"
            rows={3}
            value={otherInfoZh}
            onChange={(e) => setOtherInfoZh(e.target.value)}
            placeholder="请输入其他信息"
          />
          <Textarea
            label="기타정보 (베트남어)"
            rows={3}
            value={otherInfoVi}
            onChange={(e) => setOtherInfoVi(e.target.value)}
            placeholder="Nhap thong tin khac"
          />
        </div>
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

export type { ProductFormProps };
