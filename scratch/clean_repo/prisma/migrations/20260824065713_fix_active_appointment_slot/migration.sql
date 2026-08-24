-- Remove the old unique constraint
DROP INDEX IF EXISTS "Appointment_doctorProfileId_appointmentDate_startTime_key";

-- Keep a normal index for appointment lookups
CREATE INDEX IF NOT EXISTS "Appointment_doctorProfileId_appointmentDate_startTime_idx"
ON "Appointment"("doctorProfileId", "appointmentDate", "startTime");

-- Prevent duplicate ACTIVE/BOOKED appointments
-- while allowing CANCELLED appointments to reuse the slot.
CREATE UNIQUE INDEX "Appointment_active_slot_unique"
ON "Appointment"("doctorProfileId", "appointmentDate", "startTime")
WHERE "status" = 'BOOKED';
