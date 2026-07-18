import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class MaterialExitsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { destination: string; lotIds: string[] }) {
    if (!data.lotIds?.length) {
      throw new BadRequestException('Al menos un lote es requerido');
    }

    return this.prisma.$transaction(async (tx) => {
      const lots = await tx.lot.findMany({
        where: { id: { in: data.lotIds } },
        include: {
          process: { select: { status: true, clientId: true } },
          bars: { where: { status: { in: ['IN_STOCK', 'COMPLETADO'] } } },
        },
      });

      if (lots.length !== data.lotIds.length) {
        throw new BadRequestException('Uno o más lotes no existen');
      }

      for (const lot of lots) {
        if (lot.process.status !== 'CLOSED') {
          throw new BadRequestException(
            `El lote ${lot.name} pertenece a un proceso no cerrado`,
          );
        }
        if (lot.bars.length === 0) {
          throw new BadRequestException(
            `El lote ${lot.name} no tiene barras disponibles para egresar`,
          );
        }
      }

      const totalWeight = lots.reduce(
        (sum, lot) => sum + lot.bars.reduce((s, b) => s + Number(b.fineWeight), 0),
        0,
      );

      const exit = await tx.materialExit.create({
        data: { destination: data.destination, totalWeight },
      });

      for (const lot of lots) {
        const lotWeight = lot.bars.reduce((s, b) => s + Number(b.fineWeight), 0);

        const detail = await tx.exitDetail.create({
          data: {
            exitId: exit.id,
            lotId: lot.id,
            weightAported: lotWeight,
          },
        });

        await tx.bar.updateMany({
          where: { id: { in: lot.bars.map((b) => b.id) } },
          data: { status: 'EXITED', exitDetailId: detail.id },
        });
      }

      return tx.materialExit.findUnique({
        where: { id: exit.id },
        include: {
          exitDetails: {
            include: {
              lot: {
                include: {
                  process: {
                    include: { client: { select: { id: true, name: true } } },
                  },
                },
              },
              bars: { select: { id: true, barNumber: true, fineWeight: true } },
            },
          },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.materialExit.findMany({
      include: {
        exitDetails: {
          include: {
            lot: {
              include: {
                process: {
                  include: { client: { select: { id: true, name: true } } },
                },
              },
            },
            bars: { select: { barNumber: true, fineWeight: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async traceability(id: string) {
    const exit = await this.prisma.materialExit.findUnique({
      where: { id },
      include: {
        exitDetails: {
          include: {
            lot: {
              include: {
                process: {
                  include: { client: { select: { id: true, name: true } } },
                },
              },
            },
            bars: { select: { barNumber: true, fineWeight: true } },
          },
        },
      },
    });

    if (!exit) throw new NotFoundException('MaterialExit not found');
    return exit;
  }
}
