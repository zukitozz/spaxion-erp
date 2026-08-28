-- Rename column instead of drop+add: preserves the existing 6 rows.
-- Old values point to the local-disk storage path scheme (now replaced by S3 keys)
-- and won't resolve to a real object, but the historical string is kept rather than discarded.
ALTER TABLE "AtencionFoto" RENAME COLUMN "url" TO "key";
