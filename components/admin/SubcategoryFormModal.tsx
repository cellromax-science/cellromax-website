"use client";

import { useState, useEffect, useCallback } from "react";

import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

import type {
  RelatedProductOrderItem,
  SubcategoryWithCount,
} from "@/types/product";

interface SubcategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initialData?: SubcategoryWithCount;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "health_functional", label: "건강기능식품" },
  { value: "general_food", label: "일반식품" },
  { value: "cosmetic", label: "화장품" },
  { value: "medicine", label: "일반의약품" },
  { value: "nutra_pet", label: "뉴트라펫" },
  { value: "other", label: "기타" },
];

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function SubcategoryFormModal({
  open,
  onClose,
  mode,
  initialData,
  onSuccess,
}: SubcategoryFormModalProps) {
  const [parentCategory, setParentCategory] = useState("");
  const [nameKo, setNameKo] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameZh, setNameZh] = useState("");
  const [nameVi, setNameVi] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [sortOrder, setSortOrder] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<
    RelatedProductOrderItem[]
  >([]);
  const [isLoadingRelatedProducts, setIsLoadingRelatedProducts] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!open) {
      setErrors({});
      setRelatedProducts([]);
      setIsLoadingRelatedProducts(false);
      return;
    }

    if (mode === "edit" && initialData) {
      setParentCategory(initialData.parent_category);
      setNameKo(initialData.name_ko);
      setNameEn(initialData.name_en ?? "");
      setNameZh(initialData.name_zh ?? "");
      setNameVi(initialData.name_vi ?? "");
      setSlug(initialData.slug);
      setIsSlugManual(true);
      setSortOrder(String(initialData.sort_order));
      setIsActive(initialData.is_active);
    } else {
      setParentCategory("");
      setNameKo("");
      setNameEn("");
      setNameZh("");
      setNameVi("");
      setSlug("");
      setIsSlugManual(false);
      setSortOrder("");
      setIsActive(true);
      setRelatedProducts([]);
    }

    setShowAdvanced(false);
    setErrors({});
  }, [open, mode, initialData]);

  useEffect(() => {
    if (!isSlugManual && nameEn) {
      setSlug(generateSlug(nameEn));
    }
  }, [nameEn, isSlugManual]);

  useEffect(() => {
    const subcategoryId = initialData?.id;

    if (!open || mode !== "edit" || !subcategoryId) {
      return;
    }

    const controller = new AbortController();

    async function loadRelatedProducts() {
      setIsLoadingRelatedProducts(true);

      try {
        const res = await fetch(`/api/subcategories/${subcategoryId}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(
            errorData?.error || "연관 제품 목록을 불러오지 못했습니다."
          );
        }

        const data = await res.json();
        setRelatedProducts(data.related_products ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        setRelatedProducts([]);
        toast.error(
          err instanceof Error
            ? err.message
            : "연관 제품 목록을 불러오지 못했습니다."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingRelatedProducts(false);
        }
      }
    }

    void loadRelatedProducts();

    return () => controller.abort();
  }, [open, mode, initialData]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!parentCategory) {
      newErrors.parentCategory = "상위 카테고리를 선택해주세요.";
    }

    if (!nameKo.trim()) {
      newErrors.nameKo = "이름(국문)은 필수 항목입니다.";
    }

    if (slug.trim() && !SLUG_REGEX.test(slug)) {
      newErrors.slug =
        "슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.";
    }

    if (sortOrder && !Number.isInteger(Number(sortOrder))) {
      newErrors.sortOrder = "정렬순서는 정수만 입력할 수 있습니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [parentCategory, nameKo, slug, sortOrder]);

  const handleRelatedProductOrderChange = useCallback(
    (productId: string, nextValue: string) => {
      const parsed = Number.parseInt(nextValue, 10);

      setRelatedProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? {
                ...product,
                category_sort_order: Number.isNaN(parsed)
                  ? 0
                  : Math.max(0, parsed),
              }
            : product
        )
      );
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    if (mode === "edit" && isLoadingRelatedProducts) {
      toast.error("연관 제품 목록을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalSlug = slug.trim();
      if (!finalSlug) {
        finalSlug = nameEn.trim()
          ? generateSlug(nameEn.trim())
          : generateSlug(nameKo.trim());
      }

      if (!finalSlug) {
        // 한국어 전용 이름은 슬러그 생성 불가 → 상위 카테고리 + 랜덤으로 자동 생성
        const prefix = parentCategory.replace(/_/g, "-");
        const suffix = Math.random().toString(36).substring(2, 7);
        finalSlug = `${prefix}-${suffix}`;
      }

      const payload: Record<string, unknown> = {
        parent_category: parentCategory,
        slug: finalSlug,
        name_ko: nameKo.trim(),
        name_en: nameEn.trim() || null,
        name_zh: nameZh.trim() || null,
        name_vi: nameVi.trim() || null,
        is_active: isActive,
      };

      if (sortOrder) {
        payload.sort_order = Number.parseInt(sortOrder, 10);
      }

      const isEdit = mode === "edit" && initialData;
      if (isEdit) {
        payload.related_products = relatedProducts.map((product) => ({
          id: product.id,
          category_sort_order: product.category_sort_order,
        }));
      }

      const url = isEdit
        ? `/api/subcategories/${initialData.id}`
        : "/api/subcategories";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || "요청 처리에 실패했습니다."
        );
      }

      toast.success(
        isEdit
          ? "하위카테고리가 수정되었습니다."
          : "하위카테고리가 등록되었습니다."
      );
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof TypeError) {
        toast.error("네트워크 연결을 확인해주세요.");
      } else {
        toast.error(
          err instanceof Error
            ? err.message
            : "알 수 없는 오류가 발생했습니다."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    initialData,
    isActive,
    isLoadingRelatedProducts,
    mode,
    nameEn,
    nameKo,
    nameVi,
    nameZh,
    onClose,
    onSuccess,
    parentCategory,
    relatedProducts,
    slug,
    sortOrder,
    validate,
  ]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "하위카테고리 수정" : "하위카테고리 등록"}
      size={mode === "edit" ? "full" : "lg"}
    >
      <div className="mb-6 h-px bg-gradient-to-r from-secondary via-secondary-light to-transparent" />

      <div className="space-y-5">
        <Select
          label="상위 카테고리"
          required
          value={parentCategory}
          onChange={(e) => setParentCategory(e.target.value)}
          options={CATEGORY_OPTIONS}
          placeholder="카테고리를 선택하세요"
          disabled={mode === "edit"}
          error={errors.parentCategory}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="이름 (국문)"
            required
            value={nameKo}
            onChange={(e) => setNameKo(e.target.value)}
            placeholder="예: 키즈"
            error={errors.nameKo}
          />
          <Input
            label="이름 (영문)"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="예: Kids"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="이름 (중문)"
            value={nameZh}
            onChange={(e) => setNameZh(e.target.value)}
            placeholder="예: 儿童"
          />
          <Input
            label="이름 (베트남어)"
            value={nameVi}
            onChange={(e) => setNameVi(e.target.value)}
            placeholder="예: Tre em"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform duration-200 ${
              showAdvanced ? "rotate-90" : ""
            }`}
            aria-hidden="true"
          >
            <path
              d="M4.5 2.5L8 6L4.5 9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          고급 설정 (URL 슬러그)
        </button>

        {showAdvanced && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                URL 슬러그
              </label>
              <button
                type="button"
                onClick={() => setIsSlugManual((prev) => !prev)}
                className="text-xs text-primary hover:underline"
              >
                {isSlugManual ? "자동 생성" : "수동 입력"}
              </button>
            </div>
            <Input
              value={slug}
              onChange={(e) => {
                setIsSlugManual(true);
                setSlug(e.target.value);
              }}
              placeholder="예: kids"
              disabled={!isSlugManual && !nameEn}
              error={errors.slug}
              helperText="영문 이름 입력 시 자동 생성됩니다. 필요하면 직접 수정할 수 있습니다."
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="정렬순서"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="미입력 시 자동 설정"
            error={errors.sortOrder}
          />
          <div className="flex flex-col">
            <span className="mb-1.5 text-sm font-medium text-gray-700">
              활성 여부
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((prev) => !prev)}
              className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
                isActive ? "bg-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="mt-1 text-xs text-gray-500">
              {isActive ? "활성 (공개)" : "비활성 (숨김)"}
            </span>
          </div>
        </div>

        {mode === "edit" && initialData && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  연관 제품 순서
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  저장 시 이 하위카테고리에 속한 제품의 카테고리 노출 순서도 함께 반영됩니다.
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {relatedProducts.length}개 제품
              </span>
            </div>

            {isLoadingRelatedProducts ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400">
                연관 제품을 불러오는 중입니다.
              </div>
            ) : relatedProducts.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400">
                현재 연결된 연관 제품이 없습니다.
              </div>
            ) : (
              <div className="mt-4 grid max-h-[30rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {relatedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex min-h-[14.5rem] flex-col rounded-xl border border-gray-200 bg-white p-3"
                  >
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={product.name_ko}
                        width={220}
                        height={140}
                        className="h-28 w-full rounded-lg object-cover bg-gray-50"
                      />
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <rect
                            x="2"
                            y="2"
                            width="14"
                            height="14"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.2"
                          />
                          <path
                            d="M2 12.5L6.2 8.5L9.5 11.8L12 9.4L16 13.3"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="mt-3 min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium leading-5 text-gray-900">
                        {product.name_ko}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-gray-400">
                        <p className="truncate">{product.slug}</p>
                        <p
                          className={
                            product.is_active ? "text-success" : "text-gray-400"
                          }
                        >
                          {product.is_active ? "공개" : "비공개"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="mb-1 block text-xs font-medium text-gray-500">
                        순서
                      </span>
                      <Input
                        type="number"
                        min="0"
                        value={String(product.category_sort_order)}
                        onChange={(e) =>
                          handleRelatedProductOrderChange(
                            product.id,
                            e.target.value
                          )
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={isLoadingRelatedProducts}
        >
          {mode === "edit" ? "수정하기" : "등록하기"}
        </Button>
      </div>
    </Modal>
  );
}
