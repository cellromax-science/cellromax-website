# 온라인 문의 페이지 - 탭 기반 3분류 설계

## 개요

온라인 문의 페이지를 소비자/약사/비즈니스 3개 탭으로 분리하여, 각 문의 유형별로 다른 필드와 수신 이메일을 설정한다.

## 탭 구조 & 필드

### 소비자 문의 (consumer)
- 수신: yanggoon@cellromax.com
- 필드: 성함*, 이메일*, 연락처*, 제목*, 내용*, 개인정보 동의*

### 약사 문의 (pharmacist)
- 수신: yanggoon@cellromax.com
- 필드: 성함*, 약국명*, 약국 주소*, 제목*, 내용*, 개인정보 동의*

### 비즈니스 문의 (business)
- 수신: yanggoon@cellromax.com
- 필드: 회사명*, 국가(드롭다운)*, 부서 및 직급*, 성함*, 이메일*, 제목*, 내용*, 개인정보 동의*

(`*` = 필수)

## DB 스키마 변경

마이그레이션으로 `inquiries` 테이블 수정:
- `inquiry_type` CHECK: `('consumer', 'pharmacist', 'business')`
- 새 컬럼: `phone`, `subject`, `pharmacy_name`, `pharmacy_address`, `department_position`, `recipient_email`
- `country`, `company`: NULL 허용 (비즈니스만 사용)

## 이메일 수신 매핑

```typescript
const INQUIRY_EMAIL_MAP = {
  consumer: 'yanggoon@cellromax.com',
  pharmacist: 'yanggoon@cellromax.com',
  business: 'yanggoon@cellromax.com',
};
```

서버 사이드 config로 관리. 추후 이메일 주소만 변경하면 각 담당자에게 직접 전달됨.

## 컴포넌트 구조

```
app/[locale]/contact/page.tsx          ← 서버 컴포넌트 (메타데이터)
components/contact/ContactPage.tsx     ← 탭 관리 클라이언트 컴포넌트
components/contact/ConsumerForm.tsx    ← 소비자 문의 폼
components/contact/PharmacistForm.tsx  ← 약사 문의 폼
components/contact/BusinessForm.tsx    ← 비즈니스 문의 폼
```

## i18n 메시지 구조

4개 언어 파일(ko, en, zh, vi)에 탭/폼 라벨 추가. 기존 단일 폼 구조를 탭 기반으로 교체.

## 검증

Zod 스키마를 탭별로 분리하여 각 폼에 맞는 필드만 검증.

## API

Server Action 또는 API Route로 폼 제출 처리:
1. Zod 검증
2. Supabase inquiries 테이블 INSERT
3. Resend로 수신 이메일 전송
4. Toast로 성공/실패 피드백
