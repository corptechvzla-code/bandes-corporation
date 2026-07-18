# API — Bandes Backend

> Base URL: `http://localhost:3001`
> Stack: NestJS + Prisma (PostgreSQL)

---

## 1. Prisma Schema (Post-Refactor)

```prisma
enum BarStatus { IN_STOCK, EXITED }
enum ProcessStatus { OPEN, CLOSED }

model Client {
  id          String   @id @default(uuid())
  rif         String   @unique
  name        String
  contactInfo String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  bars        Bar[]
  exitDetails ExitDetail[]
  processes   Process[]
}

model Process {
  id        String        @id @default(uuid())
  name      String
  clientId  String
  status    ProcessStatus @default(OPEN)
  client    Client        @relation(fields: [clientId], references: [id])
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  lots Lot[]
  @@unique([name, clientId])
}

model Lot {
  id        String   @id @default(uuid())
  name      String
  processId String
  process   Process  @relation(fields: [processId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  bars Bar[]
}

model Bar {
  id          String    @id @default(uuid())
  barNumber   String    @unique
  grossWeight Decimal   @db.Decimal(15, 4)
  purity      Decimal   @db.Decimal(7, 4)
  fineWeight  Decimal   @db.Decimal(15, 4)
  status      BarStatus @default(IN_STOCK)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  clientId     String
  client       Client       @relation(fields: [clientId], references: [id])
  exitDetailId String?
  exitDetail   ExitDetail?  @relation(fields: [exitDetailId], references: [id])
  lotId        String?
  lot          Lot?         @relation(fields: [lotId], references: [id])
}

model MaterialExit {
  id          String   @id @default(uuid())
  destination String
  totalWeight Decimal  @db.Decimal(15, 4)
  createdAt   DateTime @default(now())
  exitDetails ExitDetail[]
}

model ExitDetail {
  id            String @id @default(uuid())
  weightAported Decimal @db.Decimal(15, 4)
  exitId   String
  exit     MaterialExit @relation(fields: [exitId], references: [id])
  lotId    String
  lot      Lot @relation(fields: [lotId], references: [id])
  bars Bar[]
  @@unique([exitId, lotId])
}
```

---

## 2. Todos los Endpoints

### Clients — `/clients`

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| `GET` | `/clients` | — | `Client[]` ordenados por name |
| `GET` | `/clients/:id` | — | `Client` |
| `POST` | `/clients` | `{ rif, name, contactInfo? }` | `Client` creado (name → UPPERCASE) |
| `PATCH` | `/clients/:id` | `{ rif?, name?, contactInfo? }` | `Client` actualizado |
| `DELETE` | `/clients/:id` | — | `Client` eliminado (solo si 0 barras en historial) |
| `GET` | `/clients/:id/balance` | — | `{ clientId, clientName, totalReceived, totalExited, inStock, currentBalance }` |

### Bars — `/bars`

| Método | Ruta | Body / Query | Respuesta |
|--------|------|--------------|-----------|
| `GET` | `/bars` | `?status=IN_STOCK&clientId=uuid` | `Bar[]` (con `client: { id, name }`) |
| `GET` | `/bars/:id` | — | `Bar` (con client) |
| `POST` | `/bars` | `{ barNumber, grossWeight, clientId, purity }` | `Bar` (fineWeight auto-calc) |

### Processes — `/processes`

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| `GET` | `/processes` | — | `Process[]` (con `client` + `lots`) |
| `GET` | `/processes/:id` | — | `Process` (con client + lots) |
| `GET` | `/processes/client/:clientId` | — | `Process[]` (con `lots`) |
| `POST` | `/processes` | `{ name, clientId }` | `Process` creado |
| **`GET`** | **`/processes/available-lots/:clientId`** | — | **NUEVO** — Procesos CLOSED con lotes + bars IN_STOCK |

### Lots — `/lots`

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| `GET` | `/lots` | — | `Lot[]` (con `process.client`) |
| `GET` | `/lots/:id` | — | `Lot` (con process.client) |
| `GET` | `/lots/process/:processId` | — | `Lot[]` |
| `POST` | `/lots` | `{ name, processId }` | `Lot` creado |

### Material Exits — `/material-exits` (REFACTORIZADO)

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| **`POST`** | **`/material-exits`** | **`{ destination, lotIds }`** | `MaterialExit` con detalles + lotes + barras |
| `GET` | `/material-exits` | — | `MaterialExit[]` (más reciente primero) |
| `GET` | `/material-exits/:id/traceability` | — | `MaterialExit` (trazabilidad completa) |

### Reports — `/reports`

| Método | Ruta | Respuesta |
|--------|------|-----------|
| `GET` | `/reports/client/:id` | `application/pdf` |
| `GET` | `/reports/company` | `application/pdf` |

---

## 3. Endpoints Detallados

### `GET /clients/:id/balance`
```json
{
  "clientId": "uuid",
  "clientName": "CLIENTE XYZ",
  "totalReceived": 15000.0,
  "totalExited": 3200.0,
  "inStock": 11800.0,
  "currentBalance": 11800.0
}
```

