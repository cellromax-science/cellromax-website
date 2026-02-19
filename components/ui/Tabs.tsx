"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useId,
  type KeyboardEvent,
} from "react";

/* ==========================================================================
   Tabs Component — Cellromax Design System

   접근성(WAI-ARIA Tabs 패턴) 준수 탭 시스템.
   - 3종 variant: underline, pill, boxed
   - Controlled 모드: value + onChange props
   - 키보드 네비게이션: 좌우 화살표 탭 이동
   - 복합 컴포넌트 패턴: Tabs > TabList + Tab + TabPanel
   ========================================================================== */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabsVariant = "underline" | "pill" | "boxed";

interface TabsContextValue {
  /** 현재 활성 탭 value */
  activeValue: string;
  /** 탭 변경 콜백 */
  onChange: (value: string) => void;
  /** 탭 스타일 variant */
  variant: TabsVariant;
  /** 고유 ID 접두사 (접근성 연결용) */
  baseId: string;
}

interface TabsProps {
  /** 탭 스타일 변형 (기본: "underline") */
  variant?: TabsVariant;
  /** 현재 활성 탭의 value (controlled) */
  value: string;
  /** 탭 변경 시 호출되는 콜백 */
  onChange: (value: string) => void;
  /** 외부에서 추가 클래스 전달 */
  className?: string;
  children: React.ReactNode;
}

interface TabListProps {
  /** 외부에서 추가 클래스 전달 */
  className?: string;
  children: React.ReactNode;
}

interface TabProps {
  /** 탭을 식별하는 고유 값 — TabPanel의 value와 매칭 */
  value: string;
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 외부에서 추가 클래스 전달 */
  className?: string;
  children: React.ReactNode;
}

interface TabPanelProps {
  /** 이 패널이 연결된 탭의 value */
  value: string;
  /** 외부에서 추가 클래스 전달 */
  className?: string;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Style Maps
// ---------------------------------------------------------------------------

/**
 * Variant별 TabList 컨테이너 Tailwind 클래스 맵
 */
const tabListClasses: Record<TabsVariant, string> = {
  underline: "border-b border-gray-200",
  pill: "gap-1",
  boxed: "bg-gray-100 p-1 squircle-sm gap-0.5",
};

/**
 * Variant별 활성 탭 버튼 Tailwind 클래스 맵
 */
const activeTabClasses: Record<TabsVariant, string> = {
  underline: "text-primary border-b-2 border-secondary font-semibold",
  pill: "bg-primary text-white squircle-sm font-semibold shadow-sm",
  boxed: "bg-white text-primary squircle-sm font-semibold shadow-sm",
};

/**
 * Variant별 비활성 탭 버튼 Tailwind 클래스 맵
 */
const inactiveTabClasses: Record<TabsVariant, string> = {
  underline: "text-gray-600 border-b-2 border-transparent hover:text-primary hover:border-gray-300 font-medium",
  pill: "text-gray-600 bg-transparent hover:bg-gray-100 squircle-sm font-medium",
  boxed: "text-gray-600 bg-transparent hover:text-primary squircle-sm font-medium",
};

/**
 * Variant별 disabled 탭 버튼 Tailwind 클래스 맵
 */
const disabledTabClasses: Record<TabsVariant, string> = {
  underline: "text-gray-400 border-b-2 border-transparent opacity-50 cursor-not-allowed font-medium",
  pill: "text-gray-400 bg-transparent opacity-50 cursor-not-allowed squircle-sm font-medium",
  boxed: "text-gray-400 bg-transparent opacity-50 cursor-not-allowed squircle-sm font-medium",
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tab 하위 컴포넌트는 반드시 <Tabs> 내부에서 사용해야 합니다.");
  }
  return context;
}

// ---------------------------------------------------------------------------
// Tabs (Root Container)
// ---------------------------------------------------------------------------

/**
 * 탭 시스템 루트 컨테이너
 *
 * @example
 * ```tsx
 * const [tab, setTab] = useState("overview");
 *
 * <Tabs value={tab} onChange={setTab} variant="pill">
 *   <TabList>
 *     <Tab value="overview">개요</Tab>
 *     <Tab value="specs">제품 사양</Tab>
 *     <Tab value="reviews">리뷰</Tab>
 *   </TabList>
 *   <TabPanel value="overview">개요 내용...</TabPanel>
 *   <TabPanel value="specs">사양 내용...</TabPanel>
 *   <TabPanel value="reviews">리뷰 내용...</TabPanel>
 * </Tabs>
 * ```
 */
function Tabs({
  variant = "underline",
  value,
  onChange,
  className,
  children,
}: TabsProps) {
  const baseId = useId();

  const contextValue: TabsContextValue = {
    activeValue: value,
    onChange,
    variant,
    baseId,
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// TabList
// ---------------------------------------------------------------------------

/**
 * 탭 버튼 목록 래퍼 (role="tablist")
 */
function TabList({ className, children }: TabListProps) {
  const { variant } = useTabsContext();
  const listRef = useRef<HTMLDivElement>(null);

  /* ---- 키보드 네비게이션: 좌우 화살표로 탭 이동 ---- */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const list = listRef.current;
    if (!list) return;

    const tabs = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
    );
    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);

    if (currentIndex === -1) return;

    let nextIndex = -1;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = tabs.length - 1;
    }

    if (nextIndex >= 0) {
      tabs[nextIndex].focus();
    }
  }, []);

  const classes = [
    "flex items-center",
    tabListClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation="horizontal"
      className={classes}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

/**
 * 개별 탭 버튼 (role="tab")
 */
function Tab({ value, disabled = false, className, children }: TabProps) {
  const { activeValue, onChange, variant, baseId } = useTabsContext();
  const isActive = activeValue === value;

  const handleClick = useCallback(() => {
    if (!disabled) {
      onChange(value);
    }
  }, [disabled, onChange, value]);

  /* ---- 클래스 조합: 공통 기반 + variant 상태별 + 외부 className ---- */
  const stateClass = disabled
    ? disabledTabClasses[variant]
    : isActive
      ? activeTabClasses[variant]
      : inactiveTabClasses[variant];

  const classes = [
    "px-4 py-2.5 text-sm",
    "transition-all duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
    "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    stateClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      role="tab"
      type="button"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      className={classes}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// TabPanel
// ---------------------------------------------------------------------------

/**
 * 탭 패널 — 활성 탭에 해당하는 콘텐츠 영역 (role="tabpanel")
 */
function TabPanel({ value, className, children }: TabPanelProps) {
  const { activeValue, baseId } = useTabsContext();
  const isActive = activeValue === value;

  if (!isActive) return null;

  const classes = [
    "pt-4",
    "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={classes}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Tabs, TabList, Tab, TabPanel };
export type { TabsProps, TabListProps, TabProps, TabPanelProps, TabsVariant };
