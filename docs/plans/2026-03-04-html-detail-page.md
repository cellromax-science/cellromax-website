# HTML 코딩형 제품 상세페이지 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 제품 상세페이지에서 이미지형 외에 HTML 코딩형 상세페이지(GSAP 애니메이션 포함)를 지원한다.

**Architecture:** Supabase `products` 테이블에 `detail_html TEXT` 컬럼을 추가하고, Admin에서 HTML을 붙여넣기하면 DB에 저장된다. 렌더링 시 `detail_html`이 있으면 `<iframe srcdoc>` + postMessage 높이 자동조절로 표시하고, 없으면 기존 `detail_image_url` 이미지로 fallback한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase, Tailwind CSS v4

---

## 변경 파일 목록

| 작업 | 파일 |
|------|------|
| 신규 생성 | `components/products/HtmlDetailFrame.tsx` |
| 수정 | `types/product.ts` |
| 수정 | `app/[locale]/products/[slug]/page.tsx` |
| 수정 | `components/admin/ProductForm.tsx` |
| DB 마이그레이션 | Supabase SQL (수동 실행) |

---

### Task 1: Supabase DB 마이그레이션

**Files:**
- 없음 (Supabase 대시보드에서 직접 실행)

**Step 1: Supabase SQL Editor에서 컬럼 추가**

Supabase 대시보드 → SQL Editor에서 아래 SQL 실행:

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS detail_html TEXT DEFAULT NULL;
```

**Step 2: 컬럼 추가 확인**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'detail_html';
```

예상 결과: `detail_html | text | YES` 행이 반환됨

---

### Task 2: TypeScript 타입 업데이트

**Files:**
- Modify: `types/product.ts`

**Step 1: Product 인터페이스에 필드 추가**

`types/product.ts`의 `Product` 인터페이스에서 `nutrition_image_url` 바로 아래에 추가:

```typescript
// 기존
  nutrition_image_url: string | null;
// 추가
  detail_html: string | null;
```

**Step 2: ProductInsert 인터페이스에 필드 추가**

`ProductInsert` 인터페이스에서 `nutrition_image_url` 바로 아래에 추가:

```typescript
// 기존
  nutrition_image_url?: string | null;
// 추가
  detail_html?: string | null;
```

**Step 3: 빌드 타입 체크**

```bash
cd cellromax-website && npx tsc --noEmit
```

예상 결과: 오류 없음

**Step 4: Commit**

```bash
git add types/product.ts
git commit -m "feat: add detail_html field to Product types"
```

---

### Task 3: HtmlDetailFrame 컴포넌트 생성

**Files:**
- Create: `components/products/HtmlDetailFrame.tsx`

**Step 1: 컴포넌트 파일 생성**

`components/products/HtmlDetailFrame.tsx` 파일을 생성하고 아래 코드 작성:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

/* ==========================================================================
   HtmlDetailFrame — 코딩형 제품 상세페이지 렌더러

   detailpage-agent가 생성한 HTML을 iframe srcdoc으로 격리 렌더링.
   - JavaScript/GSAP 애니메이션 완전 동작
   - CSS가 사이트 스타일과 충돌 없음 (iframe 격리)
   - postMessage로 iframe 내부 높이 자동 조절
   ========================================================================== */

interface HtmlDetailFrameProps {
  html: string;
}

/**
 * HTML 문자열에 높이 전송 스크립트를 주입한다.
 * </body> 바로 앞에 삽입하고, 없으면 끝에 append.
 */
