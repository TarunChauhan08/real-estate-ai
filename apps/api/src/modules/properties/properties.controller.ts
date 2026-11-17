import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type AddSampleListingsResult,
  type ImportListingsResult,
  Permission,
  type PropertyDto,
} from '@rea/shared-types';
import { CurrentAuth, CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { Errors } from '../../common/errors/app.exception';
import { type Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { type AuthContext, type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertyQueryDto } from './dto/property-query.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ImportListingsDto } from './import/import.dto';
import { PropertyImportService } from './import/property-import.service';
import { PropertiesService } from './properties.service';

const uuidPipe = new ParseUUIDPipe({ exceptionFactory: () => Errors.notFound('Property') });

/**
 * Inventory of the active business. There is no tenant ID in any URL or body:
 * the tenant always comes from the caller's membership.
 */
@ApiTags('properties')
@ApiBearerAuth()
@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly properties: PropertiesService,
    private readonly importer: PropertyImportService,
  ) {}

  // Declared before ':id' routes so the paths are not read as IDs.
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PROPERTIES_WRITE)
  @ApiOperation({ summary: 'Import listings from CSV (all-or-nothing; dryRun to check first)' })
  import(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: ImportListingsDto,
  ): Promise<ImportListingsResult> {
    return this.importer.import(ctx, auth.userId, dto.csv, dto.dryRun ?? false);
  }

  @Post('samples')
  @RequirePermissions(Permission.PROPERTIES_WRITE)
  @ApiOperation({ summary: 'Add six sample listings so the AI can be tried right away' })
  addSamples(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
  ): Promise<AddSampleListingsResult> {
    return this.importer.addSamples(ctx, auth.userId);
  }

  @Get()
  @RequirePermissions(Permission.PROPERTIES_READ)
  @ApiOperation({ summary: 'List properties (archived hidden by default)' })
  list(
    @CurrentTenant() ctx: TenantContext,
    @Query() query: PropertyQueryDto,
  ): Promise<Paginated<PropertyDto>> {
    return this.properties.list(ctx, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.PROPERTIES_READ)
  @ApiOperation({ summary: 'Get one property' })
  get(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', uuidPipe) id: string,
  ): Promise<PropertyDto> {
    return this.properties.get(ctx, id);
  }

  @Post()
  @RequirePermissions(Permission.PROPERTIES_WRITE)
  @ApiOperation({ summary: 'Add a property to the inventory' })
  create(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreatePropertyDto,
  ): Promise<PropertyDto> {
    return this.properties.create(ctx, auth.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PROPERTIES_WRITE)
  @ApiOperation({ summary: 'Update a property, change its status, or archive it' })
  update(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdatePropertyDto,
  ): Promise<PropertyDto> {
    return this.properties.update(ctx, auth.userId, id, dto);
  }
}
