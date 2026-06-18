# 문의 답장 기능 기획 (메일 + 문자)

작성일: 2026-06-18

## 1. 목적 / 범위

### 1.1 들어온 문의 알림 (기존 유지)

고객이 문의를 등록하면 그 내용이 회사 담당자에게 **메일로 알림**된다. → **현재 구현 그대로 유지**, 이번 작업에서 변경 없음.

### 1.2 문의 답변 발송 (이번 작업)

문의 관리 화면(홈페이지 관리자)에서 관리자가 고객에게 **직접 답변을 작성해 메일·문자로 발송**한다.

- **발송 위치**: 홈페이지(관리자 화면)에서 발송
- **답장 방식**: 관리자 수동 답장 (자동 발송 트리거 없음)
- **채널**:
  - **메일**: 기존 Resend 인프라 재사용. **답변 템플릿과 함께 발송**(템플릿 본문에 답변 내용을 담아 보냄)
  - **문자**: **SMS/LMS**로 답변 발송 — **BizM(비즈엠)** 신규 연동. **템플릿 없이 자유 입력 → 발송 → 내역 기록만** 구현
- "자동"은 **템플릿 자동 채움** 수준으로 구현 (관리자가 템플릿 선택 → 본문 자동 입력 → 수정 후 발송)

> 문자 길이 참고: SMS 단문은 한글 약 45자(90byte)까지다. 답변이 이를 넘으면 BizM이 자동으로 **LMS(장문)** 로 전환 발송한다. (별도 코드 분기 없이 길이로 자동 판정)
> 알림톡은 사전 승인된 고정 템플릿만 발송 가능해 자유 답장에는 맞지 않으므로 이번 범위에서 제외(추후 접수확인 등 고정 문구용으로 확장 가능).

## 2. 현재 구조 (기준점)

- 프레임워크: Next.js 16 / React 19 / TypeScript, DB: Supabase(PostgreSQL, RLS)
- 메일: Resend (`RESEND_API_KEY`) — 현재는 "고객→회사" 접수 알림 방향만 존재
- 문자: **없음** (신규 연동 필요)
- 문의 테이블 `inquiries`: status(pending→reviewing→replied→closed), replied_at, replied_by, email_status 보유
- 관리자 화면: `components/admin/InquiryListClient.tsx` (상세 모달, 상태 변경, 메모)
- 권한: `super_admin`, `inquiry` 역할이 문의 상태/메모 수정 가능

관련 파일
- 문의 API: `app/api/inquiries/route.ts`, `app/api/inquiries/[id]/route.ts`
- 관리자 UI: `components/admin/InquiryListClient.tsx`
- 메일 발송: `app/[locale]/contact/actions.ts`
- 수신자 설정: `lib/contact/recipient-settings.ts`, `app/api/contact-recipient-settings/route.ts`

## 3. 채널별 발송 가능 조건

| 유형 | email 보유 | phone 보유 | 메일 답장 | 문자 답장 |
|------|:--:|:--:|:--:|:--:|
| 소비자(consumer) | 필수 | 필수 | ✅ | ✅ |
| 비즈니스(business) | 필수 | 필수 | ✅ | ✅ |
| 약사(pharmacist) | 없을 수 있음 | 필수 | 조건부 | ✅ |

→ UI에서 연락처가 없는 채널 체크박스는 **비활성화** 처리한다.

## 4. 데이터 모델 변경

답장은 여러 번 발송될 수 있으므로 별도 이력 테이블을 둔다.

```sql
-- 답장 이력 (1 문의 : N 답장)
create table inquiry_replies (
  id            uuid primary key default gen_random_uuid(),
  inquiry_id    uuid not null references inquiries(id) on delete cascade,
  channel       varchar(10) not null,      -- 'email' | 'sms'
  to_address    varchar(200) not null,      -- 발송된 이메일 or 전화번호(발송 시점 스냅샷)
  subject       varchar(300),               -- 메일 전용
  body          text not null,
  status        varchar(10) not null,       -- 'sent' | 'failed'
  provider_id   varchar(200),               -- Resend id / BizM msgid (추적용)
  error_message text,
  sent_by       uuid references auth.users(id),
  created_at    timestamptz default now()
);
create index idx_inquiry_replies_inquiry on inquiry_replies(inquiry_id);

-- 답장 템플릿
create table inquiry_reply_templates (
  id            uuid primary key default gen_random_uuid(),
  title         varchar(100) not null,      -- 예: "재고 문의 응답"
  channel       varchar(10),                -- null = 공용
  subject       varchar(300),               -- 메일용
  body          text not null,
  inquiry_type  varchar(50),                -- null = 전 유형 공용
  created_by    uuid references auth.users(id),
  updated_at    timestamptz default now(),
  created_at    timestamptz default now()
);
```

