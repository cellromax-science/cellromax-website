import "server-only";

/**
 * 답장 발송 공통 설정 / 발신 전용 안내 문구
 *
 * 답변 메일·문자는 모두 발신 전용 주소(noreply@)에서 나가므로,
 * 고객이 회신해도 닿지 않는다. 따라서 본문 끝에 안내 문구를 자동으로 덧붙인다.
 */

export const REPLY_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL ?? "noreply@cellromax.com";
export const REPLY_FROM_NAME =
  process.env.CONTACT_FROM_NAME ?? "셀로맥스사이언스";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cellromax.com"
).replace(/\/$/, "");

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/$/,
  "",
);

const CONTACT_PAGE_URL =
  process.env.NEXT_PUBLIC_CONTACT_URL ?? `${SITE_URL}/contact`;

/**
 * 다크 헤더 배너용 흰색 로고 (절대 URL — 메일 클라이언트 호환).
 * 웹사이트 배포와 무관하게 항상 열리는 Supabase 공개 스토리지 URL을 기본값으로 사용.
 */
const HEADER_LOGO_URL =
  process.env.NEXT_PUBLIC_EMAIL_LOGO_URL ??
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/logo-cellromax-white.png`;

/** 헤더 배너 배경색 (브랜드 딥 네이비) */
const HEADER_BG_COLOR = "#0a1628";

/** 메일 본문 하단 안내 문구 (여러 줄) */
export const EMAIL_REPLY_NOTICE_LINES = [
  "본 메일은 발신 전용으로, 회신하실 수 없습니다.",
  `추가 문의가 있으시면 고객센터 또는 셀로맥스 홈페이지 문의하기(${CONTACT_PAGE_URL})를 통해 새로 접수해 주시기 바랍니다.`,
  "셀로맥스사이언스 드림",
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 관리자가 입력한 답변 본문 + 발신 전용 안내 문구를 합쳐 메일 HTML을 만든다.
 * (안내 문구는 메일 전용 — 문자에는 붙이지 않는다.)
 */
export function buildReplyEmailHtml(body: string): string {
  const escapedBody = escapeHtml(body).replace(/\n/g, "<br>");

  const noticeHtml = EMAIL_REPLY_NOTICE_LINES.map(
    (line) => `<p style="margin:0 0 4px;">${escapeHtml(line)}</p>`,
  ).join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:#f4f6f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:600px;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;font-family:sans-serif;">
            <tr>
              <td style="background-color:${HEADER_BG_COLOR};padding:24px 28px;">
                <img src="${HEADER_LOGO_URL}" alt="${escapeHtml(REPLY_FROM_NAME)}" height="28" style="display:block;height:28px;width:auto;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;color:#0a1628;line-height:1.7;">
                <div style="font-size:15px;white-space:pre-wrap;">${escapedBody}</div>
                <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999;line-height:1.6;">
                  ${noticeHtml}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}
