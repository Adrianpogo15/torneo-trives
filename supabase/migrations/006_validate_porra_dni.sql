create or replace function public.is_valid_dni(value text)
returns boolean
language plpgsql
immutable
as $$
declare
  clean_value text := public.normalize_dni(value);
  dni_number integer;
  expected_letter text;
  letters constant text := 'TRWAGMYFPDXBNJZSQVHLCKE';
begin
  if clean_value !~ '^([0-9]{8}|[XYZ][0-9]{7})[A-Z]$' then
    return false;
  end if;

  dni_number := replace(
    replace(
      replace(left(clean_value, 8), 'X', '0'),
      'Y',
      '1'
    ),
    'Z',
    '2'
  )::integer;
  expected_letter := substr(letters, (dni_number % 23) + 1, 1);

  return right(clean_value, 1) = expected_letter;
end;
$$;

create or replace function public.register_porra_user(
  dni_input text,
  display_name_input text,
  password_input text
)
returns table(id uuid, dni text, display_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_dni text := public.normalize_dni(dni_input);
  clean_name text := trim(display_name_input);
begin
  if not public.is_valid_dni(clean_dni) then
    raise exception 'Introduce un DNI valido.';
  end if;

  if length(clean_name) < 2 then
    raise exception 'Introduce un nombre de usuario.';
  end if;

  if length(coalesce(password_input, '')) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres.';
  end if;

  insert into public.porra_users (dni, display_name, password_hash)
  values (clean_dni, clean_name, extensions.crypt(password_input, extensions.gen_salt('bf')))
  returning porra_users.id, porra_users.dni, porra_users.display_name
  into id, dni, display_name;

  return next;
exception
  when unique_violation then
    raise exception 'Ya existe una cuenta con ese DNI.';
end;
$$;

grant execute on function public.is_valid_dni(text) to anon, authenticated;
grant execute on function public.register_porra_user(text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
