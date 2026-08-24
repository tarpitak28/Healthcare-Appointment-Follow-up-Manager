-- CreateTable
CREATE TABLE IF NOT EXISTS "SlotHold" (
    "id" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SlotHold_doctorProfileId_appointmentDate_startTime_key" ON "SlotHold"("doctorProfileId", "appointmentDate", "startTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SlotHold_expiresAt_idx" ON "SlotHold"("expiresAt");

-- AddForeignKey
ALTER TABLE "SlotHold" DROP CONSTRAINT IF EXISTS "SlotHold_doctorProfileId_fkey";
ALTER TABLE "SlotHold" ADD CONSTRAINT "SlotHold_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotHold" DROP CONSTRAINT IF EXISTS "SlotHold_patientId_fkey";
ALTER TABLE "SlotHold" ADD CONSTRAINT "SlotHold_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop standard full unique index if exists to avoid blocking cancelled appointments
DROP INDEX IF EXISTS "Appointment_doctorProfileId_appointmentDate_startTime_key";

-- Create Partial Unique Index for active appointments only (BOOKED and COMPLETED)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_doctor_slot
ON "Appointment" ("doctorProfileId", "appointmentDate", "startTime")
WHERE status IN ('BOOKED', 'COMPLETED');
