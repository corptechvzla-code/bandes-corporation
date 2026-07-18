import { IsNumberString, IsString, IsOptional, Length } from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsNumberString()
  @Length(9, 9, { message: 'El cuerpo del RIF debe contener exactamente 9 dígitos numéricos' })
  rif?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  contactInfo?: string;
}
