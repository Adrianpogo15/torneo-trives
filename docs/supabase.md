# Supabase

Este proyecto usara Supabase para base de datos PostgreSQL, autenticacion y, mas adelante, almacenamiento si necesitamos imagenes o documentos.

## Archivos creados

- `supabase/migrations/001_initial_schema.sql`: esquema inicial de base de datos.
- `supabase/seed.sql`: datos iniciales del torneo y fases base.
- `supabase/seed-trives-2026-demo.sql`: datos demo completos para probar la parte publica.
- `supabase/seed-trives-2026-players.sql`: jugadores reales cargados por equipo.

## Orden de ejecucion

1. Crear un proyecto en Supabase.
2. Abrir el SQL Editor.
3. Ejecutar el contenido de `supabase/migrations/001_initial_schema.sql`.
4. Ejecutar el contenido de `supabase/seed.sql`.
5. Crear tu usuario desde la autenticacion de la web o desde Supabase Auth.
6. Convertir ese usuario en admin.

Para probar la web publica con datos realistas, ejecuta despues:

```sql
-- contenido de supabase/seed-trives-2026-demo.sql
```

Este seed crea Torneo Trives 2026 con 12 equipos, 4 grupos de 3 equipos,
partidos, resultados, penaltis de desempate y eventos de goles/tarjetas.

Para cargar jugadores reales por equipo, ejecuta despues:

```sql
-- contenido de supabase/migrations/007_allow_players_without_last_name.sql
-- contenido de supabase/seed-trives-2026-players.sql
```

Para que La Porra pida ganador por penaltis en eliminatorias empatadas, ejecuta:

```sql
-- contenido de supabase/migrations/008_porra_knockout_penalty_winner.sql
```

## Convertir un usuario en admin

Cuando ya exista tu usuario, ejecuta este SQL cambiando el email por el tuyo:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'tu-email@ejemplo.com'
);
```

## Crear el usuario admin con script

Tambien puedes crear directamente el usuario admin y asignarle el rol `admin` con:

```powershell
$env:SUPABASE_URL="https://TU-PROYECTO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
node scripts/create-admin-user.mjs
```

El script crea este usuario:

- Email: `3678elespinillo@gmail.com`
- Password: `torneo26trives`
- Rol: `admin`

La `SUPABASE_URL` y la `SUPABASE_SERVICE_ROLE_KEY` estan en Supabase, dentro de Project Settings > API.

Importante: la `service_role key` permite saltarse las politicas de seguridad de la base de datos. Usala solo en local o en scripts privados, nunca en el frontend.

## Tablas principales

- `profiles`: perfil y rol de cada usuario.
- `tournaments`: ediciones del torneo.
- `teams`: equipos.
- `players`: jugadores.
- `stages`: fases del torneo.
- `groups`: grupos dentro de una fase.
- `tournament_teams`: equipos inscritos en el torneo.
- `group_teams`: equipos asignados a cada grupo.
- `matches`: partidos.
- `match_events`: goles y tarjetas.
- `match_player_votes`: votos al jugador del partido.
- `predictions`: porras de usuarios.

## Vistas utiles

- `group_standings`: clasificacion calculada de cada grupo.
- `player_stats`: goles y tarjetas por jugador.
- `prediction_standings`: ranking de la porra.

## Reglas incluidas

- La parte publica puede leer datos del torneo, equipos, jugadores, partidos, eventos, votos y clasificaciones.
- Los usuarios registrados pueden crear votos y porras propias.
- Cada usuario solo puede votar una vez por partido.
- Cada usuario solo puede hacer una porra por partido.
- Las porras se cierran cuando el partido deja de estar programado o llega la hora de inicio.
- Al cerrar un partido como `finished`, se recalculan los puntos de la porra.
- Solo los usuarios con rol `admin` pueden gestionar datos del torneo.

## Registro de La Porra con verificacion por email

La web valida que el registro de La Porra use cuentas `@gmail.com`. Para que la
cuenta no quede activa hasta confirmar el correo, revisa esta configuracion en
Supabase:

1. Ve a Authentication > Providers > Email.
2. Activa email/password.
3. Activa la confirmacion de email para nuevos usuarios.
4. Ve a Authentication > URL Configuration.
5. En Site URL usa la URL de la web. En local:

```text
http://localhost:3000
```

6. En Redirect URLs permite:

```text
http://localhost:3000/auth/confirmed
```

Cuando despleguemos en Vercel habra que anadir tambien:

```text
https://TU-DOMINIO.vercel.app/auth/confirmed
```

## Plantilla del correo de verificacion

En Supabase, ve a Authentication > Email Templates > Confirm signup.

Asunto sugerido:

```text
Verifica tu cuenta para La Porra - Torneo Trives
```

Contenido HTML sugerido:

```html
<h2>Verifica tu cuenta para La Porra</h2>
<p>Hola,</p>
<p>
  Gracias por registrarte en La Porra del Torneo Trives. Pulsa el boton para
  confirmar tu correo y activar tu cuenta.
</p>
<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="display:inline-block;background:#111111;color:#ffc400;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700"
  >
    Verificar cuenta
  </a>
</p>
<p>Si no has solicitado este registro, puedes ignorar este correo.</p>
```

Nota: Supabase permite personalizar emails desde Email Templates y usar
`{{ .ConfirmationURL }}` como enlace de confirmacion. Para uso real con muchos
usuarios, Supabase recomienda configurar un SMTP propio; el SMTP incluido es
limitado y no esta pensado para produccion.
