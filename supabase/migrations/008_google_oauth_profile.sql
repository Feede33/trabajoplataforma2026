CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
DECLARE
    v_role TEXT;
    v_nombre TEXT;
    v_avatar TEXT;
BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'candidato');
    IF v_role NOT IN ('empresa', 'candidato') THEN
        v_role := 'candidato';
    END IF;

    v_nombre := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'nombre'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)
    );

    v_avatar := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
    );

    INSERT INTO public.profiles (id, email, nombre, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        v_nombre,
        v_avatar,
        v_role
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        nombre = CASE
            WHEN public.profiles.nombre IS NULL OR public.profiles.nombre = '' THEN EXCLUDED.nombre
            ELSE public.profiles.nombre
        END,
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
