-- Add hora_salida column to attendance table for tracking exit times
-- Run this manually in Supabase dashboard if needed for production

ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS hora_salida time;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS attendance_salida_idx
ON public.attendance(client_id, fecha, hora_salida);
