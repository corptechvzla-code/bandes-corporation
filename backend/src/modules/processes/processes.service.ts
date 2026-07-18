import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ProcessesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.process.findMany({
      include: { client: { select: { id: true, name: true } }, lots: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const process = await this.prisma.process.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true } }, lots: true },
    });
    if (!process) throw new NotFoundException('Process not found');
    return process;
  }

  async findByClient(clientId: string) {
    return this.prisma.process.findMany({
      where: { clientId },
      include: { lots: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: { name: string; clientId: string }) {
    return this.prisma.process.create({
      data,
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, data: { name?: string; status?: 'OPEN' | 'CLOSED' }) {
    const process = await this.findOne(id);

    if (data.status === 'CLOSED' && process.status === 'CLOSED') {
      throw new BadRequestException('El proceso ya está cerrado');
    }

    return this.prisma.process.update({
      where: { id },
      data,
      include: { client: { select: { id: true, name: true } }, lots: true },
    });
  }

  async findAvailableLots(clientId: string) {
    const processes = await this.prisma.process.findMany({
      where: { clientId, status: 'CLOSED' },
      include: {
        lots: {
          include: {
            bars: {
              where: { status: 'IN_STOCK' },
              select: { fineWeight: true, leyAg: true, fineWeightAg: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return processes.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      clientId: p.clientId,
      lots: p.lots
        .filter((l) => l.bars.length > 0)
        .map((l) => ({
          id: l.id,
          name: l.name,
          availableWeight: Number(
            l.bars.reduce((sum, b) => sum + Number(b.fineWeight), 0),
          ),
          barCount: l.bars.length,
        })),
    }));
  }
}
