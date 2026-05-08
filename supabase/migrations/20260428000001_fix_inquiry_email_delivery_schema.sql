ALTER TABLE inquiries
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE inquiries
  DROP CONSTRAINT IF EXISTS inquiries_email_status_check;

ALTER TABLE inquiries
  ADD CONSTRAINT inquiries_email_status_check
  CHECK (email_status IN ('pending', 'sent', 'failed'));
