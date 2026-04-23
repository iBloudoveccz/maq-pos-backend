import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ResetPasswordDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * GET /api/v1/users
   * Lista todos los usuarios. Solo admin.
   * Query: ?role=seller para filtrar por rol
   */
  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Listar usuarios (admin)' })
  @ApiQuery({ name: 'role', required: false, enum: ['admin', 'seller', 'warehouse', 'billing'] })
  findAll(@Query('role') role?: string) {
    return this.usersService.findAll(role);
  }

  /**
   * GET /api/v1/users/:id
   * Ver detalle de un usuario. Solo admin.
   */
  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Ver usuario por ID (admin)' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * POST /api/v1/users
   * Crear usuario. Solo admin.
   */
  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear usuario (admin)' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') createdById: string,
  ) {
    return this.usersService.create(dto, createdById);
  }

  /**
   * PATCH /api/v1/users/:id
   * Actualizar datos del usuario. Solo admin.
   */
  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar usuario (admin)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.usersService.update(id, dto, requesterId, requesterRole);
  }

  /**
   * PATCH /api/v1/users/:id/reset-password
   * Resetear contraseña de un usuario. Solo admin.
   */
  @Patch(':id/reset-password')
  @Roles('admin')
  @ApiOperation({ summary: 'Resetear contraseña de usuario (admin)' })
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(id, dto);
  }

  /**
   * PATCH /api/v1/users/:id/deactivate
   * Desactivar usuario. Solo admin. No puede desactivarse a sí mismo.
   */
  @Patch(':id/deactivate')
  @Roles('admin')
  @ApiOperation({ summary: 'Desactivar usuario (admin)' })
  deactivate(
    @Param('id') id: string,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.usersService.deactivate(id, requesterId);
  }

  /**
   * PATCH /api/v1/users/:id/activate
   * Reactivar usuario desactivado. Solo admin.
   */
  @Patch(':id/activate')
  @Roles('admin')
  @ApiOperation({ summary: 'Activar usuario (admin)' })
  activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }
}
