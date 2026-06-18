import "server-only";

/**
 * 스윗트래커 비즈엠(BizM) 문자 전용 발송 (SMS/LMS)
 *
 * - 문서: 스윗트래커 비즈엠 API v2.29.3
 * - 엔드포인트: POST {host}/v2/sender/send
 * - 헤더: Content-type: application/json, userid: <비즈엠 계정명>
 * - 바디: JSON Array (문자 전용은 smsOnly:"Y")
 *
 * 카카오 알림톡/브랜드메시지는 사용하지 않고 SMS/LMS만 발송한다.
 * 한글 본문은 byte 길이에 따라 SMS(90byte) / LMS(2000byte)를 자동 선택한다.
 *
 * 필요한 환경변수:
 *   BIZM_USER_ID       비즈엠 계정명 (userid 헤더)
 *   BIZM_PROFILE_KEY   발신프로필키 (alpha-numeric 40자)
 *   BIZM_SENDER_NUMBER 등록·승인된 발신번호 (예: 0212345678)
 *   BIZM_API_HOST      (선택) 기본값: 운영서버 https://alimtalk-api.bizmsg.kr
 */

const OPERATION_HOST = "https://alimtalk-api.bizmsg.kr";

const SMS_BYTE_LIMIT = 90; // 이 이하면 SMS, 초과 시 LMS
const LMS_BYTE_LIMIT = 2000; // LMS 최대 byte
const LMS_TITLE_MAX = 30;

export interface SendSmsParams {
  /** 수신자 전화번호 (하이픈 포함/미포함 무관) */
  to: string;
  /** 발송 본문 (발신 전용 안내 문구 등 포함 완성본) */
  text: string;
  /** LMS 제목 (LMS로 발송될 때만 사용, 미지정 시 기본값) */
  title?: string;
}

export interface SendSmsResult {
  ok: boolean;
  /** 메시지 일련번호 (성공 시) */
  msgid: string | null;
  /** 발송 종류 (S: SMS, L: LMS) */
  kind: "S" | "L";
  /** 결과/에러 코드 또는 메시지 */
  message: string;
}

/** BizM SMS byte 길이 (한글 등 비ASCII는 2byte) */
export function smsByteLength(value: string): number {
  let bytes = 0;
  for (const ch of value) {
    bytes += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  }
  return bytes;
}

/** LMS 한도 초과 여부 */
export function exceedsLmsLimit(value: string): boolean {
  return smsByteLength(value) > LMS_BYTE_LIMIT;
}

/** 전화번호에서 숫자만 남긴다 (예: "02-123-4567" -> "021234567") */
function normalizePhone(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

interface BizmConfig {
  userId: string;
  profileKey: string;
  senderNumber: string;
  host: string;
}

function readConfig(): BizmConfig | { error: string } {
  const userId = process.env.BIZM_USER_ID?.trim();
  const profileKey = process.env.BIZM_PROFILE_KEY?.trim();
  const senderNumber = process.env.BIZM_SENDER_NUMBER?.trim();
  const host = (process.env.BIZM_API_HOST?.trim() || OPERATION_HOST).replace(
    /\/$/,
    "",
  );

  if (!userId || !profileKey || !senderNumber) {
    return {
      error:
        "BizM 환경변수(BIZM_USER_ID, BIZM_PROFILE_KEY, BIZM_SENDER_NUMBER)가 설정되지 않았습니다.",
    };
  }

  return { userId, profileKey, senderNumber, host };
}

/**
 * 문자(SMS/LMS) 한 건을 발송한다.
 */
export async function sendSms({
  to,
  text,
  title,
}: SendSmsParams): Promise<SendSmsResult> {
  const config = readConfig();
  if ("error" in config) {
    return { ok: false, msgid: null, kind: "S", message: config.error };
  }

  const phone = normalizePhone(to);
  if (!phone) {
    return {
      ok: false,
      msgid: null,
      kind: "S",
      message: "수신자 전화번호가 올바르지 않습니다.",
    };
  }

  const kind: "S" | "L" =
    smsByteLength(text) > SMS_BYTE_LIMIT ? "L" : "S";

  const payload: Record<string, string> = {
    phn: phone,
    profile: config.profileKey,
    reserveDt: "00000000000000",
    smsOnly: "Y",
    smsKind: kind,
    msgSms: text,
    smsSender: normalizePhone(config.senderNumber),
  };

  // LMS 제목(smsLmsTit)은 선택값. 제목이 명시된 경우에만 포함한다.
  const lmsTitle = title?.trim();
  if (kind === "L" && lmsTitle) {
    payload.smsLmsTit = lmsTitle.slice(0, LMS_TITLE_MAX);
  }

  let response: Response;
  try {
    response = await fetch(`${config.host}/v2/sender/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        userid: config.userId,
      },
      body: JSON.stringify([payload]),
    });
  } catch (error) {
    console.error("[bizm] request failed:", error);
    return {
      ok: false,
      msgid: null,
      kind,
      message: "문자 발송 요청 중 네트워크 오류가 발생했습니다.",
    };
  }

  const raw = await response.text();

  if (!response.ok) {
    console.error("[bizm] HTTP error:", response.status, raw);
    return {
      ok: false,
      msgid: null,
      kind,
      message: `문자 발송 실패 (HTTP ${response.status})`,
    };
  }

  // 응답: JSON Array, 각 항목 { code, data, message, msgid? }
  // data 는 버전에 따라 문자열(phn) 또는 객체({phn,type,msgid}) 둘 다 가능.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("[bizm] invalid JSON response:", raw);
    return {
      ok: false,
      msgid: null,
      kind,
      message: "문자 발송 응답을 해석할 수 없습니다.",
    };
  }

  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  const item = (first ?? {}) as {
    code?: string;
    message?: string;
    msgid?: string;
    data?: unknown;
  };

  const dataMsgId =
    item.data && typeof item.data === "object"
      ? (item.data as { msgid?: string }).msgid
      : undefined;

  const msgid = item.msgid ?? dataMsgId ?? null;
  const ok = item.code === "success";

  return {
    ok,
    msgid,
    kind,
    message: item.message ?? (ok ? "success" : "문자 발송에 실패했습니다."),
  };
}
