import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { ClientsModule } from './modules/clients/clients.module.js';
import { BarsModule } from './modules/bars/bars.module.js';
import { MaterialExitsModule } from './modules/material-exits/material-exits.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { ProcessesModule } from './modules/processes/processes.module.js';
import { LotsModule } from './modules/lots/lots.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';

@Module({
  imports: [
    PrismaModule,
    ClientsModule,
    BarsModule,
    MaterialExitsModule,
    ReportsModule,
    ProcessesModule,
    LotsModule,
    DashboardModule,
  ],
})
export class AppModule {}
