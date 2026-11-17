import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembershipsService } from './memberships.service';
import { TeamService } from './team.service';

@Module({
  controllers: [MembersController],
  providers: [MembershipsService, TeamService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
