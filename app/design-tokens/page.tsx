/* ==========================================================================
   Design Tokens Preview Page
   개발/디버깅 용도 — 모든 디자인 토큰을 시각적으로 확인하는 페이지
   ========================================================================== */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design Tokens | Cellromax Science",
  description: "디자인 시스템 토큰 시각적 확인 페이지 (개발용)",
  robots: { index: false, follow: false },
};

/* --------------------------------------------------------------------------
   Section Wrapper
   -------------------------------------------------------------------------- */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-16">
      <div className="mb-6 flex items-center gap-4">
        <h2 className="text-2xl font-bold text-[#111111]">{title}</h2>
        <div className="flex-1 h-px bg-[#e5e7eb]" />
      </div>
      {children}
    </section>
  );
}

/* --------------------------------------------------------------------------
   Color Swatch
   -------------------------------------------------------------------------- */
function ColorSwatch({
  color,
  name,
  hex,
  light = false,
}: {
  color: string;
  name: string;
  hex: string;
  light?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="w-full h-16 rounded-[16px] border border-[#e5e7eb]"
        style={{ backgroundColor: color }}
        aria-label={`Color: ${name}`}
      />
      <div>
        <p className={`text-xs font-600 ${light ? "text-[#6b7280]" : "text-[#111111]"} font-semibold`}>
          {name}
        </p>
        <p className="text-xs text-[#9ca3af] font-mono">{hex}</p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Typography Sample
   -------------------------------------------------------------------------- */
function TypographySample({
  className,
  label,
  sampleText,
}: {
  className: string;
  label: string;
  sampleText: string;
}) {
  return (
    <div className="py-4 border-b border-[#f3f4f6] last:border-0">
      <div className="flex items-start gap-4">
        <span className="text-xs text-[#9ca3af] font-mono w-28 shrink-0 pt-1">{label}</span>
        <p className={className} style={{ color: "#111111" }}>
          {sampleText}
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Squircle Sample
   -------------------------------------------------------------------------- */
function SquircleSample({
  className,
  label,
  radius,
}: {
  className: string;
  label: string;
  radius: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`w-16 h-16 bg-[#0a1628] ${className}`}
        aria-label={`Squircle ${label}`}
      />
      <div className="text-center">
        <p className="text-xs font-semibold text-[#111111]">{label}</p>
        <p className="text-xs text-[#9ca3af] font-mono">{radius}</p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Page Component
   -------------------------------------------------------------------------- */
export default function DesignTokensPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#0a1628] text-white py-12">
        <div className="container-site">
          <div className="badge badge-gold mb-4">DEV ONLY</div>
          <h1 className="text-display text-white mb-4">Design Tokens</h1>
          <p className="text-lead text-[#9ca3af]">
            Cellromax Science 디자인 시스템의 모든 토큰을 시각적으로 확인하는 개발용 페이지입니다.
          </p>
        </div>
      </header>

      <div className="container-site py-16">
        {/* ----------------------------------------------------------------
            1. Color Palette
            ---------------------------------------------------------------- */}
        <Section title="1. 색상 팔레트 (Color Palette)">
          {/* Primary: 딥 네이비 */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              Primary — 딥 네이비 (Deep Navy)
            </h3>
            <div className="grid grid-cols-5 gap-3">
              <ColorSwatch color="#020609" name="primary-darker" hex="#020609" />
              <ColorSwatch color="#050d1a" name="primary-dark" hex="#050d1a" />
              <ColorSwatch color="#0a1628" name="primary" hex="#0a1628" />
              <ColorSwatch color="#1a2d4a" name="primary-light" hex="#1a2d4a" />
              <ColorSwatch color="#243d62" name="primary-lighter" hex="#243d62" />
            </div>
          </div>

          {/* Secondary: 골드 */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              Secondary — 골드 (Gold)
            </h3>
            <div className="grid grid-cols-5 gap-3">
              <ColorSwatch color="#8a6e2a" name="secondary-darker" hex="#8a6e2a" />
              <ColorSwatch color="#a8893f" name="secondary-dark" hex="#a8893f" />
              <ColorSwatch color="#c5a55a" name="secondary" hex="#c5a55a" />
              <ColorSwatch color="#d4b87a" name="secondary-light" hex="#d4b87a" />
              <ColorSwatch color="#e2cc9e" name="secondary-lighter" hex="#e2cc9e" />
            </div>
          </div>

          {/* Accent */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              Accent — 라이트 골드
            </h3>
            <div className="grid grid-cols-5 gap-3">
              <ColorSwatch color="#d4bc82" name="accent-dark" hex="#d4bc82" />
              <ColorSwatch color="#e8d5a3" name="accent" hex="#e8d5a3" />
              <ColorSwatch color="#f2e6c4" name="accent-light" hex="#f2e6c4" />
            </div>
          </div>

          {/* Neutral Gray */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              Neutral — 그레이 스케일
            </h3>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
              <ColorSwatch color="#f9fafb" name="50" hex="#f9fafb" light />
              <ColorSwatch color="#f3f4f6" name="100" hex="#f3f4f6" light />
              <ColorSwatch color="#e5e7eb" name="200" hex="#e5e7eb" light />
              <ColorSwatch color="#d1d5db" name="300" hex="#d1d5db" />
              <ColorSwatch color="#9ca3af" name="400" hex="#9ca3af" />
              <ColorSwatch color="#6b7280" name="500" hex="#6b7280" />
              <ColorSwatch color="#4b5563" name="600" hex="#4b5563" />
              <ColorSwatch color="#374151" name="700" hex="#374151" />
              <ColorSwatch color="#1f2937" name="800" hex="#1f2937" />
              <ColorSwatch color="#111827" name="900" hex="#111827" />
            </div>
          </div>

          {/* Semantic */}
          <div>
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              Semantic — 상태 컬러
            </h3>
            <div className="grid grid-cols-4 gap-3">
              <ColorSwatch color="#22c55e" name="success" hex="#22c55e" />
              <ColorSwatch color="#f59e0b" name="warning" hex="#f59e0b" />
              <ColorSwatch color="#ef4444" name="error" hex="#ef4444" />
              <ColorSwatch color="#3b82f6" name="info" hex="#3b82f6" />
            </div>
          </div>
        </Section>

        {/* ----------------------------------------------------------------
            2. Button Variants
            ---------------------------------------------------------------- */}
        <Section title="2. 버튼 변형 (Button Variants)">
          {/* 밝은 배경 위 버튼 */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              밝은 배경 위
            </h3>
            <div className="card flex flex-wrap gap-4 items-center">
              <button className="btn btn-primary" type="button">btn-primary</button>
              <button className="btn btn-secondary" type="button">btn-secondary</button>
              <button className="btn btn-ghost" type="button">btn-ghost</button>
              <button className="btn btn-gold" type="button">btn-gold</button>
              <button className="btn btn-primary btn-sm" type="button">btn-sm</button>
              <button className="btn btn-primary btn-lg" type="button">btn-lg</button>
              <button className="btn btn-primary" type="button" disabled>disabled</button>
            </div>
          </div>

          {/* 어두운 배경 위 버튼 */}
          <div>
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              어두운 배경 위
            </h3>
            <div
              className="rounded-[28px] p-6 flex flex-wrap gap-4 items-center"
              style={{ backgroundColor: "#0a1628" }}
            >
              <button className="btn btn-white" type="button">btn-white</button>
              <button className="btn btn-gold" type="button">btn-gold</button>
              <button
                className="btn"
                type="button"
                style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  color: "#ffffff",
                  borderColor: "rgba(255,255,255,0.2)",
                }}
              >
                btn-glass
              </button>
            </div>
          </div>
        </Section>

        {/* ----------------------------------------------------------------
            3. Squircle Radius
            ---------------------------------------------------------------- */}
        <Section title="3. 스쿼클 반경 (Squircle Radius)">
          <div className="card">
            <div className="flex flex-wrap gap-8 justify-start">
              <SquircleSample
                className="squircle-xs"
                label="squircle-xs"
                radius="10px"
              />
              <SquircleSample
                className="squircle-sm"
                label="squircle-sm"
                radius="16px"
              />
              <SquircleSample
                className="squircle-md"
                label="squircle-md"
                radius="22px"
              />
              <SquircleSample
                className="squircle-lg"
                label="squircle-lg"
                radius="28px"
              />
              <SquircleSample
                className="squircle-xl"
                label="squircle-xl"
                radius="36px"
              />
              <SquircleSample
                className="squircle-2xl"
                label="squircle-2xl"
                radius="48px"
              />
              <SquircleSample
                className="squircle-pill"
                label="squircle-pill"
                radius="9999px"
              />
            </div>
          </div>

          {/* 방향별 스쿼클 */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              방향별 — 상단 / 하단
            </h3>
            <div className="flex gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-[#c5a55a] squircle-t-lg" />
                <span className="text-xs text-[#9ca3af] font-mono">squircle-t-lg</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-[#c5a55a] squircle-b-lg" />
                <span className="text-xs text-[#9ca3af] font-mono">squircle-b-lg</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ----------------------------------------------------------------
            4. Typography Scale
            ---------------------------------------------------------------- */}
        <Section title="4. 타이포그래피 스케일 (Typography Scale)">
          <div className="card">
            <TypographySample
              className="text-display"
              label=".text-display"
              sampleText="셀로맥스 사이언스"
            />
            <TypographySample
              className="text-heading"
              label=".text-heading"
              sampleText="Cellromax Science 기술 혁신"
            />
            <TypographySample
              className="text-lead"
              label=".text-lead"
              sampleText="과학과 기술의 경계를 넘어, 지속 가능한 미래를 향해 나아갑니다."
            />
            <TypographySample
              className="text-xl font-semibold"
              label="text-xl / 600"
              sampleText="섹션 소제목 예시 — Section Subtitle Example"
            />
            <TypographySample
              className="text-base"
              label="text-base / 400"
              sampleText="본문 기본 텍스트입니다. This is a base body text sample with Korean and English mixed content."
            />
            <TypographySample
              className="text-sm text-[#6b7280]"
              label="text-sm / muted"
              sampleText="보조 텍스트 — Secondary / caption text"
            />
            <TypographySample
              className="text-xs font-mono"
              label="text-xs / mono"
              sampleText="--color-primary: #0a1628"
            />
          </div>

          {/* 그라디언트 텍스트 */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              Gradient Text
            </h3>
            <div className="card flex flex-col gap-4">
              <p className="text-heading text-gradient-gold">
                골드 그라디언트 텍스트 Gold Gradient
              </p>
              <p className="text-heading text-gradient-primary">
                네이비 그라디언트 텍스트 Navy Gradient
              </p>
            </div>
          </div>
        </Section>

        {/* ----------------------------------------------------------------
            5. Cards & Badges
            ---------------------------------------------------------------- */}
        <Section title="5. 카드 & 배지 (Cards & Badges)">
          {/* 카드 변형 */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              카드 변형
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 기본 카드 */}
              <div className="card">
                <div className="badge badge-primary mb-3">TECHNOLOGY</div>
                <h4 className="text-lg font-bold text-[#111111] mb-2">기본 카드</h4>
                <p className="text-sm text-[#6b7280] text-lead">
                  .card 클래스 기본 흰색 배경 카드입니다. 호버 시 shadow와 translateY가 적용됩니다.
                </p>
                <div className="mt-4">
                  <button className="btn btn-secondary btn-sm" type="button">
                    자세히 보기
                  </button>
                </div>
              </div>

              {/* Primary 카드 */}
              <div className="card card-primary">
                <div className="badge badge-gold mb-3">INNOVATION</div>
                <h4 className="text-lg font-bold text-white mb-2">네이비 카드</h4>
                <p className="text-sm text-[#9ca3af] text-lead">
                  .card-primary 딥 네이비 배경 카드입니다. 흰색 텍스트와 어울립니다.
                </p>
                <div className="mt-4">
                  <button className="btn btn-white btn-sm" type="button">
                    자세히 보기
                  </button>
                </div>
              </div>

              {/* Gold 카드 */}
              <div className="card card-gold">
                <div className="badge badge-primary mb-3">PREMIUM</div>
                <h4 className="text-lg font-bold text-[#050d1a] mb-2">골드 카드</h4>
                <p className="text-sm text-[#374151] text-lead">
                  .card-gold 골드 배경 카드입니다. 프리미엄 콘텐츠에 활용합니다.
                </p>
                <div className="mt-4">
                  <button className="btn btn-primary btn-sm" type="button">
                    자세히 보기
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 배지 변형 */}
          <div>
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              배지 변형
            </h3>
            <div className="card flex flex-wrap gap-3 items-center">
              <span className="badge badge-primary">Primary</span>
              <span className="badge badge-secondary">Secondary</span>
              <span className="badge badge-gold">Gold</span>
              <span className="badge badge-accent">Accent</span>
              <span className="badge badge-success">Success</span>
              <span className="badge badge-error">Error</span>
            </div>
          </div>
        </Section>

        {/* ----------------------------------------------------------------
            6. Shadow & Glass
            ---------------------------------------------------------------- */}
        <Section title="6. 그림자 & 글래스 (Shadow & Glass)">
          {/* Shadow Elevation */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              Shadow Elevation
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { name: "shadow-xs", css: "0 1px 2px 0 rgba(10,22,40,0.06)" },
                { name: "shadow-sm", css: "0 1px 3px 0 rgba(10,22,40,0.1)" },
                { name: "shadow-md", css: "0 4px 6px -1px rgba(10,22,40,0.1)" },
                { name: "shadow-lg", css: "0 10px 15px -3px rgba(10,22,40,0.1)" },
                { name: "shadow-xl", css: "0 20px 25px -5px rgba(10,22,40,0.1)" },
                { name: "shadow-2xl", css: "0 25px 50px -12px rgba(10,22,40,0.25)" },
                { name: "shadow-gold", css: "0 4px 24px 0 rgba(197,165,90,0.28)" },
                { name: "shadow-primary", css: "0 4px 24px 0 rgba(10,22,40,0.32)" },
              ].map((item) => (
                <div key={item.name} className="flex flex-col items-center gap-3">
                  <div
                    className="w-full h-16 bg-white squircle-lg"
                    style={{ boxShadow: item.css }}
                  />
                  <span className="text-xs font-mono text-[#9ca3af]">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Glass Morphism */}
          <div>
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              Glass Morphism
            </h3>
            <div
              className="relative rounded-[28px] p-8 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #0a1628 0%, #243d62 100%)",
              }}
            >
              {/* 배경 장식 */}
              <div
                className="absolute top-4 right-4 w-32 h-32 rounded-full opacity-20"
                style={{ backgroundColor: "#c5a55a" }}
                aria-hidden="true"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                <div className="glass squircle-lg p-4">
                  <p className="text-sm font-semibold text-white mb-1">.glass</p>
                  <p className="text-xs text-[#d1d5db]">
                    밝은 글래스 — rgba(255,255,255,0.08)
                  </p>
                </div>
                <div className="glass-dark squircle-lg p-4">
                  <p className="text-sm font-semibold text-white mb-1">.glass-dark</p>
                  <p className="text-xs text-[#d1d5db]">
                    다크 글래스 — rgba(10,22,40,0.72)
                  </p>
                </div>
                <div className="glass-gold squircle-lg p-4">
                  <p className="text-sm font-semibold text-white mb-1">.glass-gold</p>
                  <p className="text-xs text-[#d1d5db]">
                    골드 글래스 — rgba(197,165,90,0.12)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ----------------------------------------------------------------
            7. Animation Utilities
            ---------------------------------------------------------------- */}
        <Section title="7. 애니메이션 유틸리티 (Animation Utilities)">
          <div className="card">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-2">
                <div
                  className="h-12 bg-[#0a1628] squircle-md animate-fade-in"
                  style={{ animationDelay: "0ms" }}
                />
                <span className="text-xs font-mono text-[#9ca3af]">animate-fade-in</span>
              </div>
              <div className="flex flex-col gap-2">
                <div
                  className="h-12 bg-[#0a1628] squircle-md animate-slide-up"
                  style={{ animationDelay: "100ms" }}
                />
                <span className="text-xs font-mono text-[#9ca3af]">animate-slide-up</span>
              </div>
              <div className="flex flex-col gap-2">
                <div
                  className="h-12 bg-[#c5a55a] squircle-md"
                  style={{ animation: "pulse-gold 2s infinite" }}
                />
                <span className="text-xs font-mono text-[#9ca3af]">pulse-gold</span>
              </div>
              <div className="flex flex-col gap-2">
                <div
                  className="h-12 bg-[#0a1628] squircle-md opacity-0 translate-y-4"
                  style={{
                    opacity: 0,
                    transform: "translateY(16px)",
                  }}
                />
                <span className="text-xs font-mono text-[#9ca3af]">animate-ready (initial)</span>
              </div>
            </div>
          </div>

          {/* Easing Tokens */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              Easing Curves
            </h3>
            <div className="card">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: "--ease-default", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
                  { name: "--ease-in", value: "cubic-bezier(0.4, 0, 1, 1)" },
                  { name: "--ease-out", value: "cubic-bezier(0, 0, 0.2, 1)" },
                  { name: "--ease-in-out", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
                  { name: "--ease-spring", value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
                  { name: "--ease-smooth", value: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" },
                ].map((item) => (
                  <div key={item.name} className="p-3 bg-[#f9fafb] rounded-[10px]">
                    <p className="text-xs font-semibold text-[#111111] font-mono mb-1">
                      {item.name}
                    </p>
                    <p className="text-xs text-[#9ca3af] font-mono leading-relaxed">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ----------------------------------------------------------------
            8. Spacing & Layout
            ---------------------------------------------------------------- */}
        <Section title="8. 간격 & 레이아웃 (Spacing & Layout)">
          <div className="card">
            <div className="space-y-3">
              {[
                { name: "section-sm", value: "4rem (64px)", height: "h-16" },
                { name: "section", value: "6rem (96px)", height: "h-24" },
                { name: "section-lg", value: "8rem (128px)", height: "h-32" },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <span className="text-xs font-mono text-[#9ca3af] w-36 shrink-0">
                    --spacing-{item.name}
                  </span>
                  <div
                    className={`bg-[#e8d5a3] squircle-xs ${item.height} flex-1 flex items-center pl-3`}
                  >
                    <span className="text-xs font-semibold text-[#a8893f]">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ----------------------------------------------------------------
            9. Z-Index Stack
            ---------------------------------------------------------------- */}
        <Section title="9. Z-Index 스택 (Z-Index Stack)">
          <div className="card">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { name: "base", value: "0" },
                { name: "raised", value: "10" },
                { name: "dropdown", value: "100" },
                { name: "sticky", value: "200" },
                { name: "overlay", value: "300" },
                { name: "modal", value: "400" },
                { name: "popover", value: "500" },
                { name: "toast", value: "600" },
                { name: "tooltip", value: "700" },
              ].map((item) => (
                <div
                  key={item.name}
                  className="p-3 bg-[#f9fafb] squircle-xs text-center"
                >
                  <p className="text-lg font-bold text-[#0a1628]">{item.value}</p>
                  <p className="text-xs text-[#9ca3af] font-mono">z-{item.name}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="divider-full mb-8" />
        <div className="text-center pb-8">
          <p className="text-sm text-[#9ca3af]">
            Cellromax Science Design System — Tailwind CSS v4 + globals.css
          </p>
          <p className="text-xs text-[#d1d5db] mt-1 font-mono">
            /app/design-tokens/page.tsx
          </p>
        </div>
      </div>
    </main>
  );
}