### `GET /processes/available-lots/:clientId` (NUEVO)
```json
[
  {
    "id": "uuid",
    "name": "PROCESO-001",
    "status": "CLOSED",
    "clientId": "uuid",
    "lots": [
      {
        "id": "uuid-lote-1",
        "name": "LOTE-A",
        "availableWeight": 5000.0,
        "barCount": 4
      }
    ]
  }
]
```

### `POST /material-exits` (REFACTORIZADO)

**Request:**
```json
{ "destination": "CLIENTE DESTINO", "lotIds": ["uuid-lote-1", "uuid-lote-2"] }
```

**Response:**
```json
{
  "id": "uuid",
  "destination": "CLIENTE DESTINO",
  "totalWeight": 8200.0,
  "createdAt": "2026-07-17T...",
  "exitDetails": [
    {
      "id": "uuid",
      "weightAported": 5000.0,
      "lotId": "uuid-lote-1",
      "lot": {
        "id": "uuid-lote-1",
        "name": "LOTE-A",
        "process": {
          "id": "uuid",
          "name": "PROCESO-001",
          "client": { "id": "uuid", "name": "CLIENTE XYZ" }
        }
      },
      "bars": [
        { "id": "uuid", "barNumber": "BR-001" }
      ]
    }
  ]
}
```

---

## 4. Flujo: Egreso por Lotes

```
1. GET /clients
   → [Client, Client, ...]

2. User selecciona cliente
   GET /processes/available-lots/:clientId
   → Procesos CLOSED con lotes + availableWeight

3. Renderizar tabla con checkboxes
   ┌──────────┬────────┬──────────────────┬──────────────┐
   │ PROCESO  │ LOTE   │ PESO DISPONIBLE  │ SELECCIONAR  │
   ├──────────┼────────┼──────────────────┼──────────────┤
   │ PR-001   │ LOTE-A │ 5.000,00 kg      │ ☑            │
   │ PR-001   │ LOTE-B │ 3.200,00 kg      │ ☐            │
   └──────────┴────────┴──────────────────┴──────────────┘
   Total: 5.000,00 kg

4. POST /material-exits { destination, lotIds }
   → Backend: $transaction {
       Create MaterialExit
       Create ExitDetail x lote
       Update bars → EXITED
     }

5. ✅ Respuesta: MaterialExit con detalles
```

---

## 5. TypeScript Types (para la UI)

```typescript
interface Client {
  id: string;
  rif: string;
  name: string;
  contactInfo?: string;
  createdAt: string;
  updatedAt: string;
}

interface Process {
  id: string;
  name: string;
  clientId: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  client?: Client;
  lots?: Lot[];
}

interface Lot {
  id: string;
  name: string;
  processId: string;
  createdAt: string;
  updatedAt: string;
  process?: Process;
  bars?: Bar[];
  availableWeight?: number;
  barCount?: number;
}

interface Bar {
  id: string;
  barNumber: string;
  grossWeight: number;
  purity: number;
  fineWeight: number;
  status: 'IN_STOCK' | 'EXITED';
  createdAt: string;
  updatedAt: string;
  clientId: string;
  exitDetailId?: string;
  lotId?: string;
  client?: { id: string; name: string };
}

interface MaterialExit {
  id: string;
  destination: string;
  totalWeight: number;
  createdAt: string;
  exitDetails: ExitDetail[];
}

interface ExitDetail {
  id: string;
  weightAported: number;
  exitId: string;
  lotId: string;
  lot?: Lot & { process: Process & { client: Client } };
  bars?: { id: string; barNumber: string; fineWeight?: number }[];
}

interface BalanceResponse {
  clientId: string;
  clientName: string;
  totalReceived: number;
  totalExited: number;
  inStock: number;
  currentBalance: number;
}

interface AvailableLotsResponse {
  id: string;
  name: string;
  status: 'CLOSED';
  clientId: string;
  lots: Array<{
    id: string;
    name: string;
    availableWeight: number;
    barCount: number;
  }>;
}

interface CreateMaterialExitRequest {
  destination: string;
  lotIds: string[];
}
```

---

## 6. Mapa: Pages → Endpoints

| Página | Endpoints |
|--------|-----------|
| `/dashboard` | `GET /clients`, `GET /bars`, `GET /material-exits` |
| `/ingresos` | `GET /clients`, `POST /bars`, `GET /bars?clientId=` |
| `/procesos` | `GET /clients`, `GET /processes`, `POST /processes`, `GET /lots`, `POST /lots`, `GET /bars?status=IN_STOCK&clientId=` |
| `/egresos` | `GET /clients`, `GET /processes/available-lots/:clientId`, `POST /material-exits` |
| `/reportes` | `GET /material-exits`, `GET /material-exits/:id/traceability`, `GET /clients/:id/balance`, `GET /reports/client/:id`, `GET /reports/company` |

---

## 7. Cambios Post-Refactor (Backend)

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | +`ProcessStatus` enum, +`Process.status`, ExitDetail per-lote |
| `processes.service.ts` | +`findAvailableLots()` |
| `processes.controller.ts` | +`GET /processes/available-lots/:clientId` |
| `material-exits.service.ts` | `create()` acepta `{ destination, lotIds }`, $transaction por lote |
| `material-exits.controller.ts` | Actualizar body type |
| `bars.service.ts` | Eliminar `autoSelect()` |
| `bars.controller.ts` | Eliminar `POST /bars/auto-select` |
