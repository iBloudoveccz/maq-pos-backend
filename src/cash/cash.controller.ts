// ─── dto/open-shift.dto.ts ────────────────────────────────────────────────
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenShiftDto {
  @ApiProperty() @IsString() cashierId: string;
  @ApiProperty() @IsString() terminalId: string;
  @ApiProperty({ example: 'POS01' }) @IsString() terminalCode: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) openingCash?: number;
}

// ─── dto/cash-filters.dto.ts ──────────────────────────────────────────────
import { IsOptional, IsString, IsInt, IsDateString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CashFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cashierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() terminalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional() @IsOptional()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : undefined)
  isOpen?: boolean;
}

// ─── cash.controller.ts ───────────────────────────────────────────────────
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CashService } from './cash.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CashFiltersDto } from './dto/cash-filters.dto';

@ApiTags('Caja')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  // ── Turnos ────────────────────────────────────────────────────────────────
  @Get('shifts') @ApiOperation({ summary: 'Listar turnos de caja' })
  findAllShifts(@Query() filters: CashFiltersDto) {
    return this.cashService.findAllShifts(filters);
  }

  @Get('shifts/active/:terminalId') @ApiOperation({ summary: 'Turno activo de un terminal' })
  getActiveShift(@Param('terminalId') terminalId: string) {
    return this.cashService.getActiveShift(terminalId);
  }

  @Get('shifts/:id') @ApiOperation({ summary: 'Detalle del turno con ventas y pagos' })
  findOneShift(@Param('id') id: string) {
    return this.cashService.findOneShift(id);
  }

  @Post('shifts/open') @ApiOperation({ summary: 'Abrir turno de caja' })
  openShift(@Body() dto: OpenShiftDto) {
    return this.cashService.openShift(dto);
  }

  @Patch('shifts/:id/close') @ApiOperation({ summary: 'Cerrar turno y recalcular totales' })
  closeShift(@Param('id') id: string) {
    return this.cashService.closeShift(id);
  }

  // ── Libro de caja ─────────────────────────────────────────────────────────
  @Get('book') @ApiOperation({ summary: 'Libro de caja (L_MoneyInout)' })
  getCashBook(@Query() filters: CashFiltersDto) {
    return this.cashService.getCashBook(filters);
  }

  // ── Resumen del día ───────────────────────────────────────────────────────
  @Get('summary') @ApiOperation({ summary: 'Resumen ejecutivo de caja del día' })
  getDailySummary(@Query('date') date?: string) {
    return this.cashService.getDailyCashSummary(date);
  }
}
