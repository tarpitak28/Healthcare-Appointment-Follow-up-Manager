-- CreateTable
CREATE TABLE IF NOT EXISTS "MedicationReminder" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "medicineName" TEXT NOT NULL,
    "dosage" TEXT,
    "reminderTimes" JSONB NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MedicationReminder_patientId_isActive_idx" ON "MedicationReminder"("patientId", "isActive");

-- AddForeignKey
ALTER TABLE "MedicationReminder" DROP CONSTRAINT IF EXISTS "MedicationReminder_patientId_fkey";
ALTER TABLE "MedicationReminder" ADD CONSTRAINT "MedicationReminder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationReminder" DROP CONSTRAINT IF EXISTS "MedicationReminder_appointmentId_fkey";
ALTER TABLE "MedicationReminder" ADD CONSTRAINT "MedicationReminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
