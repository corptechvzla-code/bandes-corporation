import { IsNumberString, IsString, IsOptional, IsEnum, Length } from 'class-validator';

enum ClientRole {
  PROVEEDOR = 'PROVEEDOR',
  CLIENTE = 'CLIENTE',
  AMBOS = 'AMBOS',
}

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

  @IsOptional()
  @IsEnum(ClientRole)
  role?: ClientRole;
}
