"use client";

import { useState } from "react";
import Image from "next/image";
import type { QuizSubmitResult } from "@/types/event";
import styles from "./beberax-quiz.module.css";

/* ==========================================================================
   베베락스액 퀴즈 이벤트 랜딩 페이지 (Client)

   디자인 핸드오프(hifi) 스펙 기반. 단일 세로 스크롤, 최대 폭 480px.
   제출: /api/events/beberax-quiz POST → success / duplicate / error.
   오답(wrong)은 서버 호출 전 클라이언트에서 인라인 배너로 처리.
   ========================================================================== */

// ---------------------------------------------------------------------------
// 퀴즈 데이터
// ---------------------------------------------------------------------------

const QUIZ = [
  {
    question: "Q1. 베베락스액의 주성분인 D-소르비톨은 어떤 성분일까요?",
    options: [
      "직장에서 작용하는 당알코올 계열 성분",
      "석유에서 합성한 인공 색소",
      "항생제 계열 성분",
      "스테로이드 성분",
    ],
    answer: 0,
  },
  {
    question: "Q2. 베베락스액 용기(노즐)의 특징으로 옳은 것은?",
    options: [
      "별도 금형으로 제작해 팁을 둥글고 매끄럽게 처리한 노즐",
      "끝이 뾰족한 금속 노즐",
      "노즐이 없는 스프레이형",
      "유리 재질 노즐",
    ],
    answer: 0,
  },
] as const;

// TODO: 실제 영상 ID로 교체 필요 (핸드오프 placeholder)
const YOUTUBE_EMBED_SRC =
  "https://www.youtube-nocookie.com/embed/mCeFMniVuE8?rel=0&modestbranding=1";

/** 이벤트 종료 여부 — true면 참여 폼 대신 종료 공지를 표시 */
const EVENT_ENDED: boolean = true;

// ---------------------------------------------------------------------------
// 인라인 아이콘 (Lucide 스타일 stroke SVG)
// ---------------------------------------------------------------------------

