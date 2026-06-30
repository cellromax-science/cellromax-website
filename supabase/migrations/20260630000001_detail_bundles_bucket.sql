-- =============================================================
-- detail-bundles 버킷
-- HTML 상세페이지 ZIP 번들 업로드 및 추출된 자산(이미지/CSS/JS/폰트/영상 등)
-- 저장용. products 버킷은 image/jpeg|png|webp 만 허용하므로 번들의 다양한
-- 자산 타입과 .zip 을 받을 수 없어 전용 버킷을 둔다.
--   - public:            true  (상세페이지에서 자산 public URL 로 서빙)
--   - file_size_limit:   50MB  (process-bundle.ts 의 MAX_ZIP_BYTES 와 일치)
--   - allowed_mime_types NULL  (모든 타입 허용 — 번들 자산이 다양함)
-- =============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'detail-bundles',
  'detail-bundles',
  true,
  52428800,  -- 50MB (50 * 1024 * 1024)
  NULL       -- 모든 MIME 타입 허용
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -------------------------------------------------------------
-- detail-bundles 버킷 Storage RLS 정책
-- 실제 업로드는 service-role(서버) 또는 서명 업로드 URL(토큰)로 이뤄져 RLS 를
-- 우회하지만, 일관성을 위해 products 버킷과 동일한 권한 모델을 둔다.
-- -------------------------------------------------------------

-- [읽기] 모든 사용자(anon 포함): 상세페이지 자산 조회 가능
CREATE POLICY "detail-bundles: 모든 사용자 읽기 허용"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'detail-bundles');

-- [업로드] 마케팅/슈퍼어드민
CREATE POLICY "detail-bundles: 마케팅/슈퍼어드민 업로드 허용"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'detail-bundles'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- [수정] 마케팅/슈퍼어드민
CREATE POLICY "detail-bundles: 마케팅/슈퍼어드민 수정 허용"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'detail-bundles'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- [삭제] 슈퍼어드민만
CREATE POLICY "detail-bundles: 슈퍼어드민 삭제 허용"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'detail-bundles'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );
