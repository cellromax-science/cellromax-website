-- =============================================================
-- event_entries 일반화 + 구매 인증 업로드 버킷(event-uploads)
-- Project: Cellromax-Homepage_Renewal (셀로맥스사이언스)
-- Created: 2026-10-15
--
-- 『약국경영학개론』 출간 이벤트처럼 약사 면허번호 없이 참여하는
-- 이벤트를 같은 event_entries 테이블로 받기 위한 확장:
--   - license_number / pharmacy_name 을 선택 항목으로 완화
--   - 구분(약사/약대생/일반인)·소속명·경품 수령 주소·첨부파일 컬럼 추가
--   - 면허번호가 없는 이벤트는 (event_slug, phone) 으로 중복 참여 방지
--   - 구매 인증 파일용 비공개 버킷 event-uploads 생성
--     (업로드는 서버가 발급한 1회용 서명 URL로만 수행 → anon INSERT 정책 없음)
-- =============================================================

-- =============================================================
-- 1. event_entries 컬럼 확장
-- =============================================================

-- 퀴즈 이벤트 전용이던 필수 컬럼을 선택 항목으로 완화
ALTER TABLE event_entries ALTER COLUMN license_number DROP NOT NULL;
ALTER TABLE event_entries ALTER COLUMN pharmacy_name DROP NOT NULL;

-- 참여자 구분: pharmacist(약사) / pharmacy_student(약대생) / general(일반인)
ALTER TABLE event_entries ADD COLUMN category TEXT
  CHECK (category IN ('pharmacist', 'pharmacy_student', 'general'));

-- 소속명 (약사: 약국명, 약대생: 학교명, 일반인: 선택 기재)
ALTER TABLE event_entries ADD COLUMN affiliation TEXT;

-- 경품 수령 주소
ALTER TABLE event_entries ADD COLUMN zipcode TEXT;
ALTER TABLE event_entries ADD COLUMN address TEXT;
ALTER TABLE event_entries ADD COLUMN address_detail TEXT;

-- 구매 인증 파일 (event-uploads 버킷 내 객체 경로 배열, 최대 5개,
-- 예: ARRAY['book-preorder/<uuid>.jpg', ...])
ALTER TABLE event_entries ADD COLUMN file_paths TEXT[];

-- 제출 시점에 노출된 동의 문구 버전 (분쟁 대비 증빙용, 예: 'book-event-v1')
ALTER TABLE event_entries ADD COLUMN consent_version TEXT;

-- 면허번호가 없는 이벤트는 같은 이벤트에 같은 연락처로 중복 참여 불가.
-- 기존 퀴즈 이벤트 행(license_number 존재)은 영향 없음.
CREATE UNIQUE INDEX event_entries_unique_phone
  ON event_entries (event_slug, phone)
  WHERE license_number IS NULL;

-- =============================================================
-- 2. 파기 이력에 파일 삭제 건수 기록용 컬럼 (앱에서 기록)
-- =============================================================

ALTER TABLE event_destruction_logs ADD COLUMN destroyed_file_count INTEGER;

-- =============================================================
-- 3. event-uploads 버킷 생성 (비공개)
-- =============================================================
-- 구매 인증 캡처/영수증 사진 저장용. 개인정보에 준하므로:
--   - 비공개 버킷, 열람은 마케팅/슈퍼어드민의 서명 URL 발급으로만
--   - 업로드는 서버 API가 검증 후 발급하는 1회용 서명 업로드 URL로만
--     수행 (service role 발급 토큰이라 anon INSERT 정책 불필요)
--   - 이벤트 파기 시 앱에서 해당 이벤트 경로의 객체도 함께 삭제

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-uploads',
  'event-uploads',
  false,
  10485760,  -- 10MB (10 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- [읽기] 마케팅/슈퍼어드민: 관리자 페이지에서 첨부파일 열람
CREATE POLICY "event-uploads: 마케팅/슈퍼어드민 읽기 허용"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'event-uploads'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- [삭제] 슈퍼어드민: 개인정보 파기 시 파일 삭제
CREATE POLICY "event-uploads: 슈퍼어드민 삭제 허용"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-uploads'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );

-- INSERT/UPDATE 정책 없음: 업로드는 서버가 발급한 서명 URL로만 수행.
