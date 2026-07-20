import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('metrics')
  getMetrics() {
    return this.service.getMetrics();
  }
}
