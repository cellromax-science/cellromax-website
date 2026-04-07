"use client";

import { useTranslations } from "next-intl";

/* ==========================================================================
   InnerBeautyPage — 이너뷰티 제품 정보 컴포넌트

   섹션 구성:
   1. 기본 정보 (식품유형, 품목제조보고번호)
   2. 원재료명
   3. 영양정보 (정제 / 액상)
   4. 주의사항
   5. 포장재질 및 제조/유통 정보
   ========================================================================== */

/* --------------------------------------------------------------------------
   영양정보 데이터 타입 및 상수
   -------------------------------------------------------------------------- */

interface NutrientRow {
  label: string;
  value: string;
  daily: string;
  indent?: boolean;
}

const NUTRIENTS_TABLET: NutrientRow[] = [
  { label: "나트륨", value: "1 mg", daily: "0%" },
  { label: "탄수화물", value: "1 g", daily: "0%" },
  { label: "당류", value: "0 g", daily: "0%", indent: true },
  { label: "지방", value: "0.5 g 미만", daily: "0%" },
  { label: "트랜스지방", value: "0 g", daily: "", indent: true },
  { label: "포화지방", value: "0 g", daily: "0%", indent: true },
  { label: "콜레스테롤", value: "0 mg", daily: "0%" },
  { label: "단백질", value: "0.3 g", daily: "1%" },
];

const NUTRIENTS_LIQUID: NutrientRow[] = [
  { label: "나트륨", value: "0.8 mg", daily: "0%" },
  { label: "탄수화물", value: "5 g", daily: "2%" },
  { label: "당류", value: "3 g", daily: "3%", indent: true },
  { label: "지방", value: "0 g 미만", daily: "0%" },
  { label: "트랜스지방", value: "0 g", daily: "", indent: true },
  { label: "포화지방", value: "0 g", daily: "0%", indent: true },
  { label: "콜레스테롤", value: "0 mg", daily: "0%" },
  { label: "단백질", value: "1 g 미만", daily: "0%" },
];

/* --------------------------------------------------------------------------
   영양정보 테이블 서브 컴포넌트
   -------------------------------------------------------------------------- */

