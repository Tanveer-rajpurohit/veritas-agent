-- File versions are immutable: corrections create a new version instead.
CREATE OR REPLACE FUNCTION forbid_file_version_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'file_versions rows are immutable';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER file_versions_no_update
  BEFORE UPDATE ON file_versions
  FOR EACH ROW EXECUTE FUNCTION forbid_file_version_update();
