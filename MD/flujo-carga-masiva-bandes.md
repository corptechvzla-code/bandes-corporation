# Flujo de Carga Masiva — Bandes

## Descripción General

Flujo para subir múltiples barras desde un archivo Excel (`.xlsx`, `.xls` o `.csv`) a través del panel de Ingresos de Bandes.

---

## Diagrama de Flujo

```
FRONTEND (Next.js)                         BACKEND (NestJS)                    DATABASE (PostgreSQL)
==============================             =======================             =====================

Usuario en Ingresos Page
  ├─ Selecciona cliente
  ├─ Selecciona archivo .xlsx/.xls/.csv
  └─ Click "Subir Archivo"
       │
       ▼
handleBulkUpload() [page.tsx]
  ├─ Validación client-side (10 MB máx)
  └─ Crea FormData con 'file' + 'clientId'
       │
       ▼
useBulkUploadBars().mutateAsync(formData)
  └─ useBars.ts:51
       │
       ▼
apiUpload<BulkUploadResult>('/bars/bulk-upload', formData)
  └─ api.ts:8 — POST multipart/form-data via axios
       │
       ▼
POST http://localhost:3001/bars/bulk-upload
       │
       ▼
BarsController.bulkUpload() [controller.ts:37]
  ├─ FileInterceptor('file', 10MB)
  ├─ Valida: file existe, clientId, extensión válida
  └─ barsService.bulkCreate(file, clientId)
       │
       ▼
BarsService.bulkCreate() [service.ts:95]
  ├─ Parsea Excel via exceljs desde buffer
  ├─ buildHeaderMap(): mapeo flexible por nombre de columna
  │   (CÓDIGO, PESO BRUTO, PUREZA, LEY Ag, LOTE)
  ├─ Itera filas 2..N:
  │   ├─ Salta filas vacías / de resumen
  │   ├─ Detecta duplicados de código in-file
  │   ├─ Valida grossWeight > 0
  │   ├─ Valida purity (0-1000‰)
  │   ├─ Calcula fineWeight = grossWeight * (purity / 1000)
  │   ├─ Parsea leyAg opcional
  │   └─ Acumula en barsToCreate[]
  ├─ Verifica duplicados en DB por barNumber
  ├─ $transaction: prisma.bar.createMany() — insert masivo
  └─ Retorna { created, skipped, errors }
       │
       ▼
Respuesta → axios → useBulkUploadBars hook
       │
       ▼
onSuccess: Invalida query 'bars'
       │
       ▼
UI muestra modal con resultado (creadas + errores)
```

---

## Archivos Involucrados

### Frontend

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `frontend/app/ingresos/page.tsx` | Handler `handleBulkUpload()` + `downloadTemplate()` | |
| `frontend/src/hooks/useBars.ts` | `useBulkUploadBars()` hook React Query | |
| `frontend/src/lib/api.ts` | `apiUpload()` para multipart | |
| `frontend/src/types/api.ts` | `BulkUploadResult` interface | |

### Backend

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `backend/src/modules/bars/bars.controller.ts` | `POST /bars/bulk-upload` | |
| `backend/src/modules/bars/bars.service.ts` | `bulkCreate()` + `buildHeaderMap()` + `parseNumericCell()` | |
| `backend/src/modules/bars/dto/bulk-upload.dto.ts` | DTO con validación | |

### Dependencias añadidas

- `backend`: `exceljs`, `@types/multer`
- `frontend`: `exceljs`

---

## Estructura del Excel Esperado

| Columna | Header | Requerido | Descripción |
|---------|--------|-----------|-------------|
| A | CÓDIGO | Sí | Código único de barra (case-insensitive) |
| B | PESO BRUTO (g) | Sí | Número positivo |
| C | PUREZA (‰) | Sí | 0–1000‰ |
| D | LEY Ag (‰) | No | Opcional, 0–1000‰ |
| E | LOTE N° | No | Opcional (reservado para futuro) |

### Mapeo Flexible de Headers

El sistema **no usa índices fijos**. Busca los headers por nombre usando `buildHeaderMap()`:

- **CÓDIGO**: `CÓDIGO`, `CODIGO`, `CODE`, `BARRA`, `BAR NUMBER`
- **PESO BRUTO**: `PESO BRUTO`, `GROSS`
- **PUREZA**: `PUREZA`, `LEY`, `LEY AU`, `AU`, `AU‰`, `PURITY`, `FINENESS`
- **LEY Ag**: `LEY AG`, `SILVER`, `AG`, `AG‰`
- **LOTE**: `LOTE`, `LOT`

Esto permite reordenar columnas sin romper la carga.

---

## Validaciones

| Validación | Lugar | Comportamiento |
|------------|-------|----------------|
| Tamaño archivo | Frontend + Backend | Máx 10 MB |
| Formato | Backend | `.xlsx`, `.xls`, `.csv` |
| Cliente requerido | Backend | `clientId` obligatorio |
| Filas vacías | Backend | Se saltan automáticamente |
| Filas resumen | Backend | Se saltan (TOTAL/SUBTOTAL/RESUMEN/SUM) |
| Códigos duplicados (in-file) | Backend | Error por fila, continúa con las demás |
| Códigos duplicados (DB) | Backend | Error fatal, no se inserta nada |
| Peso bruto | Backend | Debe ser número > 0 |
| Pureza | Backend | 0–1000‰ |
| Ley Ag | Backend | 0–1000‰ (si se provee) |

---

## Plantilla de Descarga

Generada con `exceljs` vía `downloadTemplate()` usando import dinámico:

- Columnas: CÓDIGO, PESO BRUTO (g), PUREZA (‰), LEY Ag (‰), LOTE N°
- Fila de header estilizada
- Fila de instrucciones

---

## Modelo de Base de Datos (Bar)

```prisma
model Bar {
  id          String    @id @default(uuid())
  barNumber   String    @unique
  grossWeight Decimal   @db.Decimal(15, 4)
  purity      Decimal   @db.Decimal(7, 4)
  fineWeight  Decimal   @db.Decimal(15, 4)
  leyAg        Decimal?  @db.Decimal(7, 4)
  fineWeightAg Decimal?  @db.Decimal(15, 4)
  status      BarStatus @default(IN_STOCK)
  clientId     String
  client       Client   @relation(fields: [clientId], references: [id])
  // ...
}
```

---

## Diferencias con Refinería

| Aspecto | Refinería | Bandes |
|---------|-----------|--------|
| Endpoint | `POST /gold-bars/bulk-upload` | `POST /bars/bulk-upload` |
| Modelo | `GoldBar` + `Transaction` | `Bar` (no hay Transaction) |
| Cliente/Proveedor | `supplierId` | `clientId` |
| Columnas requeridas | PESO BRUTO, LEY Au | PESO BRUTO, PUREZA |
| Mapeo headers | Índices fijos (A, B, C...) | Flexible por nombre de header |
| Transacción DB | `createMany` + `transaction.create` | `$transaction` con `createMany` |
