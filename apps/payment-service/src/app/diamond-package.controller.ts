import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, OptionalJwtGuard, RolesGuard, Roles } from '@suggar-daddy/auth';
import { PermissionRole } from '@suggar-daddy/common';
import { DiamondPackageService } from './diamond-package.service';
import { CreateDiamondPackageDto } from './dto/diamond.dto';

@ApiTags('Diamond Packages')
@Controller('diamond-packages')
export class DiamondPackageController {
  constructor(private readonly packageService: DiamondPackageService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'List available diamond packages' })
  @ApiResponse({ status: 200, description: 'Diamond packages retrieved' })
  async getPackages() {
    return this.packageService.getPackages();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PermissionRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a diamond package (admin)' })
  @ApiResponse({ status: 201, description: 'Diamond package created' })
  async createPackage(@Body() dto: CreateDiamondPackageDto) {
    return this.packageService.createPackage(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PermissionRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a diamond package (admin)' })
  async updatePackage(@Param('id') id: string, @Body() dto: Partial<CreateDiamondPackageDto>) {
    return this.packageService.updatePackage(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PermissionRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Deactivate a diamond package (admin)' })
  async deletePackage(@Param('id') id: string) {
    await this.packageService.deletePackage(id);
    return { success: true };
  }
}
