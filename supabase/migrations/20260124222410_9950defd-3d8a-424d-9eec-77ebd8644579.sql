-- Add blocking columns to beds table
ALTER TABLE beds 
ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE beds 
ADD COLUMN blocked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE beds 
ADD COLUMN blocked_by UUID REFERENCES auth.users(id);

ALTER TABLE beds 
ADD COLUMN blocked_reason TEXT;