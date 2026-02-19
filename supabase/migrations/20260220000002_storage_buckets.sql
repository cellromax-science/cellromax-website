-- =============================================================
-- [Phase2-4] Supabase Storage 버킷 생성 및 접근 정책
-- Project: Cellromax-Homepage_Renewal (셀로맥스사이언스)
-- Created: 2026-02-20
-- Depends on:
--   - 20260219000001_initial_schema.sql (admin_profiles 테이블)
--   - 20260220000001_rls_policies.sql   (테이블 RLS 정책)
--
-- 5개 Storage 버킷 생성 및 각 버킷별 RLS 정책 정의
--   1. products     (public)  - 제품 이미지
--   2. ir-files     (public)  - IR 자료 (PDF)
--   3. newsroom     (public)  - 뉴스룸 이미지
--   4. brand-assets (private) - 브랜드 자산 (관리자 전용)
--   5. pharmacies   (private) - 약국 데이터 (CSV)
-- =============================================================


-- =============================================================
-- 1. Storage 버킷 생성
-- =============================================================
-- ON CONFLICT DO NOTHING 으로 멱등성 보장 (중복 실행 시 오류 방지)

-- products: 제품 이미지 (thumbnails/, gallery/, detail/)
-- 썸네일/갤러리 최대 2MB, 상세 이미지 최대 10MB -> 버킷 단위 제한은 10MB로 설정
-- 허용 MIME: jpg, png, webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  10485760,  -- 10MB (10 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ir-files: IR 자료 PDF (연도별 폴더: 2024/, 2025/ 등)
-- PDF 파일 최대 50MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ir-files',
  'ir-files',
  true,
  52428800,  -- 50MB (50 * 1024 * 1024)
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- newsroom: 뉴스룸 이미지 (images/)
-- 이미지 최대 5MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'newsroom',
  'newsroom',
  true,
  5242880,   -- 5MB (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- brand-assets: 브랜드 자산 - 관리자 전용 (logos/, certifications/, hero/)
-- 이미지/SVG/PDF 허용, 최대 20MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  false,
  20971520,  -- 20MB (20 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- pharmacies: 약국 데이터 CSV 백업 (csv/)
-- CSV 파일 최대 10MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pharmacies',
  'pharmacies',
  false,
  10485760,  -- 10MB (10 * 1024 * 1024)
  ARRAY['text/csv', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- 2. products 버킷 Storage RLS 정책
-- =============================================================

-- [읽기] 모든 사용자(anon 포함): 제품 이미지 조회 가능
-- 웹사이트에서 제품 이미지를 표시할 때 사용
CREATE POLICY "products: 모든 사용자 읽기 허용"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

-- [업로드] 마케팅/슈퍼어드민: 제품 이미지 업로드 가능
-- admin_profiles에서 역할 및 활성 상태를 확인
CREATE POLICY "products: 마케팅/슈퍼어드민 업로드 허용"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'products'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- [수정] 마케팅/슈퍼어드민: 제품 이미지 덮어쓰기(수정) 가능
CREATE POLICY "products: 마케팅/슈퍼어드민 수정 허용"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'products'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- [삭제] 슈퍼어드민만: 제품 이미지 삭제 가능
-- 삭제 권한은 최고 관리자에게만 부여하여 실수로 인한 이미지 손실 방지
CREATE POLICY "products: 슈퍼어드민 삭제 허용"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'products'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );


-- =============================================================
-- 3. ir-files 버킷 Storage RLS 정책
-- =============================================================

-- [읽기] 모든 사용자(anon 포함): IR 자료 다운로드 가능
-- 투자정보 페이지에서 공개 PDF 파일 다운로드 시 사용
CREATE POLICY "ir-files: 모든 사용자 읽기 허용"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ir-files');

-- [업로드] IR담당자/슈퍼어드민: IR 자료 업로드 가능
CREATE POLICY "ir-files: IR담당/슈퍼어드민 업로드 허용"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ir-files'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'ir')
      AND is_active = true
    )
  );

-- [수정] IR담당자/슈퍼어드민: IR 자료 덮어쓰기(수정) 가능
CREATE POLICY "ir-files: IR담당/슈퍼어드민 수정 허용"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ir-files'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'ir')
      AND is_active = true
    )
  );

-- [삭제] 슈퍼어드민만: IR 자료 삭제 가능
CREATE POLICY "ir-files: 슈퍼어드민 삭제 허용"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ir-files'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );


-- =============================================================
-- 4. newsroom 버킷 Storage RLS 정책
-- =============================================================

-- [읽기] 모든 사용자(anon 포함): 뉴스룸 이미지 조회 가능
-- 뉴스/소식 페이지에서 이미지를 표시할 때 사용
CREATE POLICY "newsroom: 모든 사용자 읽기 허용"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'newsroom');

-- [업로드] 마케팅/슈퍼어드민: 뉴스룸 이미지 업로드 가능
CREATE POLICY "newsroom: 마케팅/슈퍼어드민 업로드 허용"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'newsroom'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- [수정] 마케팅/슈퍼어드민: 뉴스룸 이미지 덮어쓰기(수정) 가능
CREATE POLICY "newsroom: 마케팅/슈퍼어드민 수정 허용"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'newsroom'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- [삭제] 슈퍼어드민만: 뉴스룸 이미지 삭제 가능
CREATE POLICY "newsroom: 슈퍼어드민 삭제 허용"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'newsroom'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );


-- =============================================================
-- 5. brand-assets 버킷 Storage RLS 정책
-- =============================================================
-- brand-assets는 private 버킷으로, 슈퍼어드민만 전체 접근 가능
-- 로고, 인증 마크, 히어로 이미지 등 핵심 브랜드 자산을 관리

-- [읽기] 슈퍼어드민만: 브랜드 자산 조회 가능
CREATE POLICY "brand-assets: 슈퍼어드민 읽기 허용"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );

-- [업로드] 슈퍼어드민만: 브랜드 자산 업로드 가능
CREATE POLICY "brand-assets: 슈퍼어드민 업로드 허용"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );

-- [수정] 슈퍼어드민만: 브랜드 자산 수정 가능
CREATE POLICY "brand-assets: 슈퍼어드민 수정 허용"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );

-- [삭제] 슈퍼어드민만: 브랜드 자산 삭제 가능
CREATE POLICY "brand-assets: 슈퍼어드민 삭제 허용"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );


-- =============================================================
-- 6. pharmacies 버킷 Storage RLS 정책
-- =============================================================
-- pharmacies는 private 버킷으로, 마케팅/슈퍼어드민만 접근 가능
-- 약국 데이터 CSV 파일 백업 및 관리용

-- [읽기] 마케팅/슈퍼어드민: 약국 CSV 데이터 다운로드 가능
CREATE POLICY "pharmacies: 마케팅/슈퍼어드민 읽기 허용"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pharmacies'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- [업로드] 마케팅/슈퍼어드민: 약국 CSV 데이터 업로드 가능
CREATE POLICY "pharmacies: 마케팅/슈퍼어드민 업로드 허용"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pharmacies'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- [수정] 마케팅/슈퍼어드민: 약국 CSV 데이터 수정 가능
CREATE POLICY "pharmacies: 마케팅/슈퍼어드민 수정 허용"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pharmacies'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'marketing')
      AND is_active = true
    )
  );

-- [삭제] 슈퍼어드민만: 약국 CSV 데이터 삭제 가능
CREATE POLICY "pharmacies: 슈퍼어드민 삭제 허용"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pharmacies'
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );
