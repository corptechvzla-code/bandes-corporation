# Flujo de Carga Masiva — Panel de Ingresos

## Descripción General

Flujo para subir múltiples barras de oro/plata desde un archivo Excel (`.xlsx`, `.xls` o `.csv`) a través del panel de ingresos.

---

## Diagrama de Flujo

```
FRONTEND (Next.js)                         BACKEND (NestJS)                    DATABASE (PostgreSQL)
==============================             =======================             =====================

Usuario llena formulario en Ingreso Page
  ├─ Selecciona proveedor
  ├─ Selecciona archivo .xlsx/.xls/.csv
  └─ Click "Subir Archivo"
       │
       ▼
handleBulkUpload() [page.tsx:125]
  ├─ Validación client-side (10 MB máx)
  └─ Crea FormData con 'file' + 'supplierId'
       │
       ▼
useBulkUpload().mutateAsync(formData)
  └─ useGoldBars.ts:91
       │
       ▼
apiUpload<BulkUploadResult>('/gold-bars/bulk-upload', formData)
  └─ api.ts:57 — POST multipart/form-data via axios
       │
       ▼
Next.js rewrites /api/* → backend URL (next.config.ts:12)
  └─ Dev:  http://localhost:4000
     Prod: https://api.controlmining.io
       │
       ▼
GoldBarsController.bulkUpload() [controller.ts:36]
  ├─ @UseGuards(AuthGuard('jwt')) — JWT auth
  ├─ @UseInterceptors(FileInterceptor('file', 10MB))
  ├─ Valida: file existe, supplierId existe, extensión válida
  └─ goldBarsService.bulkCreate(file, supplierId)
       │
       ▼
GoldBarsService.bulkCreate() [service.ts:35]
  ├─ Parsea Excel via exceljs desde buffer
  ├─ Itera filas 2..N:
  │   ├─ Salta filas vacías / de resumen
  │   ├─ Detecta duplicados de código in-file (error si hay)
  │   ├─ Parsea grossWeight (col B) > 0
  │   ├─ Parsea ley (col C) > 0
  │   ├─ Calcula analytical = weight * ley / 1000
  │   ├─ Calcula expected = analytical * 0.99
  │   ├─ Parsea lot (col E), leyAg (col F), analyticalAg (col G)
  │   └─ Acumula en barsToCreate[]
  ├─ Verifica duplicados en DB por (supplierId, code)
  ├─ prisma.goldBar.createMany() — insert masivo
  ├─ prisma.transaction.create({ type:'IN', weight, purity, supplierId })
  └─ Retorna { created, skipped, errors }
       │
       ▼
Respuesta fluye de vuelta:
  Controller → HTTP Response → axios → useGoldBars hook
       │
       ▼
onSuccess: Invalida queries 'gold-bars' y 'transactions'
       │
       ▼
UI muestra modal con "Se insertaron N barras correctamente."
```

---

## Archivos Involucrados

### Frontend

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `refineria-frontend/app/(dashboard)/ingreso/page.tsx` | 125-158 | Handler `handleBulkUpload()` |
| `refineria-frontend/app/(dashboard)/ingreso/page.tsx` | 160-221 | Descarga de plantilla Excel |
| `refineria-frontend/app/(dashboard)/ingreso/page.tsx` | 489-557 | UI del panel de carga masiva |
| `refineria-frontend/lib/hooks/useGoldBars.ts` | 88-98 | React Query `useBulkUpload()` mutation |
| `refineria-frontend/lib/api.ts` | 57 | Cliente HTTP `apiUpload()` multipart |
| `refineria-frontend/next.config.ts` | 12-19 | Rewrite `/api/*` → backend |
| `refineria-frontend/types/refinery.ts` | 3-17 | TypeScript `GoldBar` interface |

### Backend

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `refineria-backend/src/gold-bars/gold-bars.controller.ts` | 32-55 | Endpoint `POST /gold-bars/bulk-upload` |
| `refineria-backend/src/gold-bars/gold-bars.service.ts` | 35-172 | Lógica de negocio `bulkCreate()` |
| `refineria-backend/src/gold-bars/gold-bars.service.ts` | 174-186 | Helper `parseNumericCell()` |
| `refineria-backend/src/gold-bars/gold-bars.module.ts` | — | Wiring módulo |
| `refineria-backend/src/gold-bars/dto/create-gold-bar.dto.ts` | — | DTO con validación |
| `refineria-backend/src/app.module.ts` | 26 | Importa GoldBarsModule |
| `refineria-backend/src/prisma/prisma.module.ts` | — | Prisma global module |

### Base de Datos

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `refineria-backend/prisma/schema.prisma` | 52-72 | Modelo `GoldBar` |
| `refineria-backend/prisma/schema.prisma` | 37-50 | Modelo `Transaction` |

### Migraciones Relevantes

| Migración | Propósito |
|-----------|-----------|
| `20260602013612_add_gold_bars_processes` | Creación inicial de `gold_bars` |
| `20260602132541_rename_to_english` | Renombrar columnas a inglés |
| `20260603143105_add_ley_field` | Agregar columna `ley` |
| `20260615152304_add_silver_fields` | Agregar `ley_ag` y `analytical_ag` |
| `20260711160441_add_supply_item_fields` | Agregar `original_lot` |
| `20260713000001_add_goldbar_unique_per_supplier` | Unique constraint `(supplier_id, code)` |