function injectHeightScript(html: string): string {
  const script = `<script>
(function() {
  function sendHeight() {
    var h = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    window.parent.postMessage({ type: '__cellromax_resize__', height: h }, '*');
  }
  window.addEventListener('load', sendHeight);
  var ro = new ResizeObserver(sendHeight);
  ro.observe(document.body);
})();
</script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", script + "</body>");
  }
  return html + script;
}

export function HtmlDetailFrame({ html }: HtmlDetailFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);
  const [isLoading, setIsLoading] = useState(true);

  const srcDoc = injectHeightScript(html);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data &&
        event.data.type === "__cellromax_resize__" &&
        typeof event.data.height === "number"
      ) {
        setHeight(event.data.height);
        setIsLoading(false);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="relative w-full">
      {/* 로딩 스켈레톤 */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-100 animate-pulse squircle-xl"
          style={{ height: `${height}px` }}
          aria-hidden="true"
        />
      )}
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-same-origin"
        className="w-full border-0 block"
        style={{ height: `${height}px` }}
        title="제품 상세페이지"
        onLoad={() => {
          // load 이벤트 후 짧은 딜레이 뒤 로딩 상태 해제 (postMessage 미수신 대비)
          setTimeout(() => setIsLoading(false), 1500);
        }}
      />
    </div>
  );
}
```

**Step 2: 빌드 체크**

```bash
cd cellromax-website && npx tsc --noEmit
```

예상 결과: 오류 없음

**Step 3: Commit**

```bash
git add components/products/HtmlDetailFrame.tsx
git commit -m "feat: add HtmlDetailFrame component for coded product detail pages"
```

---

### Task 4: 제품 상세 페이지 렌더링 분기 추가

**Files:**
- Modify: `app/[locale]/products/[slug]/page.tsx`

**Step 1: HtmlDetailFrame import 추가**

파일 상단 import 목록에 추가:

```typescript
import { HtmlDetailFrame } from "@/components/products/HtmlDetailFrame";
```

**Step 2: 상세 이미지 렌더링 블록 교체**

현재 코드:
```tsx
{/* Detail Page Image (상세페이지) */}
{product.detail_image_url && (
  <div className="w-full squircle-xl overflow-hidden">
    <Image
      src={detailUrl(product.detail_image_url)}
      alt={`${productName} - detail`}
      width={1200}
      height={1600}
      quality={75}
      className="w-full h-auto"
      sizes="(max-width: 1280px) 100vw, 1200px"
    />
  </div>
)}
```

교체할 코드:
```tsx
{/* Detail Section: HTML형 우선, 없으면 이미지형 fallback */}
{product.detail_html ? (
  <HtmlDetailFrame html={product.detail_html} />
) : product.detail_image_url ? (
  <div className="w-full squircle-xl overflow-hidden">
    <Image
      src={detailUrl(product.detail_image_url)}
      alt={`${productName} - detail`}
      width={1200}
      height={1600}
      quality={75}
      className="w-full h-auto"
      sizes="(max-width: 1280px) 100vw, 1200px"
    />
  </div>
) : null}
```

**Step 3: 빌드 체크**

```bash
cd cellromax-website && npx tsc --noEmit
```

예상 결과: 오류 없음

**Step 4: Commit**

```bash
git add app/\[locale\]/products/\[slug\]/page.tsx
git commit -m "feat: render HTML detail page with iframe, fallback to image"
```

---

### Task 5: Admin ProductForm HTML 입력 탭 추가

**Files:**
- Modify: `components/admin/ProductForm.tsx`

**Step 1: detailMode / detailHtml state 추가**

`ProductForm` 컴포넌트의 이미지 state 블록에 추가:

```typescript
// 기존 이미지 state 아래에 추가
const [detailMode, setDetailMode] = useState<"image" | "html">(
  initialData?.detail_html ? "html" : "image"
);
const [detailHtml, setDetailHtml] = useState(
  initialData?.detail_html ?? ""
);
```

**Step 2: submit 핸들러에 detail_html 추가**

submit 핸들러에서 payload를 구성하는 부분에 추가:

```typescript
// 기존 detail_image_url 아래에 추가
detail_html: detailMode === "html" ? emptyToNull(detailHtml) : null,
// 이미지 모드일 때는 detail_html을 null로, HTML 모드일 때는 detail_image_url을 null로
// detail_image_url 줄도 아래와 같이 수정:
detail_image_url: detailMode === "image" ? detailImageUrl : null,
```

**Step 3: 상세페이지 섹션 UI 교체**

`ProductForm`에서 "상세페이지 이미지" `ImageUploader` 부분을 아래로 교체:

```tsx
{/* 상세페이지 — 이미지형 / HTML형 탭 */}
<div>
  <p className="text-sm font-medium text-gray-700 mb-2">상세페이지</p>

  {/* 탭 선택 */}
  <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-4">
    <button
      type="button"
      onClick={() => {
        setDetailMode("image");
        setDetailHtml("");
      }}
      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 ${
        detailMode === "image"
          ? "bg-white shadow-sm text-primary"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      이미지형
    </button>
    <button
      type="button"
      onClick={() => {
        setDetailMode("html");
        setDetailImageUrl(null);
      }}
      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 ${
        detailMode === "html"
          ? "bg-white shadow-sm text-primary"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      HTML형
    </button>
  </div>

  {/* 이미지형 */}
  {detailMode === "image" && (
    <ImageUploader
      label="상세페이지 이미지 (긴 이미지, 최대 10MB)"
      value={detailImageUrl}
      onChange={setDetailImageUrl}
      bucket="products"
      folder="detail"
    />
  )}

  {/* HTML형 */}
  {detailMode === "html" && (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        detailpage-agent가 생성한 HTML 코드를 붙여넣으세요.
        GSAP 애니메이션 포함 전체 HTML 문서를 입력합니다.
      </p>
      <textarea
        value={detailHtml}
        onChange={(e) => setDetailHtml(e.target.value)}
        placeholder="<!DOCTYPE html>..."
        rows={12}
        className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
        spellCheck={false}
      />
      {detailHtml && (
        <p className="text-xs text-green-600">
          ✓ HTML {detailHtml.length.toLocaleString()}자 입력됨
        </p>
      )}
    </div>
  )}
</div>
```

**Step 4: 빌드 체크**

```bash
cd cellromax-website && npx tsc --noEmit
```

예상 결과: 오류 없음

**Step 5: Commit**

```bash
git add components/admin/ProductForm.tsx
git commit -m "feat: add HTML/image tab toggle in product detail section of admin form"
```

---

### Task 6: 로컬 동작 확인

**Step 1: 개발 서버 실행**

```bash
cd cellromax-website && npm run dev
```

**Step 2: Admin에서 HTML형 테스트**

1. `http://localhost:3000/ko/admin/products/new` 접속
2. 상세페이지 섹션 → "HTML형" 탭 클릭
3. 아래 간단한 테스트 HTML 붙여넣기:

```html
<!DOCTYPE html>
<html>
<head>
<style>
body { margin: 0; font-family: sans-serif; background: #0a1628; color: white; padding: 40px; }
h1 { color: #c5a55a; }
</style>
</head>
<body>
<h1>HTML 상세페이지 테스트</h1>
<p>이 내용이 iframe으로 렌더링됩니다.</p>
</body>
</html>
```

4. 제품 저장 후 상세 페이지에서 `HtmlDetailFrame`이 렌더링되는지 확인

**Step 3: Fallback 동작 확인**

기존 `detail_image_url`만 있는 제품의 상세 페이지 접속 → 이미지가 정상 표시되는지 확인

---

### Task 7: Vercel 배포

**Step 1: 빌드 최종 확인**

```bash
cd cellromax-website && npm run build
```

예상 결과: 오류 없이 빌드 완료

**Step 2: 배포**

```bash
cd cellromax-website && vercel --prod
```

---

## 구현 완료 체크리스트

- [ ] Supabase `products` 테이블에 `detail_html` 컬럼 추가
- [ ] `types/product.ts` 타입 업데이트
- [ ] `HtmlDetailFrame.tsx` 생성 (postMessage 높이 자동조절)
- [ ] 상세 페이지 렌더링 분기: HTML 우선 → 이미지 fallback
- [ ] Admin 폼 탭 토글: 이미지형 / HTML형
- [ ] 탭 전환 시 반대쪽 값 초기화
- [ ] 로컬 동작 확인
- [ ] Vercel 배포 완료
