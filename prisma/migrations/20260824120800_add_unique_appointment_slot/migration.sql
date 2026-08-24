-- DropIndex
DROP INDEX IF EXISTS "Appointment_doctorProfileId_appointmentDate_startTime_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_doctorProfileId_appointmentDate_startTime_key" ON "Appointment"("doctorProfileId", "appointmentDate", "startTime");
