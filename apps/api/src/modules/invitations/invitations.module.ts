import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvitationDeliveryService } from './invitation-delivery.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { PublicInvitationsController } from './public-invitations.controller';

@Module({
  imports: [AuthModule],
  controllers: [InvitationsController, PublicInvitationsController],
  providers: [InvitationsService, InvitationDeliveryService],
})
export class InvitationsModule {}
