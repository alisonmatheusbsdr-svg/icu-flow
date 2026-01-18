-- Update exam_type constraint to include 'cultura' and 'outros'
ALTER TABLE public.patient_exams 
DROP CONSTRAINT IF EXISTS patient_exams_exam_type_check;

ALTER TABLE public.patient_exams 
ADD CONSTRAINT patient_exams_exam_type_check 
CHECK (exam_type IN ('imagem', 'laboratorial', 'cultura', 'outros'));