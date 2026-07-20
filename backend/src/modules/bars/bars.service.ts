import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import ExcelJS from 'exceljs';

export interface BulkUploadResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

interface HeaderMap {
  code: number;
  grossWeight: number;
  purity: number;
  leyAg: number | null;
  lot: number | null;
}

@Injectable()
export class BarsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { status?: string; clientId?: string; lotId?: string }) {
    return this.prisma.bar.findMany({
      where: {
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.clientId && { clientId: filters.clientId }),
        ...(filters?.lotId && { lotId: filters.lotId }),
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const bar = await this.prisma.bar.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true } } },
    });
    if (!bar) throw new NotFoundException('Bar not found');
    return bar;
  }

  async create(data: {
    barNumber: string;
    grossWeight: number;
    purity: number;
    clientId: string;
    leyAg?: number;
  }) {
    const fineWeight = data.grossWeight * (data.purity / 1000);
    const fineWeightAg = data.leyAg
      ? data.grossWeight * (data.leyAg / 1000)
      : null;

    return this.prisma.bar.create({
      data: {
        barNumber: data.barNumber,
        grossWeight: data.grossWeight,
        purity: data.purity,
        fineWeight,
        leyAg: data.leyAg ?? null,
        fineWeightAg,
        clientId: data.clientId,
      },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    const bar = await this.findOne(id);
    if (bar.status === 'EXITED' || bar.exitDetailId) {
      throw new BadRequestException('No se puede eliminar una barra que ya ha sido egresada');
    }
    return this.prisma.bar.delete({
      where: { id },
    });
  }

  async update(
    id: string,
    data: {
      lotId?: string | null;
      status?: 'IN_STOCK' | 'PROCESANDO' | 'COMPLETADO' | 'EXITED';
    },
  ) {
    const bar = await this.findOne(id);
    return this.prisma.bar.update({
      where: { id },
      data,
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async bulkCreate(
    file: Express.Multer.File,
    clientId: string,
  ): Promise<BulkUploadResult> {
    const result: BulkUploadResult = { created: 0, skipped: 0, errors: [] };

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new BadRequestException(
        'El archivo no contiene datos válidos',
      );
    }

    const headerRow = worksheet.getRow(1);
    const headerMap = this.buildHeaderMap(headerRow);

    if (!headerMap.code || !headerMap.grossWeight || !headerMap.purity) {
      throw new BadRequestException(
        'El archivo debe contener las columnas: CÓDIGO, PESO BRUTO (g), PUREZA (‰)',
      );
    }

    const codeRowMap = new Map<string, number>();
    const barsToCreate: Array<{
      barNumber: string;
      grossWeight: number;
      purity: number;
      fineWeight: number;
      leyAg: number | null;
      fineWeightAg: number | null;
    }> = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const codeCell = row.getCell(headerMap.code);
      const code = String(codeCell.value ?? '').toString().trim().toUpperCase();

      if (!code) continue;

      const summaryKeywords = ['TOTAL', 'SUBTOTAL', 'RESUMEN', 'SUM'];
      if (summaryKeywords.some((kw) => code.startsWith(kw))) continue;

      if (codeRowMap.has(code)) {
        result.errors.push({
          row: rowNumber,
          message: `Código duplicado en la fila ${rowNumber}: "${code}" ya aparece en la fila ${codeRowMap.get(code)}`,
        });
        continue;
      }
      codeRowMap.set(code, rowNumber);

      const grossWeight = this.parseNumericCell(
        row.getCell(headerMap.grossWeight),
      );
      if (grossWeight === null || grossWeight <= 0) {
        result.errors.push({
          row: rowNumber,
          message: `Peso bruto inválido en fila ${rowNumber}: "${row.getCell(headerMap.grossWeight).value}"`,
        });
        continue;
      }

      const purity = this.parseNumericCell(row.getCell(headerMap.purity));
      if (purity === null || purity <= 0 || purity > 1000) {
        result.errors.push({
          row: rowNumber,
          message: `Pureza inválida en fila ${rowNumber}: "${row.getCell(headerMap.purity).value}" (debe ser 0-1000‰)`,
        });
        continue;
      }

      const fineWeight = grossWeight * (purity / 1000);

      let leyAg: number | null = null;
      let fineWeightAg: number | null = null;
      if (headerMap.leyAg) {
        leyAg = this.parseNumericCell(row.getCell(headerMap.leyAg));
        if (leyAg !== null) {
          if (leyAg < 0 || leyAg > 1000) {
            result.errors.push({
              row: rowNumber,
              message: `Ley Ag inválida en fila ${rowNumber}: debe estar entre 0 y 1000‰`,
            });
            continue;
          }
          fineWeightAg = grossWeight * (leyAg / 1000);
        }
      }

      barsToCreate.push({
        barNumber: code,
        grossWeight,
        purity,
        fineWeight,
        leyAg,
        fineWeightAg,
      });
    }

    if (barsToCreate.length === 0) {
      throw new BadRequestException(
        'No se encontraron barras válidas para insertar',
      );
    }

    const existingCodes = await this.prisma.bar.findMany({
      where: {
        clientId: clientId,
        barNumber: { in: barsToCreate.map((b) => b.barNumber) },
      },
      select: { barNumber: true },
    });
    if (existingCodes.length > 0) {
      const existingSet = new Set(existingCodes.map((b) => b.barNumber));
      const dupeCodes = barsToCreate.filter((b) => existingSet.has(b.barNumber));
      throw new BadRequestException(
        `Los siguientes códigos ya existen en la base de datos: ${dupeCodes.map((b) => b.barNumber).join(', ')}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.bar.createMany({
        data: barsToCreate.map((b) => ({
          barNumber: b.barNumber,
          grossWeight: b.grossWeight,
          purity: b.purity,
          fineWeight: b.fineWeight,
          leyAg: b.leyAg,
          fineWeightAg: b.fineWeightAg,
          clientId,
        })),
      });
      result.created = created.count;
    });

    return result;
  }

  private buildHeaderMap(headerRow: ExcelJS.Row): HeaderMap {
    const map: HeaderMap = {
      code: 0,
      grossWeight: 0,
      purity: 0,
      leyAg: null,
      lot: null,
    };

    headerRow.eachCell((cell, colIndex: number) => {
      const header = String(cell.value ?? '').toString().trim().toUpperCase();

      if (
        header === 'CÓDIGO' ||
        header === 'CODIGO' ||
        header === 'CODE' ||
        header === 'BARRA' ||
        header === 'BAR NUMBER'
      ) {
        map.code = colIndex;
      } else if (
        header.includes('PESO BRUTO') ||
        header.includes('GROSS')
      ) {
        map.grossWeight = colIndex;
      } else if (
        header.includes('PUREZA') ||
        header === 'LEY' ||
        header.includes('LEY AU') ||
        header === 'AU' ||
        header.includes('PURITY') ||
        header.includes('FINENESS') ||
        header === 'AU‰'
      ) {
        map.purity = colIndex;
      } else if (
        header.includes('LEY AG') ||
        header.includes('SILVER') ||
        header === 'AG' ||
        header === 'AG‰'
      ) {
        map.leyAg = colIndex;
      } else if (
        header.includes('LOTE') ||
        header.includes('LOT')
      ) {
        map.lot = colIndex;
      }
    });

    return map;
  }

  private parseNumericCell(cell: ExcelJS.Cell): number | null {
    if (cell.result != null && typeof cell.result === 'number') {
      return cell.result;
    }
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
}
