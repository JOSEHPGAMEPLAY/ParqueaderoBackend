# Despliegue del backend

API Express 4 + Mongoose que se despliega como funcion serverless en Vercel. Este documento cubre requisitos, variables de entorno, publicacion, verificacion, rollback y manejo de secretos. El contrato de endpoints vive en [ENDPOINTS.md](./ENDPOINTS.md); aqui no se duplica.

## Requisitos

| Requisito | Detalle |
|---|---|
| Node.js | 24 LTS (Krypton), verificado con v24.22.1. `package.json` declara `engines.node: "24.x"`, asi que Vercel selecciona Node 24 automaticamente. |
| MongoDB | Cluster accesible desde internet (Atlas) con el host del cluster en la cadena de conexion y `0.0.0.0/0` en Network Access, o el rango de salida de Vercel. |
| Cuenta Vercel | Proyecto con el repositorio conectado. |
| `package-lock.json` | Versionado. La instalacion en Vercel respeta el lockfile. |

No hay script de `build` ni de `test` en `package.json`: solo `start` (`node server.js`). La build de Vercel se limita a instalar dependencias.

## Variables de entorno

Todas se leen con `process.env`. La tabla refleja el codigo actual, incluidos los valores por defecto que aplica cuando la variable falta.

| Variable | Obligatoria | Valor / formato | Efecto real |
|---|---|---|---|
| `dbURI` o `DB_URI` | Si | Cadena `mongodb+srv://...` | `config/db.js` usa `dbURI` y cae a `DB_URI`. Si falta, Mongoose lanza y el proceso termina con `process.exit(1)`: la funcion responde 500 en cada invocacion. |
| `JWT_SECRET` | Si | Cadena larga y aleatoria | Firma y verifica los JWT en `middleware/auth.js` y `services/authService.js`. Si falta, `jsonwebtoken` lanza al firmar. |
| `JWT_EXPIRATION` | Si | Formato `ms`: `8h`, `7d`, `365d` | Se pasa a `jwt.sign({ expiresIn })` y a `ms()` para el `maxAge` de la cookie. Un valor no parseable deja la cookie sin `maxAge` (cookie de sesion). |
| `PRICE` | Si | Numero entero, pesos por hora con tiquete | Solo define los valores iniciales de `AppConfig` cuando el documento `global` aun no existe (`services/configService.js`). Si falta, se usa 2000. La tarifa vigente vive en la base y se cambia con `PUT /api/config`. |
| `TIMEZONE` | Si | Zona IANA, por ejemplo `America/Bogota` | Define los cortes de dia de `DailyParkingRecord` (`utils/time.js`) y la zona que devuelve la configuracion central. `utils/time.js` cae a `UTC` y `configService` cae a `America/Bogota`: valores distintos si la variable falta, por eso debe fijarse siempre. |
| `CLIENT_URL` | Si | Origenes separados por coma, sin barra final | Lista blanca de CORS comparada con `startsWith`. Vacio equivale a permitir cualquier origen, que no debe usarse en produccion. |
| `MASTER_ADMIN_KEY` | Si | Cadena secreta y aleatoria | Clave que exige `POST /api/auth/register-mobile` para crear operadores. Si falta, el endpoint responde 500: no hay clave por defecto. Tambien sirve como contrasena valida de un operador ya existente. |
| `PORT` | No | Entero | Puerto de `app.listen` en ejecucion local. Vercel no lo usa: la plataforma entrega la peticion a la funcion. |

Notas que afectan la operacion:

- La cookie de sesion se emite como `httpOnly`, `secure`, `sameSite: 'none'`. Exige HTTPS y funciona como cookie de terceros cuando el frontend esta en otro dominio. Si el navegador bloquea cookies de terceros, el frontend pierde la sesion; el APK no se ve afectado porque usa `Authorization: Bearer`.
- Cualquier origen que termine en `.vercel.app` se acepta por defecto, ademas de los de `CLIENT_URL`.
- Cambiar `PRICE` en Vercel no altera las tarifas ya guardadas. Solo aplica la primera vez, cuando se crea la configuracion.
- Cambiar `JWT_SECRET` invalida todas las sesiones web y todos los tokens de 365 dias de los celulares: cada dispositivo debe volver a autenticarse.

## Publicacion en Vercel

1. Importar el repositorio del backend en Vercel. Framework preset: **Other**. Directorio raiz: la raiz del repositorio.
2. En Settings, General, Node.js Version, seleccionar **24.x**. `engines.node` en `package.json` ya lo fija; el panel debe coincidir.
3. Cargar todas las variables de la tabla anterior en Production y, con valores distintos, en Preview y Development. Cargarlas antes del primer deploy: en Vercel solo aplican a despliegues nuevos.
4. Verificar que `CLIENT_URL` apunte al dominio real del frontend y que no quede vacia.
5. Desplegar desde la rama `main`. `vercel.json` ya define el runtime y el enrutamiento:

```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

Toda peticion entra por `server.js`, y el enrutamiento por `/api/...` lo resuelve Express. No se necesita `rewrites`, ni `outputDirectory`, ni comando de build.

Para desplegar desde local:

```bash
npm i -g vercel
vercel link
vercel pull --environment=production
vercel --prod
```

## Verificacion posterior al despliegue

Reemplazar `API` por el dominio del backend, por ejemplo `https://parqueadero-backend.vercel.app`. Los comandos son Bash; con PowerShell usar `Invoke-RestMethod` y guardar la cookie en una sesion.

1. Disponibilidad y base de datos. `POST /api/auth/login` consulta MongoDB y devuelve 400 tanto si el usuario no existe como si la contrasena es incorrecta, y 200 solo con credenciales validas. Un 500 indica fallo de conexion o de plataforma, no credenciales invalidas.

```bash
curl -i -c cookies.txt -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"USUARIO_REAL","password":"CLAVE_REAL"}'
```

Esperado: `HTTP/2 200`, cuerpo `{"message":"Login exitoso"}` y `Set-Cookie: token=...; HttpOnly; Secure; SameSite=None`.

2. Sesion y configuracion central.

```bash
curl -s -b cookies.txt "$API/api/config"
```

Esperado: JSON con `key`, `version`, `currency` (`COP`), `timezone` igual a `TIMEZONE` y `rates.withTicket.hour` coherente con `PRICE` en la primera creacion. Un 401 significa que la cookie no viajo: revisar dominio, HTTPS y cookies de terceros.

3. Sincronizacion movil. Requiere un token de dispositivo (`register-mobile`) o el mismo token web.

```bash
curl -s -X POST "$API/api/parking/sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceModel":"verificacion","dailyRecords":[]}'
```

Esperado: `success: true`, `recordsProcessed: 0`, `configVersion` numerico y `team` como arreglo. El arreglo vacio es valido: el servicio solo exige que `dailyRecords` sea un arreglo. Un 400 indica cuerpo mal formado y un 500 indica fallo de plataforma o de base de datos.

4. Dashboard. `GET /api/dashboard/metrics?days=7` con un usuario `admin` u `owner` debe devolver 200. Con rol inferior debe devolver 403.

5. CORS. Repetir el login con `-H "Origin: https://DOMINIO_DEL_FRONTEND"` y comprobar que la respuesta incluye `Access-Control-Allow-Origin` con ese origen. Un origen fuera de `CLIENT_URL` que no sea `*.vercel.app` debe devolver error de CORS.

6. Logs. En Vercel, Deployments, Functions, revisar que no aparezca `Error al conectar la base de datos` ni `MONGODB` en el arranque en frio.

## Rollback

Cada deploy crea un deployment inmutable.

1. Vercel, Deployments, elegir el deployment estable anterior, menu, **Promote to Production** (o Instant Rollback). El dominio queda sirviendo ese codigo en menos de un minuto.
2. Si el problema esta en variables de entorno: corregir el valor y volver a desplegar. Las variables no se versionan con el codigo, asi que un rollback de codigo no revierte variables.
3. Si el problema es de datos: no hay migraciones que revertir, Mongoose no versiona el esquema ni la configuracion. `AppConfig` se modifica con `PUT /api/config` e incrementa `version`; restaurar tarifas es una escritura nueva, no un rollback de despliegue.
4. Volver a correr la verificacion de la seccion anterior sobre el deployment promovido.
5. Si el rollback es por codigo en git, etiquetar la version estable y desplegar desde esa etiqueta (`git checkout vX.Y.Z && vercel --prod`). Las etiquetas siguen SemVer `vMAJOR.MINOR.PATCH`.

## Checklist de secretos

- [ ] `.env` no esta versionado: `.gitignore` del backend lo excluye. Verificar con `git ls-files | grep -x .env`.
- [ ] Ningun valor real de `JWT_SECRET`, `MASTER_ADMIN_KEY` ni la cadena de MongoDB aparece en README, DEPLOY.md, ENDPOINTS.md ni en capturas.
- [ ] `MASTER_ADMIN_KEY` esta definida, no es el valor de ejemplo `claveMaestra123` ni una clave usada en otro sistema.
- [ ] `JWT_SECRET` tiene al menos 32 caracteres generados al azar (`openssl rand -hex 32`), distinto entre produccion y preview.
- [ ] `CLIENT_URL` no esta vacia en produccion y solo lista dominios propios.
- [ ] Las variables existen en Production, Preview y Development, y ninguna esta marcada como expuesta al cliente.
- [ ] El usuario de MongoDB es exclusivo de la aplicacion, con permisos sobre una sola base, y su contrasena esta rotada tras cualquier filtracion.
- [ ] Rotar `JWT_SECRET` esta previsto como operacion de emergencia: invalida sesiones web y tokens moviles de 365 dias.