function NutritionTable({
  title,
  serving,
  calories,
  nutrients,
}: {
  title: string;
  serving: string;
  calories: string;
  nutrients: NutrientRow[];
}) {
  return (
    <div className="bg-white rounded-[var(--radius-squircle-lg)] border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-primary px-5 py-4">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-gray-300 mt-1">{serving}</p>
      </div>

      {/* 칼로리 */}
      <div className="px-5 py-3 border-b-2 border-primary bg-gray-50">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">열량</span>
          <span className="font-bold text-lg text-primary">{calories}</span>
        </div>
      </div>

      {/* 영양소 행 */}
      <div className="divide-y divide-gray-100">
        <div className="px-5 py-2 flex justify-between text-xs font-medium text-gray-500 uppercase tracking-wider">
          <span>영양소</span>
          <div className="flex gap-8">
            <span>함량</span>
            <span className="w-12 text-right">%영양성분기준치</span>
          </div>
        </div>
        {nutrients.map((row) => (
          <div
            key={row.label}
            className={`px-5 py-2.5 flex justify-between items-center hover:bg-gray-50 transition-colors ${
              row.indent ? "pl-9" : ""
            }`}
          >
            <span
              className={`text-sm ${
                row.indent
                  ? "text-gray-500"
                  : "font-medium text-gray-800"
              }`}
            >
              {row.label}
            </span>
            <div className="flex gap-8 items-center">
              <span className="text-sm text-gray-700">{row.value}</span>
              <span className="text-sm text-gray-500 w-12 text-right">
                {row.daily || "-"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 주석 */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          * %영양성분기준치: 1일 영양성분기준치에 대한 비율
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   정보 카드 서브 컴포넌트
   -------------------------------------------------------------------------- */

function InfoCard({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[var(--radius-squircle-lg)] border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        {icon && (
          <div className="w-8 h-8 rounded-[var(--radius-squircle-xs)] bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
            {icon}
          </div>
        )}
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   메인 컴포넌트
   -------------------------------------------------------------------------- */

export function InnerBeautyPage() {
  const t = useTranslations("innerbeauty");

  return (
    <div className="space-y-8">
      {/* ── 기본 정보 ─────────────────────────────────────── */}
      <InfoCard
        title={t("sections.basic")}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clipRule="evenodd"
            />
          </svg>
        }
      >
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {t("labels.productName")}
            </dt>
            <dd className="text-base font-bold text-primary">
              셀로맥스 베리영 글루토닝
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {t("labels.foodType")}
            </dt>
            <dd className="text-sm font-medium text-gray-900">캔디류</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {t("labels.reportNumber")}
            </dt>
            <dd className="text-sm font-medium text-gray-900">
              19860443015867
            </dd>
          </div>
        </dl>
      </InfoCard>

      {/* ── 원재료명 ─────────────────────────────────────── */}
      <InfoCard
        title={t("sections.ingredients")}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        }
      >
        <p className="text-sm text-gray-700 leading-relaxed">
          정제수, 프락토올리고당, 에리스리톨(감미료), 적포도농축액(미국산),
          화이트토마토추출분말(영국산), 세븐베리농축액[블랙베리농축액(독일산),
          블랙커런트농축액(독일산), 블루베리농축액(미국산),
          스트로베리농축액(미국산), 라즈베리농축액(미국산),
          크랜베리농축액(독일산), 아사이주스(브라질산)], 혼합제제1(프로필렌글리콜,
          주정, 합성향료), 구연산, 인디언구스베리추출분말(인도산),
          복합황금추출분말, DL-사과산, 효소처리스테비아(감미료),
          저분자피쉬콜라겐, 혼합제제2(덱스트린, 히알루론산), 엘라스틴가수분해물
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-[var(--radius-squircle-xs)] bg-red-50 text-red-700 text-xs font-medium border border-red-100">
            {t("labels.containsTomato")}
          </span>
        </div>
      </InfoCard>

      {/* ── 영양정보 (정제 / 액상) ────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-[var(--radius-squircle-xs)] bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v11.75A2.75 2.75 0 0016.75 18h-12A2.75 2.75 0 012 15.25V3.5zm3.75 7a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zm0 3a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zM5 5.75A.75.75 0 015.75 5h4.5a.75.75 0 01.75.75v2.5a.75.75 0 01-.75.75h-4.5A.75.75 0 015 8.25v-2.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="font-bold text-lg text-gray-900">
            {t("sections.nutrition")}
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NutritionTable
            title={t("nutrition.tablet.title")}
            serving={t("nutrition.tablet.serving")}
            calories="5kcal"
            nutrients={NUTRIENTS_TABLET}
          />
          <NutritionTable
            title={t("nutrition.liquid.title")}
            serving={t("nutrition.liquid.serving")}
            calories="20kcal"
            nutrients={NUTRIENTS_LIQUID}
          />
        </div>
      </div>

      {/* ── 주의사항 ─────────────────────────────────────── */}
      <InfoCard
        title={t("sections.caution")}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        }
      >
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-squircle-sm)] p-4">
          <p className="text-sm text-amber-800 leading-relaxed">
            {t("caution.erythritol")}
          </p>
        </div>
      </InfoCard>

      {/* ── 포장재질 및 제조/유통 정보 ────────────────────── */}
      <InfoCard
        title={t("sections.manufacturing")}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M4 16.5v-13h-.25a.75.75 0 010-1.5h12.5a.75.75 0 010 1.5H16v13h.25a.75.75 0 010 1.5H3.75a.75.75 0 010-1.5H4zm3-11a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm.5 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zm3.5-3.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm.5 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zM8 13.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v3h-4v-3z"
              clipRule="evenodd"
            />
          </svg>
        }
      >
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {t("labels.packaging")}
            </dt>
            <dd className="text-sm text-gray-700">
              용기(PP), 내캡(PE), 외캡용기(PP), 외캡(PE)
            </dd>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {t("labels.manufacturer")}
            </dt>
            <dd className="text-sm text-gray-700">
              충북 진천군 초평면 용정길 29-8
            </dd>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {t("labels.distributor")}
            </dt>
            <dd className="text-sm text-gray-700">
              경기도 용인시 기흥구 구성로 357 용인테크노밸리 D710
            </dd>
          </div>
        </dl>
      </InfoCard>
    </div>
  );
}
