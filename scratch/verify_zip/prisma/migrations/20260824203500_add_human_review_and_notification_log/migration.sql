-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationStatus') THEN
        CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
    END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
        CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMATION', 'APPOINTMENT_CANCELLATION', 'DOCTOR_LEAVE_CANCELLATION', 'POST_VISIT_SUMMARY', 'MEDICATION_REMINDER');
    END IF;
END $$;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "needsHumanReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "reviewReasons" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "NotificationLog" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "appointmentId" TEXT,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "eventKey" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationLog_eventKey_key" ON "NotificationLog"("eventKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NotificationLog_status_nextAttemptAt_idx" ON "NotificationLog"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NotificationLog_recipientUserId_idx" ON "NotificationLog"("recipientUserId");

-- AddForeignKey
ALTER TABLE "NotificationLog" DROP CONSTRAINT IF EXISTS "NotificationLog_recipientUserId_fkey";
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" DROP CONSTRAINT IF EXISTS "NotificationLog_appointmentId_fkey";
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
