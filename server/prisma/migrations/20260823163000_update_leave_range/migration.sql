-- Preserve existing leave dates while converting DoctorLeave to a date range.
ALTER TABLE "DoctorLeave" RENAME COLUMN "date" TO "startDate";

ALTER TABLE "DoctorLeave"
  ALTER COLUMN "startDate" TYPE TIMESTAMP(3)
  USING "startDate"::timestamp;

ALTER TABLE "DoctorLeave" ADD COLUMN "endDate" TIMESTAMP(3);

UPDATE "DoctorLeave"
SET "endDate" = "startDate";

ALTER TABLE "DoctorLeave"
  ALTER COLUMN "endDate" SET NOT NULL;
