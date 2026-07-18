import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { MaterialExitsService } from './material-exits.service.js';

@Controller('material-exits')
export class MaterialExitsController {
  constructor(private service: MaterialExitsService) {}

  @Post()
  create(
    @Body()
    body: {
      destination: string;
      lotIds: string[];
    },
  ) {
    return this.service.create(body);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id/traceability')
  traceability(@Param('id') id: string) {
    return this.service.traceability(id);
  }
}
