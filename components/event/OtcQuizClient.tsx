"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./otc-quiz.module.css";

/* ==========================================================================
   셀로맥스 OTC 퀴즈 이벤트 랜딩 페이지 (Client)

   디자인 핸드오프(index.html) 기반. 단일 세로 스크롤, 최대 폭 460px.
   - 5문항 퀴즈: 오답이면 정답 안내 후 재선택 가능, 정답이면 해설 표시
   - 제출 버튼은 정보 입력 + 동의 + 5문항 전 문항 정답일 때만 활성화
   - 제출: /api/events/otc-quiz POST → 완료 카드 표시 (중복/오류는 힌트 표기)

   주의: 제품 카드의 효능·효과와 퀴즈 정답 해설은 식약처 허가사항
   원문이므로 문구를 수정하지 말 것 (핸드오프 지침).
   ========================================================================== */

// ---------------------------------------------------------------------------
// 데이터
// ---------------------------------------------------------------------------

interface QuizItem {
  no: number;
  product: string;
  question: string;
  options: readonly string[];
  correct: number;
  expPre: string;
  expTerm: string;
  expRest: string;
  expLines: readonly string[];
}

const QUIZ: readonly QuizItem[] = [
  {
    no: 1,
    product: "베베락스액",
    question: "베베락스액의 허가된 효능·효과는 무엇일까요?",
    options: ["변비", "기침·가래"],
    correct: 0,
    expPre: "베베락스액의 허가된 효능·효과는 ",
    expTerm: "변비",
    expRest:
      "입니다. 소아(3세 이상) 및 성인은 1회 5mL를 직장 내 주입하며, 3세 미만 소아는 약액의 1/2 정도를 사용합니다. D-소르비톨액 70%·농글리세린·시트르산나트륨수화물을 함유한 반투명의 점조성 액제입니다.",
    expLines: [],
  },
  {
    no: 2,
    product: "마미즈시럽",
    question: "마미즈시럽은 어떤 증상에 사용하는 의약품일까요?",
    options: ["위산과다·속쓰림", "멀미에 의한 어지러움·구토·두통의 예방 및 완화"],
    correct: 1,
    expPre: "마미즈시럽의 허가된 효능·효과는 ",
    expTerm: "멀미에 의한 어지러움.구토.두통의 예방 및 완화",
    expRest:
      "입니다. 디멘히드리네이트·카페인무수물·피리독신염산염을 함유한 스틱포 시럽제로, 만 3세 이상부터 연령별 용량이 정해져 있습니다. 멀미 예방에는 승차 30분 전에 복용하며, 1일 복용횟수는 3회를 한도로 합니다.",
    expLines: [],
  },
  {
    no: 3,
    product: "두두엔액",
    question: "두두엔액의 효능·효과에 해당하는 것은?",
    options: ["피부염, 가려움, 벌레물린데", "치질에 의한 통증"],
    correct: 0,
    expPre: "두두엔액의 허가된 효능·효과는 ",
    expTerm: "습진, 피부염, 땀띠, 가려움, 벌레물린데, 두드러기",
    expRest:
      "입니다. 프레드니솔론발레로아세테이트와 디펜히드라민염산염 등을 함유한 무색의 투명한 액제로, 1일 수회 환부에 적당량을 바릅니다. 사용 전 첨부문서의 사용상의 주의사항을 확인해 주십시오.",
    expLines: [],
  },
  {
    no: 4,
    product: "아줄린연고(구아야줄렌)",
    question: "아줄린연고의 효능·효과에 해당하는 것은?",
    options: ["코막힘", "열상(화상), 그 외의 질환에 따른 미란(짓무름) 및 궤양"],
    correct: 1,
    expPre: "아줄린연고의 허가된 효능·효과는 ",
    expTerm: "습진, 열상(화상), 그 외의 질환에 따른 미란(짓무름) 및 궤양",
    expRest:
      "입니다. 구아야줄렌을 함유한 엷은 청색의 연고제로, 1일 수회 환부에 도포합니다. 안과용으로는 사용하지 않습니다.",
    expLines: [],
  },
  {
    no: 5,
    product: "무조메 원스에프외용액 / 크림",
    question: "무조메원스에프외용액과 무조메크림의 효능·효과에 해당하는 것은?",
    options: ["족부백선", "탈모"],
    correct: 0,
    expPre: "두 제품 모두 ",
    expTerm: "테르비나핀염산염",
    expRest:
      "을 함유한 항진균제이며, 족부백선이 공통 적응증입니다. 다만 허가된 범위는 다릅니다.",
    expLines: [
      "무조메원스에프외용액 — 피부사상균에 의한 피부감염증 중 족부백선(15세 이상의 청소년 및 성인에 한함). 단 1회 적용하며, 양쪽 발 모두에 바릅니다.",
      "무조메크림 — 족부백선, 고부백선(완선), 체부백선, 어루러기, 피부칸디다증. 1일 1~2회 환부에 바릅니다.",
    ],
  },
] as const;

