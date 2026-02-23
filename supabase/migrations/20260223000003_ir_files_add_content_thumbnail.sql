-- ir_files 테이블에 content(본문내용)과 thumbnail_url(썸네일 이미지) 컬럼 추가
ALTER TABLE public.ir_files
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN public.ir_files.content IS '본문 내용';
COMMENT ON COLUMN public.ir_files.thumbnail_url IS '썸네일 이미지 URL';
