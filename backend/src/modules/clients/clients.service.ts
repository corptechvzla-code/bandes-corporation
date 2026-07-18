import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  private normalizeRif(raw: string): string {
    return `J${raw}`;
  }

  async findAll() {
    return this.prisma.client.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async create(data: { rif: string; name: string; contactInfo?: string }) {
    const normalizedRif = this.normalizeRif(data.rif);

    const existing = await this.prisma.client.findUnique({ where: { rif: normalizedRif } });
    if (existing) throw new BadRequestException('El RIF ya existe');

    return this.prisma.client.create({
      data: { rif: normalizedRif, name: data.name.toUpperCase(), contactInfo: data.contactInfo },
    });
  }

  async update(id: string, data: { rif?: string; name?: string; contactInfo?: string }) {
    const client = await this.findOne(id);

    if (data.rif) {
      const normalizedRif = this.normalizeRif(data.rif);
      if (normalizedRif !== client.rif) {
        const existing = await this.prisma.client.findUnique({ where: { rif: normalizedRif } });
        if (existing) throw new BadRequestException('El RIF ya existe');
      }
      data.rif = normalizedRif;
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...(data.rif && { rif: data.rif }),
        ...(data.name && { name: data.name.toUpperCase() }),
        ...(data.contactInfo !== undefined && { contactInfo: data.contactInfo }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const barsCount = await this.prisma.bar.count({
      where: { clientId: id },
    });
    if (barsCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar: el cliente tiene barras registradas en el historial',
      );
    }

    return this.prisma.client.delete({ where: { id } });
  }

  async balance(id: string) {
    const client = await this.findOne(id);

    const [barsResult, exitedBarsResult, inStockResult] = await Promise.all([
      this.prisma.bar.aggregate({
        where: { clientId: id },
        _sum: { fineWeight: true },
      }),
      this.prisma.bar.aggregate({
        where: { clientId: id, status: 'EXITED' },
        _sum: { fineWeight: true },
      }),
      this.prisma.bar.aggregate({
        where: { clientId: id, status: 'IN_STOCK' },
        _sum: { fineWeight: true },
      }),
    ]);

    const totalReceived = Number(barsResult._sum.fineWeight ?? 0);
    const totalExited = Number(exitedBarsResult._sum.fineWeight ?? 0);
    const inStock = Number(inStockResult._sum.fineWeight ?? 0);

    return {
      clientId: id,
      clientName: client.name,
      totalReceived,
      totalExited,
      inStock,
      currentBalance: totalReceived - totalExited,
    };
  }
}