---

## Detalle Técnico

### Frontend — HandleBulkUpload

```typescript
const handleBulkUpload = async () => {
    if (!bulkSupplierId || !bulkFile) return;

    if (bulkFile.size > 10 * 1024 * 1024) {
      setBulkError('El archivo excede el tamaño máximo de 10 MB...');
      return;
    }

    const formData = new FormData();
    formData.append('file', bulkFile);
    formData.append('supplierId', bulkSupplierId);

    try {
      const result = await bulkUpload.mutateAsync(formData);
      const msg = result.errors.length > 0
        ? `Se insertaron ${result.created} barras. ${result.errors.length} fila(s) con errores de formato.`
        : `Se insertaron ${result.created} barras correctamente.`;
      setSuccessMessage(msg);
    } catch (e: unknown) {
      let msg = e instanceof Error ? e.message : 'Error al procesar la carga masiva';
      // ...
    }
};
```

### Frontend — React Query Hook

```typescript
export function useBulkUpload() {
  const queryClient = useQueryClient();

  return useMutation<BulkUploadResult, Error, FormData>({
    mutationFn: (formData) =>
      apiUpload<BulkUploadResult>('/gold-bars/bulk-upload', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gold-bars'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
```

### Backend — Controller

```typescript
@Post('bulk-upload')
@UseInterceptors(
  FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
)
async bulkUpload(
  @UploadedFile() file: Express.Multer.File,
  @Body('supplierId') supplierId: string,
) {
  if (!file) throw new BadRequestException('No file uploaded');
  if (!supplierId) throw new BadRequestException('supplierId is required');

  const ext = file.originalname.split('.').pop()?.toLowerCase();
  if (!ext || !['xlsx', 'xls', 'csv'].includes(ext))
    throw new BadRequestException('Invalid file format');

  return this.goldBarsService.bulkCreate(file, supplierId);
}
```

### Backend — Estructura del Excel Esperado

| Columna | Campo | Requerido | Tipo |
|---------|-------|-----------|------|
| A | CÓDIGO | Sí | Texto |
| B | PESO BRUTO (g) | Sí | Número > 0 |
| C | LEY Au (‰) | Sí | Número > 0 |
| D | PESO FINO Au (g) | Calculado | `=B*C/1000` |
| E | LOTE N° | No | Texto |
| F | LEY Ag (‰) | No | Número |
| G | PESO FINO Ag (g) | Calculado/opcional | `=B*F/1000` o directo |

### Backend — Validaciones

- **Tamaño archivo:** Máximo 10 MB
- **Formato:** `.xlsx`, `.xls`, `.csv`
- **Filas vacías:** Se saltan automáticamente
- **Filas de resumen:** Se saltan si empiezan con TOTAL/SUBTOTAL/RESUMEN/SUM
- **Códigos duplicados in-file:** Error si dos filas tienen el mismo código
- **Códigos duplicados en DB:** Error si el código ya existe para ese proveedor (unique constraint `(supplierId, code)`)
- **Gross weight:** Debe ser número positivo
- **Ley Au:** Debe ser número positivo
- **Analytical:** Calculado como `grossWeight * ley / 1000`
- **Expected:** Calculado como `analytical * 0.99`

### Helper parseNumericCell

```typescript
private parseNumericCell(cell: ExcelJS.Cell): number | null {
    if (cell.result != null && typeof cell.result === 'number') return cell.result;
    if (cell.value != null) {
      const val = cell.value;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseFloat(val.replace(',', '.'));
        return isNaN(parsed) ? null : parsed;
      }
    }
    return null;
}
```

Soporta:
- Resultados de fórmulas
- Números directos
- Strings con coma como separador decimal (ej: `123,45`)

---

## Estructura de la Plantilla de Descarga

Generada con `exceljs` en `page.tsx:160-221`:

- Columnas con headers nombrados en español
- Columna D (PESO FINO Au) con fórmula `=B*C/1000`
- Columna G (PESO FINO Ag) con fórmula `=B*F/1000`
- Validación de duplicados en columna A
- Formato de celdas y estilos visuales

---

## Modelo de Base de Datos (GoldBar)

```prisma
model GoldBar {
  id               String   @id @default(uuid())
  code             String   @map("code")
  supplierId       String   @map("supplier_id")
  grossWeight      Float    @map("gross_weight")
  ley              Float?   @map("ley")
  analytical       Float    @map("analytical")
  expected         Float    @map("expected")
  recovered        Float    @map("recovered")
  leyAg            Float?   @map("ley_ag")
  analyticalAg     Float?   @map("analytical_ag")
  originalLot      String?  @map("original_lot")
  available        Boolean  @default(true) @map("available")
  registrationDate DateTime @default(now()) @map("registration_date")

  @@unique([supplierId, code])
  @@map("gold_bars")
}
```

---

## Transacción Generada

Por cada carga masiva exitosa se crea una transacción de tipo `IN`:

```prisma
model Transaction {
  id         String          @id @default(uuid())
  type       TransactionType   // IN
  weight     Float             // peso total de todas las barras
  weightUnit WeightUnit        // g
  purity     Float             // pureza promedio
  supplierId String?           // proveedor seleccionado
  date       DateTime        @default(now())
}
```
