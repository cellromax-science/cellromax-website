CREATE TABLE IF NOT EXISTS contact_recipient_settings (
  inquiry_type VARCHAR(50) PRIMARY KEY
    CHECK (inquiry_type IN ('consumer', 'pharmacist', 'business')),
  recipient_email VARCHAR(200) NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_recipient_settings_updated_at
  ON contact_recipient_settings(updated_at DESC);

ALTER TABLE contact_recipient_settings ENABLE ROW LEVEL SECURITY;
