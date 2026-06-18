-- =============================================================
-- brand-assets 버킷을 공개(public)로 전환
--   - 답장 메일 헤더 로고 등 브랜드 이미지를 외부(이메일 클라이언트)에서
--     고정 URL로 불러올 수 있도록 공개 전환.
--   - 버킷은 비어 있어 기존 파일 노출 위험 없음.
--   - 공개 URL 형식:
--     {SUPABASE_URL}/storage/v1/object/public/brand-assets/<path>
-- =============================================================

UPDATE storage.buckets
SET public = true
WHERE id = 'brand-assets';

-- 공개 읽기 정책 (anon 포함 누구나 SELECT 가능)
DROP POLICY IF EXISTS "Public read for brand-assets" ON storage.objects;
CREATE POLICY "Public read for brand-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');
