# API del Parqueadero

Todos los endpoints viven bajo `/api`. La autenticación acepta la cookie httpOnly `token`
(web) o la cabecera `Authorization: Bearer <JWT>` (móvil).

Roles: `operator < user < admin < owner`.

---

## 1. Autenticación de dispositivo móvil

### `POST /api/auth/register-mobile`

Registra (o inicia sesión de) un celular con la clave maestra y devuelve un JWT de 365 días
para operar sin conexión. El rol creado es `operator`.

**Autenticación:** no requerida

```json
{
  "username": "jose_operador_01",
  "password": "claveMaestra123",
  "deviceType": "android_mobile",
  "deviceBrand": "Xiaomi",
  "deviceModel": "Poco X5",
  "deviceOsVersion": "Android 13 (API 33)"
}
```

`password` debe coincidir con `MASTER_ADMIN_KEY` cuando el operador es nuevo. Si el usuario ya
existe, también se acepta su contraseña habitual. Si `MASTER_ADMIN_KEY` no está configurada en el
servidor, el endpoint responde **500** (no hay clave por defecto).

**200 OK**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "jose_operador_01",
  "role": "operator",
  "isActive": true,
  "message": "Operador autenticado exitosamente."
}
```

---

## 2. Configuración central (tarifas, reglas y ajustes)

La configuración es un documento único (`key: 'global'`) con `version` incremental. El web la
edita y **todos** los celulares la descargan; el backend siempre cobra con esta configuración.

### `GET /api/config`

**Autenticación:** cualquier usuario autenticado.

**200 OK**

```json
{
  "config": {
    "key": "global",
    "version": 3,
    "currency": "COP",
    "locale": "es-CO",
    "timezone": "America/Bogota",
    "billing": {
      "minimumHours": 1,
      "fractionThresholdMinutes": 15,
      "freeMinutes": 0
    },
    "rates": {
      "withTicket": { "hour": 2000, "fraction": 1000 },
      "withoutTicket": { "hour": 4000, "fraction": 2000 }
    },
    "mobile": { "collaborativeSyncEnabled": true, "syncIntervalSeconds": 30 },
    "updatedBy": "665f...",
    "updatedAt": "2026-10-25T17:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### `PUT /api/config`

**Autenticación:** `admin` u `owner`. Envía solo los campos a cambiar (merge profundo);
`version` se incrementa automáticamente.

```json
{
  "rates": { "withTicket": { "hour": 2500, "fraction": 1250 } },
  "billing": { "fractionThresholdMinutes": 20 }
}
```

**200 OK** → `{ "message": "...", "config": { ... } }`
**400** → valores fuera de rango (p. ej. `billing.fractionThresholdMinutes` entre 0 y 59)
**403** → rol insuficiente

### Regla de cobro (idéntica en backend, web y Android)

```
minutos = (salida - entrada) / 60000 - freeMinutes
si minutos <= 0                -> 0
horasCompletas = floor(minutos / 60)
residuo        = minutos % 60
si horasCompletas < minimumHours -> minimumHours * tarifaHora
si residuo  > fractionThresholdMinutes -> horasCompletas * tarifaHora + tarifaFraccion
si no                                 -> horasCompletas * tarifaHora
```

- `isFree = true` siempre cobra 0.
- `hasTicket` selecciona la tabla de tarifas (`withTicket` / `withoutTicket`), **no** significa gratis.
- La fracción solo se cobra cuando el residuo **supera** el umbral (umbral 15 → 2 h 15 min = 2 horas;
  2 h 16 min = 2 horas + fracción).

---

## 3. Sincronización masiva en lote (móvil)

### `POST /api/parking/sync`

**Autenticación:** requerida.

```json
{
  "deviceModel": "Xiaomi Poco X5",
  "dailyRecords": [
    {
      "localId": "daily-2026-10-25",
      "date": 1761436800000,
      "parkingRecords": [
        {
          "localId": "48",
          "remoteId": "665f...",
          "plateNumber": "XYZ123",
          "entryTime": 1761436800000,
          "exitTime": 1761440400000,
          "isFree": false,
          "hasTicket": true,
          "price": 4000,
          "comments": [
            { "localId": "c-1", "message": "Golpe leve en puerta", "timestamp": 1761437000000 }
          ]
        }
      ]
    }
  ]
}
```

Notas del contrato:

- `date` se normaliza al inicio del día en la zona horaria configurada.
- `price` enviado por el cliente **se ignora**: el servidor recalcula siempre.
- `hasTicket` define la tarifa. `isFree` es independiente (salida sin cobro).
- Un registro ya cerrado **no se reabre ni se recalcula** (la primera salida gana), así que
  las cifras históricas se conservan aunque cambien las tarifas.
- `comments[].localId` se usa para deduplicar.

**200 OK**

```json
{
  "success": true,
  "message": "Sincronización jerárquica con mapeo de doble ID procesada exitosamente.",
  "recordsProcessed": 1,
  "configVersion": 3,
  "timezone": "America/Bogota",
  "serverTimestamp": 1761440500000,
  "team": [
    {
      "plateNumber": "ABC987",
      "entryTime": "2026-10-25T14:00:00.000Z",
      "entryTimeMillis": 1761440400000,
      "exitTime": null,
      "hasTicket": true,
      "price": 0,
      "operatorName": "jose_operador_01",
      "deviceModel": "Poco X5",
      "updatedAtMillis": 1761440400000
    }
  ],
  "idMappings": {
    "dailyRecords": [
      {
        "localId": "daily-2026-10-25",
        "remoteId": "665e...",
        "totalEarned": 4000,
        "parkingRecords": [
          {
            "localId": "48",
            "remoteId": "665f...",
            "price": 4000,
            "exitTime": "2026-10-25T15:00:00.000Z",
            "comments": [{ "localId": "c-1", "remoteId": "666a..." }]
          }
        ]
      }
    ]
  }
}
```

Si `configVersion` es mayor que el que tiene el celular, la app vuelve a pedir `GET /api/config`.

---

## 4. Modo colaborativo entre celulares

### `GET /api/parking/team`

**Autenticación:** requerida. Devuelve los vehículos **activos de todos los celulares**
(`exitTime: null`), ordenados por hora de entrada, con `entryTimeMillis` y `updatedAtMillis`
para que Android no tenga que parsear fechas.

```json
{
  "records": [
    {
      "plateNumber": "ABC987",
      "entryTime": "2026-10-25T14:00:00.000Z",
      "entryTimeMillis": 1761440400000,
      "exitTime": null,
      "hasTicket": true,
      "price": 0,
      "operatorName": "jose_operador_01",
      "deviceModel": "Poco X5",
      "createdAt": "2026-10-25T14:00:00.000Z",
      "updatedAt": "2026-10-25T14:00:00.000Z",
      "updatedAtMillis": 1761440400000
    }
  ]
}
```

### `PUT /api/parking/calculateprice`

Cierra un vehículo por placa. Sirve tanto al web como al cobro remoto desde otro celular.

```json
{ "plateNumber": "ABC987", "hasTicket": true, "isFree": false }
```

**200 OK** → `{ "message": "Precio calculado con éxito", "price": 4000 }`
**404** → el vehículo no está activo (ya fue cobrado)

Al cerrar, el total del registro diario se recalcula automáticamente.

El modo colaborativo es **opt-in en el dispositivo**: la app solo sincroniza y consulta el
equipo cuando el operador lo activa, y el administrador puede desactivarlo globalmente con
`mobile.collaborativeSyncEnabled = false`.

---

## 5. Analíticas

### `GET /api/dashboard/metrics?days=30`

**Autenticación:** `admin` u `owner`. `days` acepta 1–365 (por defecto 30).

**200 OK**

```json
{
  "range": { "days": 30, "start": "...", "end": "...", "timezone": "America/Bogota" },
  "currency": "COP",
  "generatedAt": "2026-10-25T17:10:00.000Z",
  "summary": {
    "revenue": 14500,
    "vehicles": 3,
    "averageTicket": 4833,
    "averageStayMinutes": 88.5,
    "activeVehicles": 2,
    "peakHour": "08:00",
    "growth": { "revenue": 12.5, "vehicles": 0, "averageTicket": 3.1 }
  },
  "previousSummary": { "revenue": 12888, "vehicles": 3, "averageTicket": 4296, "averageStayMinutes": 80 },
  "dailySeries": [{ "date": "2026-10-01", "revenue": 0, "vehicles": 0 }],
  "hourlyDistribution": [{ "hour": 8, "label": "08:00", "vehicles": 2, "revenue": 5000 }],
  "ticketSplit": {
    "withTicket": 2,
    "withoutTicket": 1,
    "revenue": { "withTicket": 7000, "withoutTicket": 7500 }
  },
  "channelSplit": {
    "web": 1,
    "movil": 2,
    "desconocido": 0,
    "revenue": { "web": 2000, "movil": 12500, "desconocido": 0 }
  },
  "topVehicles": [
    { "plateNumber": "XYZ123", "visits": 3, "revenue": 12000, "lastExit": "2026-10-25T15:00:00.000Z" }
  ]
}
```

- `dailySeries` siempre trae un punto por día del rango (rellena con ceros).
- `hourlyDistribution` siempre trae las 24 horas.
- `growth` compara contra el periodo inmediatamente anterior de igual longitud.
- Las series se agrupan por la zona horaria de la configuración central.

---

## Variables de entorno usadas por el código

```env
PORT=3000
dbURI=...            # o DB_URI
JWT_SECRET=...
JWT_EXPIRATION=8h
PRICE=1000           # tarifa base por hora; define los valores iniciales de la configuración
TIMEZONE=America/Bogota
CLIENT_URL=http://localhost:3001
MASTER_ADMIN_KEY=...
```

---

## Ejemplos

```bash
# Registrar un celular
curl -X POST http://localhost:3000/api/auth/register-mobile \
  -H "Content-Type: application/json" \
  -d '{"username":"jose_operador_01","password":"claveMaestra123","deviceBrand":"Xiaomi","deviceModel":"Poco X5","deviceOsVersion":"Android 13"}'

# Leer la configuración central
curl http://localhost:3000/api/config -H "Authorization: Bearer $TOKEN"

# Cambiar la tarifa con tiquete (solo admin/owner)
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"rates":{"withTicket":{"hour":2500,"fraction":1250}}}'

# Ver los vehículos activos de todo el equipo
curl http://localhost:3000/api/parking/team -H "Authorization: Bearer $TOKEN"

# Cobrar un vehículo
curl -X PUT http://localhost:3000/api/parking/calculateprice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"plateNumber":"ABC987","hasTicket":true}'
```