function Icon({
  d,
  size = 18,
  strokeWidth = 2,
}: {
  d: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICON_PATHS = {
  play: "M8 5.14v13.72L19 12 8 5.14Z",
  leaf: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6",
  flask:
    "M10 2v7.31 M14 2v7.31 M8.5 2h7 M14 9.3a6.5 6.5 0 1 1-4 0 M5.58 16.5h12.85",
  check: "M20 6 9 17l-5-5",
  calendar:
    "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  gift: "M20 12v10H4V12 M2 7h20v5H2Z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z",
  pencil:
    "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z M15 5l4 4",
  baby: "M9 12h.01 M15 12h.01 M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5 M12 3c.2 1 .6 1.5 1.5 2 M19 12a7 7 0 1 0-14 0 4 4 0 0 0 0 8 7 7 0 0 0 14 0 4 4 0 0 0 0-8",
  adult:
    "M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8",
  alert:
    "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z M12 9v4 M12 17h.01",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 16v-4 M12 8h.01",
};

// ---------------------------------------------------------------------------
// 컴포넌트
// ---------------------------------------------------------------------------

export function BeberaxQuizClient() {
  // ---- 폼 상태 ----
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [phone, setPhone] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [consent, setConsent] = useState(false);
  const [q1, setQ1] = useState<number | null>(null);
  const [q2, setQ2] = useState<number | null>(null);

  // ---- 제출 상태 ----
  const [result, setResult] = useState<"idle" | QuizSubmitResult>("idle");
  const [submitted, setSubmitted] = useState(false); // 에러 하이라이트 트리거
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(false); // 성공 후 폼 잠금

  const fieldsFilled =
    name.trim() && license.trim() && phone.trim() && pharmacy.trim();
  const formComplete =
    !!fieldsFilled && consent && q1 !== null && q2 !== null;

  /** 보기 선택 — 오답 배너 표시 중 다시 고르면 해제 */
  function selectOption(q: 1 | 2, idx: number) {
    if (locked) return;
    if (q === 1) setQ1(idx);
    else setQ2(idx);
    if (result === "wrong") setResult("idle");
  }

  async function handleSubmit() {
    if (locked || submitting) return;
    setSubmitted(true);

    // 1. 필수 입력 검증
    if (!formComplete) {
      setResult("idle");
      return;
    }

    // 2. 오답 → 인라인 배너 (서버 호출 없음)
    if (q1 !== QUIZ[0].answer || q2 !== QUIZ[1].answer) {
      setResult("wrong");
      return;
    }

    // 3. 서버 제출 → success / duplicate / error
    setSubmitting(true);
    try {
      const res = await fetch("/api/events/beberax-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          license: license.trim(),
          phone: phone.trim(),
          pharmacy: pharmacy.trim(),
          consent,
          q1,
          q2,
        }),
      });
      const data = await res.json().catch(() => null);
      const serverResult: QuizSubmitResult =
        data?.result === "success" ||
        data?.result === "duplicate" ||
        data?.result === "wrong"
          ? data.result
          : "error";

      setResult(serverResult);
      if (serverResult === "success") setLocked(true);
    } catch {
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  }

  /** 시트 닫기 (오류 시트의 "다시 시도"는 닫기만 — 사용자가 다시 제출) */
  function closeSheet() {
    setResult("idle");
  }

  const showSheet =
    result === "success" || result === "duplicate" || result === "error";

  const fieldErr = (v: string) => submitted && !v.trim();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* ================================================================
            S1 · 히어로
            ================================================================ */}
        <section aria-label="이벤트 소개">
          <div className={styles.heroImageCard}>
            <Image
              src="/events/beberax-quiz/beberax-product.jpg"
              alt="베베락스액 제품 이미지"
              width={880}
              height={660}
              priority
              className={styles.heroImage}
            />
            <span className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} aria-hidden="true" />
              일반의약품 · 분류번호 238
            </span>
          </div>
          <div className={styles.heroText}>
            <p className={styles.heroKicker}>부드럽게 들어가는</p>
            <h1 className={styles.heroTitle}>
              베베락스액
              <br />
              <span className={styles.heroTitleBrand}>QUIZ EVENT</span>
            </h1>
            <p className={styles.heroSub}>약사 대상 제품 인식 퀴즈 이벤트</p>
          </div>
        </section>

        {/* ================================================================
            S1b · 제품 광고 영상
            ================================================================ */}
        <section aria-label="제품 광고 영상">
          <h2 className={styles.sectionTitle}>
            <Icon d={ICON_PATHS.play} />
            제품 광고 영상
          </h2>
          <div className={styles.videoFrame}>
            <iframe
              src={YOUTUBE_EMBED_SRC}
              title="베베락스액 제품 광고 영상"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>

        {/* ================================================================
            S2 · 제품 특장점
            ================================================================ */}
        <section aria-label="제품 특장점">
          <h2 className={styles.sectionTitle}>제품 특장점</h2>
          <div className={styles.featureStack}>
            {/* 카드 1 — 자연계 성분 */}
            <div className={styles.card}>
              <Image
                src="/events/beberax-quiz/fruits-sorbitol.jpg"
                alt="과일 등 자연계에 존재하는 D-소르비톨"
                width={880}
                height={448}
                className={styles.featureImage}
              />
              <div className={styles.featureBody}>
                <span className={styles.pill}>
                  <Icon d={ICON_PATHS.leaf} size={13} />
                  성분
                </span>
                <h3 className={styles.featureTitle}>
                  직장에서 작용하는 당알코올 계열 성분
                </h3>
                <p className={styles.featureDesc}>
                  D-소르비톨은 당알코올 계열의 성분으로, 직장 내에서 삼투
                  작용으로 수분을 끌어오는 데 도움을 줍니다.
                </p>
              </div>
            </div>

            {/* 카드 2 — 3가지 성분 구성 */}
            <div className={styles.card}>
              <div className={styles.featureBody}>
                <span className={styles.pill}>
                  <Icon d={ICON_PATHS.flask} size={13} />
                  성분 구성
                </span>
                <h3 className={styles.featureTitle}>
                  3가지 성분이 함께 들어 있습니다
                </h3>
                <p className={styles.featureSub}>각 성분이 맡은 역할</p>
                <div className={styles.ingredientList}>
                  {[
                    {
                      name: "D-소르비톨",
                      desc: "삼투 작용으로 수분을 끌어오는 데 도움을 줍니다.",
                    },
                    {
                      name: "시트르산나트륨",
                      desc: "수분 이동에 유리한 환경에 기여합니다.",
                    },
                    {
                      name: "농글리세린",
                      desc: "삼투·윤활 작용으로 사용을 돕습니다.",
                    },
                  ].map((item, i) => (
                    <div key={item.name} className={styles.ingredientRow}>
                      <span className={styles.ingredientNum}>{i + 1}</span>
                      <div>
                        <p className={styles.ingredientName}>{item.name}</p>
                        <p className={styles.ingredientDesc}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 카드 3 — 부드러운 노즐 */}
            <div className={styles.card}>
              <Image
                src="/events/beberax-quiz/beberax-nozzle.png"
                alt="베베락스액 노즐 팁"
                width={880}
                height={448}
                className={`${styles.featureImage} ${styles.featureImageContain}`}
              />
              <div className={styles.featureBody}>
                <span className={styles.pill}>
                  <Icon d={ICON_PATHS.leaf} size={13} />
                  노즐
                </span>
                <h3 className={styles.featureTitle}>
                  매끄럽게 가공된 둥근 노즐
                </h3>
                <p className={styles.featureDesc}>
                  별도 금형으로 노즐을 제작하여 표면이 매끄럽고 팁이 둥글게
                  처리되어 있으며, 입구 마감이 일정하도록 충진됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            S2b · 이런 분들께 권합니다
            ================================================================ */}
        <section className={styles.forWhom} aria-label="권장 대상">
          <p className={styles.forWhomOverline}>FOR WHOM</p>
          <h2 className={styles.forWhomTitle}>
            이런 분들께{" "}
            <span className={styles.heroTitleBrand}>권합니다</span>
          </h2>
          <div className={styles.forWhomCards}>
            <div className={styles.forWhomCard}>
              <span className={styles.forWhomIcon}>
                <Icon d={ICON_PATHS.baby} size={26} strokeWidth={1.8} />
              </span>
              <h3 className={styles.forWhomCardTitle}>소아 변비</h3>
              <p className={styles.forWhomCardDesc}>
                3세 이상 소아는 1회 5mL 사용
                <br />
                3세 미만 소아는 약액의 1/2 사용
              </p>
            </div>
            <div className={styles.forWhomCard}>
              <span className={styles.forWhomIcon}>
                <Icon d={ICON_PATHS.adult} size={26} strokeWidth={1.8} />
              </span>
              <h3 className={styles.forWhomCardTitle}>변비 성인</h3>
              <p className={styles.forWhomCardDesc}>
                경구 완하제로 충분히 반응하지 않는 변비
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            S3 · 이벤트 안내
            ================================================================ */}
        <section aria-label="이벤트 안내">
          <h2 className={styles.sectionTitle}>이벤트 안내</h2>
          <div className={styles.infoCard}>
            {[
              {
                icon: ICON_PATHS.calendar,
                label: "이벤트 기간",
                value: "2026-07-25 ~ 2026-08-08",
              },
              {
                icon: ICON_PATHS.gift,
                label: "이벤트 경품",
                value: "투썸플레이스 아이스 아메리카노 쿠폰 (추첨 100명)",
              },
              {
                icon: ICON_PATHS.pencil,
                label: "참여 방법",
                value: "아래 정보 입력 후 간단한 퀴즈를 풀고 제출하세요",
              },
            ].map((row) => (
              <div key={row.label} className={styles.infoRow}>
                <span className={styles.infoIcon}>
                  <Icon d={row.icon} size={16} strokeWidth={1.8} />
                </span>
                <div>
                  <p className={styles.infoLabel}>{row.label}</p>
                  <p className={styles.infoValue}>{row.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================
            S4 + S5 · 참여 폼 + 퀴즈 (하나의 카드)
            ================================================================ */}
        <section aria-label="이벤트 참여">
          <div className={styles.formCard}>
            {EVENT_ENDED ? (
              /* ---- 이벤트 종료 공지 ---- */
              <div className={styles.endedNotice}>
                <span className={styles.endedIcon}>
                  <Icon d={ICON_PATHS.calendar} size={28} strokeWidth={1.8} />
                </span>
                <h2 className={styles.endedTitle}>이벤트가 종료되었습니다</h2>
                <p className={styles.endedBody}>
                  참여해 주신 모든 분께 감사드립니다.
                  <br />
                  당첨자는 개별 안내드립니다.
                </p>
              </div>
            ) : (
              <>
            <h2 className={styles.sectionTitle}>참여 정보 입력</h2>
            <div className={styles.fieldGroup}>
              <div>
                <label className={styles.fieldLabel} htmlFor="bq-name">
                  성함
                </label>
                <input
                  id="bq-name"
                  className={`${styles.input} ${fieldErr(name) ? styles.inputError : ""}`}
                  type="text"
                  autoComplete="name"
                  placeholder="성함을 입력해 주세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={locked}
                />
              </div>
              <div>
                <label className={styles.fieldLabel} htmlFor="bq-license">
                  약사면허번호
                </label>
                <input
                  id="bq-license"
                  className={`${styles.input} ${fieldErr(license) ? styles.inputError : ""}`}
                  type="text"
                  inputMode="numeric"
                  placeholder="숫자만 입력해 주세요"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  disabled={locked}
                />
              </div>
              <div>
                <label className={styles.fieldLabel} htmlFor="bq-phone">
                  연락처
                </label>
                <input
                  id="bq-phone"
                  className={`${styles.input} ${fieldErr(phone) ? styles.inputError : ""}`}
                  type="tel"
                  autoComplete="tel"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={locked}
                />
              </div>
              <div>
                <label className={styles.fieldLabel} htmlFor="bq-pharmacy">
                  약국명
                </label>
                <input
                  id="bq-pharmacy"
                  className={`${styles.input} ${fieldErr(pharmacy) ? styles.inputError : ""}`}
                  type="text"
                  placeholder="근무 약국명을 입력해 주세요"
                  value={pharmacy}
                  onChange={(e) => setPharmacy(e.target.value)}
                  disabled={locked}
                />
              </div>
            </div>

            {/* 동의 체크박스 */}
            <label className={styles.consentRow}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={locked}
                style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
              />
              <span
                className={[
                  styles.consentBox,
                  consent ? styles.consentBoxChecked : "",
                  submitted && !consent ? styles.consentBoxError : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              >
                {consent && <Icon d={ICON_PATHS.check} size={14} strokeWidth={3} />}
              </span>
              <span className={styles.consentText}>
                개인정보 수집·이용에 동의합니다 (필수)
              </span>
            </label>

            {/* 동의 안내 박스 */}
            {/* TODO: 보유기간 실제 값 확인 필요 */}
            <div className={styles.consentNote}>
              수집 항목: 성함, 약사면허번호, 연락처, 약국명 · 목적: 이벤트 참여
              확인·당첨자 선정·경품 발송·본인확인 · 보유기간: 이벤트 종료 후
              3개월 이내 파기
            </div>

            <div className={styles.formDivider} />

            {/* 퀴즈 */}
            <h2 className={styles.sectionTitle}>퀴즈</h2>
            <p className={styles.quizSub}>2문항 · 4지선다</p>

            {QUIZ.map((quiz, qIdx) => {
              const selected = qIdx === 0 ? q1 : q2;
              return (
                <div key={quiz.question}>
                  <p className={styles.quizQuestion}>{quiz.question}</p>
                  <div
                    className={styles.optionStack}
                    role="radiogroup"
                    aria-label={quiz.question}
                  >
                    {quiz.options.map((opt, oIdx) => {
                      const isSelected = selected === oIdx;
                      return (
                        <button
                          key={opt}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={[
                            styles.optionCell,
                            isSelected ? styles.optionCellSelected : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() =>
                            selectOption(qIdx === 0 ? 1 : 2, oIdx)
                          }
                          disabled={locked}
                        >
                          <span
                            className={[
                              styles.optionRadio,
                              isSelected ? styles.optionRadioSelected : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            aria-hidden="true"
                          >
                            {isSelected && (
                              <Icon
                                d={ICON_PATHS.check}
                                size={13}
                                strokeWidth={3}
                              />
                            )}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* 오답 인라인 배너 */}
            {result === "wrong" && (
              <div className={styles.wrongBanner} role="alert">
                <Icon d={ICON_PATHS.alert} size={17} />
                정답이 아닙니다. 다시 선택해 주세요.
              </div>
            )}

            {/* 폼 에러 텍스트 */}
            {submitted && !formComplete && (
              <p className={styles.formErrorText}>
                모든 항목을 입력하고 퀴즈를 선택한 뒤 동의해 주세요.
              </p>
            )}

            {/* 제출 버튼 */}
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={locked || submitting}
            >
              {locked
                ? "참여가 완료되었습니다"
                : submitting
                  ? "제출 중..."
                  : "이벤트 참여하기"}
            </button>
              </>
            )}

            {/* 셀로맥스 가입문의 — 외부 링크 (새 창) */}
            <a
              href="https://www.cellromax.co.kr/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryBtn}
            >
              셀로맥스 가입문의
            </a>
          </div>
        </section>
      </div>

      {/* ==================================================================
          S7 · 하단 법적 고지 + footer (흰 배경 · 고대비 · 유리질 아님)
          ================================================================== */}
      <footer className={styles.legal}>
        <div className={styles.legalInner}>
          <p className={styles.legalHeader}>
            <Icon d={ICON_PATHS.info} size={15} />
            필수 안내
          </p>
          <ul className={styles.legalList}>
            <li>
              본 제품은 의약품이며, 의·약사와 상의 후 사용하십시오. 사용 전
              첨부 문서를 반드시 읽으십시오.
            </li>
            <li>의약품 광고 사전심의필 번호: 2026-1809-001700</li>
            <li>
              본 이벤트는 약사 대상 제품 인식조사·교육 목적이며, 의약품의
              발주·처방·판매실적과 무관합니다.
            </li>
          </ul>
          <p className={styles.footerText}>
            판매원 ㈜셀로맥스사이언스 · 제조원 ㈜퍼슨
            <br />
            고객상담 031-662-1395
          </p>
        </div>
      </footer>

      {/* ==================================================================
          S6 · 결과 바텀 시트 (완료 / 중복 / 오류)
          ================================================================== */}
      {showSheet && (
        <>
          <div
            className={styles.sheetDim}
            onClick={closeSheet}
            aria-hidden="true"
          />
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="제출 결과"
          >
            <div className={styles.sheetGrabber} aria-hidden="true" />

            {result === "success" && (
              <>
                <span
                  className={`${styles.sheetIcon} ${styles.sheetIconSuccess}`}
                >
                  <Icon d={ICON_PATHS.check} size={30} strokeWidth={3} />
                </span>
                <h3 className={styles.sheetTitle}>참여가 완료되었습니다</h3>
                <p className={styles.sheetBody}>
                  당첨자는 이벤트 종료 후 개별 안내드립니다. 경품은 카카오톡
                  선물하기로 발송됩니다.
                </p>
                <button
                  type="button"
                  className={`${styles.sheetBtn} ${styles.sheetBtnBrand}`}
                  onClick={closeSheet}
                >
                  확인
                </button>
              </>
            )}

            {result === "duplicate" && (
              <>
                <span
                  className={`${styles.sheetIcon} ${styles.sheetIconWarning}`}
                >
                  <Icon d={ICON_PATHS.info} size={30} />
                </span>
                <h3 className={styles.sheetTitle}>
                  이미 참여하신 약사면허번호입니다
                </h3>
                <button
                  type="button"
                  className={`${styles.sheetBtn} ${styles.sheetBtnGray}`}
                  onClick={closeSheet}
                >
                  확인
                </button>
              </>
            )}

            {result === "error" && (
              <>
                <span
                  className={`${styles.sheetIcon} ${styles.sheetIconDanger}`}
                >
                  <Icon d={ICON_PATHS.alert} size={28} />
                </span>
                <h3 className={styles.sheetTitle}>
                  제출 중 오류가 발생했습니다
                </h3>
                <p className={styles.sheetBody}>잠시 후 다시 시도해 주세요.</p>
                <button
                  type="button"
                  className={`${styles.sheetBtn} ${styles.sheetBtnBrand}`}
                  onClick={closeSheet}
                >
                  다시 시도
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
