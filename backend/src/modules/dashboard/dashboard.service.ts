import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics() {
    const [recibidoAgg, procesoAgg, recoveredAgg, exitedAgg, mermaFAAgg] =
      await Promise.all([
        // 1. ORO RECIBIDO: fineWeight total de todas las barras
        this.prisma.bar.aggregate({
          _sum: { fineWeight: true },
          _count: true,
        }),

        // 2. ORO EN PROCESO: fineWeight de barras en fundición
        this.prisma.bar.aggregate({
          where: { status: 'PROCESANDO' },
          _sum: { fineWeight: true },
          _count: true,
        }),

        // 3. Recovered desde procesos CLOSED (para bóveda y merma)
        this.prisma.lot.aggregate({
          where: {
            process: { status: 'CLOSED' },
            recovered: { not: null },
          },
          _sum: { recovered: true },
        }),

        // 4. EXITED fineWeight (para bóveda)
        this.prisma.bar.aggregate({
          where: { status: 'EXITED' },
          _sum: { fineWeight: true },
        }),

        // 5. FA que entró a fundir (COMPLETADO + EXITED)
        this.prisma.bar.aggregate({
          where: { status: { in: ['COMPLETADO', 'EXITED'] } },
          _sum: { fineWeight: true },
        }),
      ]);

    const oroRecibidoFA = Number(recibidoAgg._sum.fineWeight ?? 0);
    const oroEnProcesoFA = Number(procesoAgg._sum.fineWeight ?? 0);
    const oroEnProcesoCount = procesoAgg._count;
    const recoveredTotal = Number(recoveredAgg._sum.recovered ?? 0);
    const exitedFA = Number(exitedAgg._sum.fineWeight ?? 0);
    const mermaFA = Number(mermaFAAgg._sum.fineWeight ?? 0);

    const oroEnBovedaFA = Math.max(0, recoveredTotal - exitedFA);

    const mermaG = Math.max(0, mermaFA - recoveredTotal);
    const mermaPct = mermaFA > 0 ? (mermaG / mermaFA) * 100 : 0;

    return {
      oroRecibido: {
        fineWeight: oroRecibidoFA,
        barCount: recibidoAgg._count,
      },
      oroEnProceso: {
        fineWeight: oroEnProcesoFA,
        barCount: oroEnProcesoCount,
      },
      oroEnBoveda: {
        fineWeight: oroEnBovedaFA,
      },
      merma: {
        gramos: mermaG,
        porcentaje: mermaPct,
      },
    };
  }
}
