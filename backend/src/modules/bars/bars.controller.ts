import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BarsService } from './bars.service.js';

@Controller('bars')
export class BarsController {
  constructor(private service: BarsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('lotId') lotId?: string,
  ) {
    return this.service.findAll({ status, clientId, lotId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      barNumber: string;
      grossWeight: number;
      purity: number;
      clientId: string;
      leyAg?: number;
    },
  ) {
    return this.service.create(body);
  }

  @Post('bulk-upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body('clientId') clientId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo');
    }
    if (!clientId) {
      throw new BadRequestException('clientId es requerido');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      throw new BadRequestException(
        'Formato de archivo inválido. Use .xlsx, .xls o .csv',
      );
    }

    return this.service.bulkCreate(file, clientId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      lotId?: string | null;
      status?: 'IN_STOCK' | 'PROCESANDO' | 'COMPLETADO' | 'EXITED';
    },
  ) {
    return this.service.update(id, body);
  }
}
