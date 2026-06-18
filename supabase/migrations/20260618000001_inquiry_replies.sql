-- =============================================================
-- 문의 답장 기능 (Phase 1: 메일 답장 + 템플릿)
--   - inquiry_replies: 답장 발송 이력 (1 문의 : N 답장)
--   - inquiry_reply_templates: 답장 템플릿
--   - inquiries.last_replied_channel: 목록 뱃지용
-- channel 값에 'sms'를 미리 허용해 Phase 2(BizM 문자) 확장 대비.
-- =============================================================

-- 1) 마지막 답장 채널 (목록 뱃지 표시용)
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS last_replied_channel VARCHAR(10)
    CHECK (last_replied_channel IN ('email', 'sms'));

-- 2) 답장 이력
CREATE TABLE IF NOT EXISTS inquiry_replies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id    UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  channel       VARCHAR(10) NOT NULL CHECK (channel IN ('email', 'sms')),
  to_address    VARCHAR(200) NOT NULL,
  subject       VARCHAR(300),
  body          TEXT NOT NULL,
  status        VARCHAR(10) NOT NULL CHECK (status IN ('sent', 'failed')),
  provider_id   VARCHAR(200),
  error_message TEXT,
  sent_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_replies_inquiry
  ON inquiry_replies(inquiry_id, created_at DESC);

ALTER TABLE inquiry_replies ENABLE ROW LEVEL SECURITY;

-- 3) 답장 템플릿
CREATE TABLE IF NOT EXISTS inquiry_reply_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(100) NOT NULL,
  channel       VARCHAR(10) CHECK (channel IN ('email', 'sms')),
  subject       VARCHAR(300),
  body          TEXT NOT NULL,
  inquiry_type  VARCHAR(50) CHECK (inquiry_type IN ('consumer', 'pharmacist', 'business')),
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_reply_templates_updated_at
  ON inquiry_reply_templates(updated_at DESC);

ALTER TABLE inquiry_reply_templates ENABLE ROW LEVEL SECURITY;

-- updated_at 자동 갱신 트리거 (템플릿)
DROP TRIGGER IF EXISTS trigger_inquiry_reply_templates_updated_at ON inquiry_reply_templates;
CREATE TRIGGER trigger_inquiry_reply_templates_updated_at
  BEFORE UPDATE ON inquiry_reply_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- RLS: 문의담당(inquiry) / 슈퍼어드민(super_admin)만 접근
--   (실제 발송/조회는 서버의 service-role 클라이언트로 수행되나,
--    직접 접근을 차단하기 위한 안전장치)
-- =============================================================

DROP POLICY IF EXISTS "Authorized admins can view inquiry replies" ON inquiry_replies;
CREATE POLICY "Authorized admins can view inquiry replies"
  ON inquiry_replies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'inquiry')
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Authorized admins can insert inquiry replies" ON inquiry_replies;
CREATE POLICY "Authorized admins can insert inquiry replies"
  ON inquiry_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'inquiry')
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Authorized admins can view reply templates" ON inquiry_reply_templates;
CREATE POLICY "Authorized admins can view reply templates"
  ON inquiry_reply_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'inquiry')
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Authorized admins can manage reply templates" ON inquiry_reply_templates;
CREATE POLICY "Authorized admins can manage reply templates"
  ON inquiry_reply_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'inquiry')
      AND is_active = true
    )
  );

-- =============================================================
-- 기본 답장 템플릿 시드 (메일)
-- =============================================================
INSERT INTO inquiry_reply_templates (title, channel, subject, body, inquiry_type)
VALUES
  (
    '일반 답변',
    'email',
    '[셀로맥스사이언스] 문의에 대한 답변입니다',
    E'안녕하세요, 셀로맥스사이언스입니다.\n\n[여기에 답변 내용을 입력해 주세요.]\n\n감사합니다.',
    NULL
  ),
  (
    '제품 문의 답변',
    'email',
    '[셀로맥스사이언스] 제품 문의에 대한 답변입니다',
    E'안녕하세요, 셀로맥스사이언스입니다.\n\n[여기에 답변 내용을 입력해 주세요.]\n\n감사합니다.',
    NULL
  )
ON CONFLICT DO NOTHING;
