-- Hash existing plaintext License keys with SHA-256 for migration compatibility.
-- New application writes use HMAC-SHA256 with LICENSE_KEY_HASH_SECRET.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "licenses" ADD COLUMN "license_key_hash" VARCHAR(128);
UPDATE "licenses" SET "license_key_hash" = encode(digest(upper(trim("license_key")), 'sha256'), 'hex') WHERE "license_key_hash" IS NULL;
ALTER TABLE "licenses" ALTER COLUMN "license_key_hash" SET NOT NULL;
DROP INDEX IF EXISTS "licenses_license_key_key";
CREATE UNIQUE INDEX "licenses_license_key_hash_key" ON "licenses"("license_key_hash");
ALTER TABLE "licenses" DROP COLUMN "license_key";