const OPTION_NUMS = ["①", "②", "③", "④"] as const;

/** 제품 라인업 (단일 제품 카드 4종 — 무조메 2제형은 별도 렌더링) */
const PRODUCTS = [
  {
    img: "/events/otc-quiz/beberax.png",
    alt: "베베락스액",
    cat: "관장약 · 튜브형 액제",
    catColor: "#34C759",
    name: "베베락스액",
    nameSmall: null,
    effect: "변비",
    ingredients: "D-소르비톨액 70% · 농글리세린 · 시트르산나트륨수화물",
  },
  {
    img: "/events/otc-quiz/dudouen.png",
    alt: "두두엔액",
    cat: "외용 스테로이드 · 스프레이형 액제",
    catColor: "#007AFF",
    name: "두두엔액",
    nameSmall: null,
    effect: "습진, 피부염, 땀띠, 가려움, 벌레물린데, 두드러기",
    ingredients:
      "프레드니솔론발레로아세테이트 · L-멘톨 · dl-캄파 · 티몰 · 디펜히드라민염산염",
  },
  {
    img: "/events/otc-quiz/mamiz.png",
    alt: "마미즈시럽",
    cat: "진토제 · 스틱포 시럽",
    catColor: "#FF9500",
    name: "마미즈시럽",
    nameSmall: null,
    effect: "멀미에 의한 어지러움.구토.두통의 예방 및 완화",
    ingredients: "디멘히드리네이트 · 카페인무수물 · 피리독신염산염",
  },
  {
    img: "/events/otc-quiz/azulin.png",
    alt: "아줄린연고",
    cat: "구아야줄렌 · 연고제",
    catColor: "#5AC8FA",
    name: "아줄린연고",
    nameSmall: " (구아야줄렌)",
    effect: "습진, 열상(화상), 그 외의 질환에 따른 미란(짓무름) 및 궤양",
    ingredients: "구아야줄렌",
  },
] as const;

// ---------------------------------------------------------------------------
// 컴포넌트
// ---------------------------------------------------------------------------