기존 `inquiries`에는 목록 뱃지 표시용으로 가볍게만 추가한다.
- `last_replied_channel varchar(10)` — 마지막 답장 채널
- (선택) `sms_status varchar(20)` — 문자 발송 상태 요약

> RLS: 두 테이블 모두 RLS 활성화, `super_admin`/`inquiry` 역할만 select/insert. 발송은 서버(service-role)에서 수행.

## 5. 백엔드

### 5.1 답장 발송 API — `POST /api/inquiries/[id]/reply` (신규)

요청 body:
```json
{ "channels": ["email", "sms"], "subject": "...", "body": "...", "templateId": "optional" }
```

처리 순서:
1. 권한 체크 (`super_admin` / `inquiry`)
2. CSRF 검사 (`assertSameOrigin` — 기존 패턴 재사용)
3. 입력 검증 (채널별 연락처 존재 여부, 길이: 메일 5000자 / 문자 1000자)
4. 채널별 발송
   - **email**: 기존 Resend 클라이언트 재사용. From `noreply@cellromax.com`, **발신 전용(Reply-To 미설정)**, To는 고객 email, 본문 HTML 이스케이프
     - 발신 전용이므로 메일 하단에 **안내 문구 고정 삽입**(고객이 이 메일에 회신해도 받을 수 없음 → 추가 문의는 고객센터 또는 홈페이지 문의로 새로 접수 안내). 아래 5.4 참고
   - **sms**: 신규 `lib/sms/bizm.ts` 호출
5. 채널별 결과를 `inquiry_replies`에 insert
6. 한 채널이라도 성공 시 `inquiries.status='replied'`, `replied_at`/`replied_by` 갱신, `last_replied_channel` 기록
7. 부분 실패 처리 — 채널별 성공/실패를 응답으로 반환 (예: 메일 성공 / 문자 실패)

### 5.2 템플릿 CRUD — `/api/inquiry-reply-templates` (신규)

기존 `contact-recipient-settings` API 패턴(권한 + CSRF + Supabase upsert) 그대로 따른다.

### 5.3 BizM 연동 — `lib/sms/bizm.ts` (신규)

- 환경변수: `BIZM_API_KEY`(또는 userid/profile key), `BIZM_SENDER_NUMBER`(사전 등록 발신번호)
- 본문 byte 길이로 SMS(90byte)/LMS 자동 판정 → 한글 답변은 사실상 LMS
- 응답 `msgid` 저장, 실패 코드 매핑하여 `error_message`에 기록

### 5.4 발신 전용 안내 문구 (필수 고정 삽입)

답변 메일/문자는 모두 발신 전용 주소에서 나가므로, 고객이 회신해도 닿지 않는다. 따라서 본문 끝에 안내 문구를 자동으로 덧붙인다. (관리자 입력 본문 + 시스템 안내 문구)

- **메일 푸터(예시)**

  > 본 메일은 발신 전용으로, 회신하실 수 없습니다.
  > 추가 문의가 있으시면 고객센터 또는 셀로맥스 홈페이지 문의하기를 통해 새로 접수해 주시기 바랍니다.
  > 셀로맥스사이언스 드림

- **문자 푸터(예시, SMS 길이 고려해 축약)**

  > ※ 발신전용. 추가 문의는 홈페이지 문의하기로 접수 바랍니다.

> 문구는 코드에 상수로 두되 추후 변경 가능하도록 분리. 홈페이지 문의 페이지 링크(예: `https://cellromax.com/contact`)를 메일 문구에 포함.

## 6. 관리자 UI (`InquiryListClient.tsx` 상세 모달 확장)

상세 모달에 **탭** 추가: `문의 내용` / `답장하기` / `답장 이력`

