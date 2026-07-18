import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ClientsService } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';

@Controller('clients')
export class ClientsController {
  constructor(private service: ClientsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: CreateClientDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateClientDto) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/balance')
  balance(@Param('id') id: string) {
    return this.service.balance(id);
  }
}