export function OtcQuizClient() {
  // ---- 폼 상태 ----
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [phone, setPhone] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [consent, setConsent] = useState(false);

  // ---- 퀴즈 상태: 문항별 선택 인덱스 ----
  const [picks, setPicks] = useState<Record<number, number>>({});

  // ---- 제출 상태 ----
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverHint, setServerHint] = useState<string | null>(null);

  const filled =
    !!name.trim() && !!license.trim() && !!phone.trim() && !!pharmacy.trim();
  const correctCount = QUIZ.reduce(
    (n, q, i) => n + (picks[i] === q.correct ? 1 : 0),
    0,
  );
  const ready = filled && consent && correctCount === QUIZ.length;

  /** 보기 선택 — 이미 정답을 맞힌 문항은 변경 불가, 오답은 재선택 가능 */
  function pickOption(qi: number, oi: number) {
    if (done) return;
    const prev = picks[qi];
    if (prev !== undefined && prev === QUIZ[qi].correct) return;
    setPicks((p) => ({ ...p, [qi]: oi }));
    setServerHint(null);
  }

  /** 제출 버튼 아래 안내 문구 */
  const hint = serverHint
    ? serverHint
    : ready
      ? "제출 준비가 완료되었습니다."
      : !filled
        ? "참여자 정보를 모두 입력해 주세요."
        : !consent
          ? "개인정보 수집·이용 동의가 필요합니다."
          : `남은 문항 ${QUIZ.length - correctCount}개의 정답을 맞혀 주세요.`;

  async function handleSubmit() {
    if (!ready || submitting || done) return;

    setSubmitting(true);
    setServerHint(null);
    try {
      const res = await fetch("/api/events/otc-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          license: license.trim(),
          phone: phone.trim(),
          pharmacy: pharmacy.trim(),
          consent,
          answers: QUIZ.map((_, i) => picks[i]),
        }),
      });

      if (res.ok) {
        setDone(true);
        return;
      }

      const data = await res.json().catch(() => null);
      if (data?.result === "duplicate") {
        setServerHint("이미 참여하신 약사면허번호입니다.");
      } else {
        setServerHint(
          data?.error ?? "제출이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
    } catch {
      setServerHint("제출이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.pageWrap}>
      <div className={styles.page}>
        {/* ================================================================
            히어로
            ================================================================ */}
        <section className={styles.hero}>
          <div className={styles.badges}>
            <span className={styles.badge}>일반의약품</span>
            <span className={styles.badge}>약사 대상</span>
          </div>
          <div className={styles.kicker}>셀로맥스사이언스-퍼슨 OTC 6품목</div>
          <h1 className={styles.heroTitle}>
            셀로맥스
            <br />
            OTC QUIZ EVENT
          </h1>
          <p className={styles.heroDesc}>
            제품 인식조사 · 교육 퀴즈에 참여하시면 추첨을 통해 커피 모바일
            상품권을 드립니다.
          </p>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <b>기간</b>
              <span>9.1 – 9.15</span>
            </div>
            <div className={styles.stat}>
              <b>추첨</b>
              <span>100명</span>
            </div>
            <div className={styles.stat}>
              <b>문항</b>
              <span>5문항</span>
            </div>
          </div>
        </section>

        {/* ================================================================
            제품 라인업
            ================================================================ */}
        <section className={styles.block} aria-label="제품 라인업">
          <div className={styles.eyebrow}>제품 라인업</div>
          <h2 className={styles.secTitle}>셀로맥스사이언스-퍼슨 OTC 6품목</h2>
          <p className={styles.secDesc}>
            아래 효능·효과는 식품의약품안전처 허가사항 원문입니다.
          </p>
          <div className={styles.stack}>
            {PRODUCTS.map((p) => (
              <div key={p.name} className={`${styles.card} ${styles.prod}`}>
                <Image src={p.img} alt={p.alt} width={106} height={134} />
                <div className={styles.prodBody}>
                  <div className={styles.cat} style={{ color: p.catColor }}>
                    {p.cat}
                  </div>
                  <div className={styles.pname}>
                    {p.name}
                    {p.nameSmall && <small>{p.nameSmall}</small>}
                  </div>
                  <div className={styles.flabel}>효능·효과</div>
                  <div className={styles.fval}>{p.effect}</div>
                  <div className={`${styles.flabel} ${styles.flabelMt}`}>
                    주성분
                  </div>
                  <div className={styles.fsub}>{p.ingredients}</div>
                </div>
              </div>
            ))}

            {/* 무조메 — 2제형 통합 카드 */}
            <div className={styles.card}>
              <div className={styles.cat} style={{ color: "#30B0C7" }}>
                항진균제 · 테르비나핀염산염 · 2제형
              </div>
              <div className={`${styles.pname} ${styles.pnameGroup}`}>
                무조메
              </div>
              <div className={`${styles.prod} ${styles.variantTop}`}>
                <Image
                  src="/events/otc-quiz/mujome-once.png"
                  alt="무조메원스에프외용액"
                  width={106}
                  height={134}
                />
                <div className={styles.prodBody}>
                  <div className={styles.variant}>무조메원스에프외용액</div>
                  <div className={styles.vmeta}>5g 액체타입 · 단 1회 적용</div>
                  <div className={styles.flabel}>효능·효과</div>
                  <div className={styles.fval}>
                    피부사상균에 의한 피부감염증 : 족부백선(15세 이상의 청소년
                    및 성인에 한함)
                  </div>
                  <div className={`${styles.flabel} ${styles.flabelMt}`}>
                    주성분
                  </div>
                  <div className={styles.fsub}>테르비나핀염산염</div>
                </div>
              </div>
              <div className={`${styles.prod} ${styles.variantBottom}`}>
                <Image
                  src="/events/otc-quiz/mujome-cream.png"
                  alt="무조메크림"
                  width={106}
                  height={134}
                />
                <div className={styles.prodBody}>
                  <div className={styles.variant}>무조메크림</div>
                  <div className={styles.vmeta}>15g 크림 · 1일 1~2회</div>
                  <div className={styles.flabel}>효능·효과</div>
                  <div className={styles.fval}>
                    피부사상균에 의한 피부진균감염증 : 족부백선, 고부백선(완선),
                    체부백선, 어루러기, 피부칸디다증
                  </div>
                  <div className={`${styles.flabel} ${styles.flabelMt}`}>
                    주성분
                  </div>
                  <div className={styles.fsub}>테르비나핀염산염</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            이벤트 안내
            ================================================================ */}
        <section className={styles.block} aria-label="이벤트 안내">
          <div className={styles.eyebrow}>이벤트 안내</div>
          <div className={styles.rows}>
            <div className={styles.row}>
              <div className={styles.rowKey}>기간</div>
              <div className={styles.rowVal}>2026. 9. 1 – 9. 15</div>
            </div>
            <div className={styles.row}>
              <div className={styles.rowKey}>경품</div>
              <div className={styles.rowVal}>
                투썸플레이스 아이스 아메리카노 모바일 상품권
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.rowKey}>당첨 인원</div>
              <div className={styles.rowVal}>추첨 100명</div>
            </div>
          </div>
          <div className={`${styles.stack} ${styles.stackSteps}`}>
            {[
              {
                n: 1,
                t: "참여자 정보 입력",
                d: "성함 · 약사면허번호 · 연락처 · 약국명",
              },
              {
                n: 2,
                t: "퀴즈 5문항 풀기",
                d: "오답이면 정답을 안내하고 다시 선택할 수 있습니다.",
              },
              {
                n: 3,
                t: "제출",
                d: "당첨자에게만 이벤트 종료 후 2주 이내 개별 문자로 안내합니다.",
              },
            ].map((s) => (
              <div key={s.n} className={styles.step}>
                <div className={styles.stepNum}>{s.n}</div>
                <div>
                  <div className={styles.stepTitle}>{s.t}</div>
                  <div className={styles.stepDesc}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.note}>
            본 이벤트는 약사 대상 제품 인식조사·교육 목적이며, 의약품의
            발주·처방·판매실적·구매약정과 일절 연동되지 않습니다.
          </div>
        </section>

        {/* ================================================================
            참여자 정보
            ================================================================ */}
        <section className={styles.block} aria-label="참여자 정보">
          <div className={styles.eyebrow}>참여자 정보</div>
          <div className={styles.rows}>
            <div className={styles.field}>
              <label htmlFor="f-name">성함 (필수)</label>
              <input
                id="f-name"
                type="text"
                placeholder="홍길동"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={done}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="f-license">약사면허번호 (필수)</label>
              <input
                id="f-license"
                type="text"
                inputMode="numeric"
                placeholder="숫자만 입력"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                disabled={done}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="f-phone">연락처 (필수)</label>
              <input
                id="f-phone"
                type="tel"
                placeholder="010-0000-0000"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={done}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="f-pharmacy">약국명 (필수)</label>
              <input
                id="f-pharmacy"
                type="text"
                placeholder="○○약국"
                value={pharmacy}
                onChange={(e) => setPharmacy(e.target.value)}
                disabled={done}
              />
            </div>
          </div>
          <div className={`${styles.card} ${styles.consentCard}`}>
            <div className={styles.consentTitle}>
              개인정보 수집·이용 동의 (필수)
            </div>
            {/* TODO: 보유·이용 기간(3개월) 법무 확정값 확인 필요 */}
            <div className={styles.consentBody}>
              ㈜셀로맥스사이언스는 셀로맥스 OTC QUIZ EVENT 운영을 위해
              개인정보를 아래와 같이 수집·이용합니다.
              <br />
              · 수집 항목 — 성함, 약사면허번호, 연락처, 약국명
              <br />
              · 이용 목적 — 참여자 확인, 당첨자 선정 및 경품(모바일 상품권)
              발송, 본인 확인·중복 참여 방지
              <br />
              · 보유·이용 기간 — 경품 발송 완료 및 이벤트 종료 후 3개월 이내
              지체 없이 파기
              <br />· 동의를 거부할 수 있으며, 거부 시 이벤트 참여가 제한됩니다.
            </div>
            <button
              type="button"
              className={styles.consentCheck}
              role="checkbox"
              aria-checked={consent}
              onClick={() => !done && setConsent((c) => !c)}
            >
              <span
                className={`${styles.consentBox} ${consent ? styles.consentBoxOn : ""}`}
                aria-hidden="true"
              >
                ✓
              </span>
              <span className={styles.consentLbl}>
                위 개인정보 수집·이용에 동의합니다.
              </span>
            </button>
          </div>
        </section>

        {/* ================================================================
            퀴즈
            ================================================================ */}
        <section className={styles.block} aria-label="퀴즈">
          <div className={styles.eyebrowRow}>
            <div className={styles.eyebrow}>퀴즈</div>
            <div className={styles.score}>
              정답 {correctCount}/{QUIZ.length}
            </div>
          </div>
          <div className={styles.stack}>
            {QUIZ.map((q, qi) => {
              const pick = picks[qi];
              const solved = pick === q.correct;
              return (
                <div key={q.no} className={styles.qcard}>
                  <div className={styles.qmeta}>
                    Q{q.no} · {q.product}
                  </div>
                  <div className={styles.qtext}>{q.question}</div>
                  <div
                    className={styles.opts}
                    role="radiogroup"
                    aria-label={q.question}
                  >
                    {q.options.map((label, oi) => {
                      const picked = pick === oi;
                      const stateClass = picked
                        ? oi === q.correct
                          ? styles.optRight
                          : styles.optWrong
                        : "";
                      return (
                        <button
                          key={label}
                          type="button"
                          role="radio"
                          aria-checked={picked}
                          className={`${styles.opt} ${stateClass}`}
                          onClick={() => pickOption(qi, oi)}
                        >
                          <span className={styles.optNum}>
                            {OPTION_NUMS[oi]}
                          </span>
                          <span className={styles.optTxt}>{label}</span>
                          <span className={styles.optMark}>
                            {picked ? (oi === q.correct ? "✓" : "✕") : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {pick !== undefined && !solved && (
                    <div className={styles.wrongmsg}>다시 선택해 주세요.</div>
                  )}
                  {solved && (
                    <div className={styles.exp}>
                      <div className={styles.expH}>정답</div>
                      <div className={styles.expT}>
                        {q.expPre}
                        <strong>{q.expTerm}</strong>
                        {q.expRest}
                      </div>
                      {q.expLines.map((line) => (
                        <div key={line} className={styles.expLi}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ================================================================
            제출 / 완료
            ================================================================ */}
        <section
          className={`${styles.block} ${styles.blockSubmit}`}
          aria-label="제출"
        >
          {!done ? (
            <div>
              <button
                type="button"
                className={`${styles.submit} ${ready ? styles.submitOn : ""}`}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "제출 중…" : "제출하기"}
              </button>
              <div
                className={`${styles.hint} ${serverHint ? styles.hintError : ""}`}
              >
                {hint}
              </div>
            </div>
          ) : (
            <div className={styles.done}>
              <div className={styles.doneTick}>✓</div>
              <div className={styles.doneH}>참여가 완료되었습니다</div>
              <div className={styles.doneD}>
                당첨자에게만 이벤트 종료 후 2주 이내 등록하신 연락처로 개별
                문자를 보내드립니다. 별도의 당첨자 발표 페이지는 없습니다.
              </div>
              <div className={styles.doneF}>
                약사면허번호 기준으로 1인 1회만 참여할 수 있습니다.
              </div>
            </div>
          )}
        </section>

        {/* ================================================================
            의약품 안전 고지 (접거나 숨기지 않음 — 핸드오프 지침)
            ================================================================ */}
        <section className={styles.legal}>
          <div className={styles.legalH}>의약품 안전 고지</div>
          <p>
            본 페이지에서 소개하는 제품은 모두 일반의약품입니다. 사용 전 첨부
            문서를 반드시 읽으시고, 의·약사와 상의하십시오. 부작용 발생 시 즉시
            사용을 중단하고 의·약사와 상의하시기 바랍니다.
          </p>
          <div className={styles.legalItems}>
            <div>
              <strong>베베락스액</strong> — 3세 미만 소아는 약액의 1/2 정도
              사용하십시오. 계속하여 연용하지 마십시오.
            </div>
            <div>
              <strong>두두엔액</strong> — 30개월 이하의 유아에게는 사용하지
              마십시오. 피부 감염을 수반하는 습진·상처부위에는 사용하지
              않습니다.
            </div>
            <div>
              <strong>마미즈시럽</strong> — 만 3세 미만의 영·유아 및 수유부는
              복용하지 마십시오. 복용 후 졸음이 나타날 수 있습니다.
            </div>
            <div>
              <strong>아줄린연고</strong> — 안과용으로 사용하지 마십시오.
            </div>
            <div>
              <strong>무조메원스에프외용액</strong> — 15세 미만 소아,
              임부·수유부에게는 사용하지 마십시오.
            </div>
            <div>
              <strong>무조메크림</strong> — 사용 전 첨부문서의 사용상의
              주의사항을 확인하십시오.
            </div>
          </div>
          <div className={styles.legalMeta}>
            <div>· 판매원 ㈜셀로맥스사이언스 / 제조원 ㈜퍼슨</div>
            <div>
              · 본 이벤트는 약사 대상 제품 인식조사·교육 목적이며, 의약품의
              발주·처방·판매실적과 무관합니다.
            </div>
            <div>
              · 본 페이지의 효능·효과는 식품의약품안전처 허가사항을 인용한
              것입니다.
            </div>
            {/* TODO: 품목별 의약품 광고 사전심의필 번호 확정 후 기재 (공개 전 필수) */}
            <div>· 의약품 광고 사전심의필 번호: (품목별 심의 후 기재)</div>
            <div>
              <Link href="/ko/privacy">개인정보 처리방침</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
