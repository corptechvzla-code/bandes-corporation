import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class LotsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.lot.findMany({
      include: { process: { include: { client: { select: { id: true, name: true } } } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const lot = await this.prisma.lot.findUnique({
      where: { id },
      include: { process: { include: { client: { select: { id: true, name: true } } } } },
    });
    if (!lot) throw new NotFoundException('Lot not found');
    return lot;
  }

  async findByProcess(processId: string) {
    return this.prisma.lot.findMany({
      where: { processId },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: {
    name: string;
    processId: string;
    operator?: string;
    castingTemp?: number;
    moldCode?: string;
  }) {
    return this.prisma.lot.create({
      data,
      include: { process: true },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      operator?: string;
      castingTemp?: number;
      moldCode?: string;
      recovered?: number | null;
      recoveryAt?: string | null;
    },
  ) {
    const lot = await this.findOne(id);
    return this.prisma.lot.update({
      where: { id },
      data: {
        ...data,
        ...(data.recoveryAt ? { recoveryAt: new Date(data.recoveryAt) } : {}),
      },
      include: {
        process: { include: { client: { select: { id: true, name: true } } } },
        bars: true,
      },
    });
  }
}
