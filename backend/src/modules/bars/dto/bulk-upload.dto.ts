import { IsString, IsNotEmpty } from 'class-validator';

export class BulkUploadDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;
}
