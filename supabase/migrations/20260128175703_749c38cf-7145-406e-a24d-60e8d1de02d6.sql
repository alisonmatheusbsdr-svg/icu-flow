-- Update handle_new_user function with input validation and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  validated_nome TEXT;
  validated_crm TEXT;
BEGIN
  -- Extract and validate nome (max 200 chars, strip HTML-like tags)
  validated_nome := COALESCE(NEW.raw_user_meta_data ->> 'nome', 'Sem Nome');
  validated_nome := LEFT(validated_nome, 200);
  validated_nome := REGEXP_REPLACE(validated_nome, '<[^>]*>', '', 'g');
  validated_nome := TRIM(validated_nome);
  
  IF validated_nome = '' THEN
    validated_nome := 'Sem Nome';
  END IF;
  
  -- Extract and validate crm (max 50 chars, alphanumeric and hyphens only)
  validated_crm := COALESCE(NEW.raw_user_meta_data ->> 'crm', 'Sem CRM');
  validated_crm := LEFT(validated_crm, 50);
  validated_crm := REGEXP_REPLACE(validated_crm, '[^a-zA-Z0-9\-\/]', '', 'g');
  validated_crm := TRIM(validated_crm);
  
  IF validated_crm = '' THEN
    validated_crm := 'Sem CRM';
  END IF;

  -- Log new user creation for audit purposes
  RAISE LOG 'handle_new_user: Creating profile for user_id=% with validated nome=% crm=%', 
    NEW.id, validated_nome, validated_crm;

  INSERT INTO public.profiles (id, nome, crm)
  VALUES (NEW.id, validated_nome, validated_crm);
  
  RETURN NEW;
END;
$$;