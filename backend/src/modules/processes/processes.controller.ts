import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ProcessesService } from './processes.service.js';

@Controller('processes')
export class ProcessesController {
  constructor(private service: ProcessesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('client/:clientId')
  findByClient(@Param('clientId') clientId: string) {
    return this.service.findByClient(clientId);
  }

  @Get('available-lots/:clientId')
  findAvailableLots(@Param('clientId') clientId: string) {
    return this.service.findAvailableLots(clientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string; clientId: string }) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; status?: 'OPEN' | 'CLOSED' },
  ) {
    return this.service.update(id, body);
  }
}
