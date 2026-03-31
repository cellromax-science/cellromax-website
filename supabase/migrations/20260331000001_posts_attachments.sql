-- =============================================================
-- posts 테이블에 첨부파일(attachments) 컬럼 추가
-- Project: Cellromax-Homepage_Renewal (셀로맥스사이언스)
-- Created: 2026-03-31
--
-- attachments: JSONB 배열로 저장
--   [{ "url": "...", "name": "원본파일명.pdf", "size": 12345, "type": "application/pdf" }, ...]
--
-- newsroom Storage 버킷에 PDF/문서 MIME 타입 추가
-- =============================================================

-- 1. posts 테이블에 attachments 컬럼 추가
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. newsroom 버킷에 PDF 및 문서 MIME 타입 추가
UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-hwp',
    'application/haansofthwp',
    'application/x-hwpml'
  ],
  file_size_limit = 52428800  -- 50MB로 확장 (기존 5MB)
WHERE id = 'newsroom';