- **답장하기 탭**
  - 채널 체크박스 (연락처 유무에 따라 활성/비활성)
  - **메일**: 템플릿 드롭다운 → 선택 시 제목·본문 자동 채움 + 수정 가능 (= "자동 답장"의 실체)
  - **문자**: 템플릿 없이 본문 textarea 직접 입력 (자유 입력)
  - 우측 미리보기 (메일/문자 각각, 발신 전용 안내 문구 포함된 최종 형태)
  - [발송] 버튼 → 결과 토스트 (채널별 성공/실패)
- **답장 이력 탭**: `inquiry_replies` 목록 (채널·발송시각·발송자·성공 여부·내용)
- **목록 화면**: status 뱃지 외 답장 채널 아이콘(✉/💬) 표시, (선택) "미답변만 보기" 필터

## 7. 권한 / 보안

- `super_admin`, `inquiry` 역할만 답장 발송 (기존 문의 수정 권한과 동일)
- 발송은 항상 server-side(service-role), CSRF 검사 유지
- 메일 본문 HTML 이스케이프, 채널별 길이 제한, 발송 전 연락처 형식 검증
- 문의 답장은 정보성(transactional) 메시지 → 광고 표기·수신거부 의무 없음

## 8. 외부/선행 작업 (코드 외)

- BizM 계정 및 연동키 발급
- **발신번호 사전등록** (통신사 법적 의무 — 미등록 시 발송 불가)
- BizM 계약 형태 확인: **SMS/LMS 발송 가능 여부** (알림톡만 가능하면 자유 답장 불가 → 범위 재조정 필요)
- 문자 발송 건당 과금 비용 확인

## 9. 단계별 구현 순서

1. **Phase 1 — 메일 답장 (템플릿 포함)** ✅ 구현 완료 (2026-06-18)
   - `inquiry_replies` / `inquiry_reply_templates` 테이블 + RLS — `supabase/migrations/20260618000001_inquiry_replies.sql`
   - 답변 템플릿 시드 2건 + CRUD (`/api/inquiry-reply-templates`, `/[id]`)
   - `POST /api/inquiries/[id]/reply` (email 발송 + 이력 기록), `GET` (이력 조회)
   - 상세 모달 탭(문의 내용 / 답장하기 / 답장 이력) — `components/admin/InquiryListClient.tsx`
   - 발신 전용 안내 문구 자동 첨부 — `lib/contact/reply.ts`
   - 기존 Resend 인프라만으로 완결, 즉시 가치 제공
2. **Phase 2 — SMS 답장 (BizM)** ✅ 구현 완료 (2026-06-18)
   - `lib/sms/bizm.ts` — 비즈엠 `POST /v2/sender/send`, 문자 전용(`smsOnly:"Y"`), byte 길이로 SMS(90)/LMS(2000) 자동 선택
   - reply API(`app/api/inquiries/[id]/reply/route.ts`)에 sms 채널 발송 + 내역 기록 추가
   - UI 문자 체크박스 활성화(전화번호 있을 때), 템플릿 없이 본문 자유 입력, 발신전용 안내 문구(축약) 자동 첨부
   - **필요 env**: `BIZM_USER_ID`(비즈엠 계정명), `BIZM_PROFILE_KEY`(발신프로필키 40자), `BIZM_SENDER_NUMBER`(등록 발신번호), (선택)`BIZM_API_HOST`
   - 운영서버 `https://alimtalk-api.bizmsg.kr` / 개발서버 `https://dev-alimtalk-api.bizmsg.kr:1443`
3. **Phase 3 — 운영 개선**
   - 템플릿 관리 화면 고도화
   - 목록 뱃지(✉/💬) + "미답변만 보기" 필터

## 10. 확인 필요 사항 (Open Questions)

1. ~~Reply-To 주소~~ → **확정**: 답변 메일은 `noreply@cellromax.com` **발신 전용**(Reply-To 미설정). 본문 하단에 "회신 불가, 추가 문의는 고객센터/홈페이지 문의로 새로 접수" 안내 문구 고정 삽입 (§5.4)
2. ~~BizM 계약 형태~~ → **확정**: SMS/LMS 발송 가능
3. ~~발신번호~~ → **확정**: 사전등록 완료

> 모든 결정사항 확정 완료. 남은 입력값은 BizM 연동키/발신번호를 환경변수(`BIZM_API_KEY`, `BIZM_SENDER_NUMBER`)에 설정하는 것뿐.
