import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async clientReport(clientId: string): Promise<Buffer> {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    const [receivedAgg, exitedAgg, bars] = await Promise.all([
      this.prisma.bar.aggregate({
        where: { clientId },
        _sum: { fineWeight: true },
      }),
      this.prisma.bar.aggregate({
        where: { clientId, status: 'EXITED' },
        _sum: { fineWeight: true },
      }),
      this.prisma.bar.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalReceived = Number(receivedAgg._sum.fineWeight ?? 0);
    const totalExited = Number(exitedAgg._sum.fineWeight ?? 0);
    const balance = totalReceived - totalExited;

    return this.generatePdf((doc) => {
      doc.fontSize(20).text('Gold Command Center', { align: 'center' });
      doc.fontSize(16).text(`Reporte de Cliente: ${client.name}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(12).text(`Peso recibido total: ${totalReceived.toFixed(4)} kg`);
      doc.text(`Peso entregado total: ${totalExited.toFixed(4)} kg`);
      doc.text(`Saldo actual: ${balance.toFixed(4)} kg`);
      doc.moveDown();

      doc.fontSize(14).text('Historial de Barras:');
      for (const bar of bars) {
        doc.fontSize(10).text(
          `#${bar.barNumber} — Bruto: ${Number(bar.grossWeight).toFixed(4)} kg, ` +
          `Fineza: ${Number(bar.purity).toFixed(2)}‰, ` +
          `FA: ${Number(bar.fineWeight).toFixed(4)} kg — ${bar.status}`,
        );
      }
    });
  }

  async companyReport(): Promise<Buffer> {
    const exits = await this.prisma.materialExit.findMany({
      include: {
        exitDetails: {
          include: {
            lot: {
              include: {
                process: {
                  include: { client: { select: { name: true } } },
                },
              },
            },
            bars: { select: { barNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.generatePdf((doc) => {
      doc.fontSize(20).text('Gold Command Center', { align: 'center' });
      doc.fontSize(16).text('Reporte de Trazabilidad — Empresa', { align: 'center' });
      doc.moveDown(2);

      for (const exit of exits) {
        doc.fontSize(14).text(`Egreso ID-${exit.id.slice(0, 8)}`);
        doc.fontSize(10).text(`Destino: ${exit.destination}`);
        doc.text(`Peso Total: ${Number(exit.totalWeight).toFixed(4)} kg`);
        doc.text(`Fecha: ${exit.createdAt.toISOString().split('T')[0]}`);
        doc.moveDown(0.5);

        for (const detail of exit.exitDetails) {
          const clientName = detail.lot?.process?.client?.name ?? 'N/A';
          doc.text(
            `  → ${clientName}: ${Number(detail.weightAported).toFixed(4)} kg ` +
            `— Barras: [${detail.bars.map((b) => `#${b.barNumber}`).join(', ')}]`,
          );
        }
        doc.moveDown();
      }
    });
  }

  private generatePdf(contents: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      contents(doc);
      doc.end();
    });
  }
}
