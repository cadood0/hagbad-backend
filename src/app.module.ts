import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from './modules/auth/auth.module';
import { GroupsModule } from './modules/groups/groups.module';
import { CyclesModule } from './modules/cycles/cycles.module';
import { ContributionsModule } from './modules/contributions/contributions.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AdminModule } from './modules/admin/admin.module';
import { GroupInvitationsModule } from './modules/group-invitations/group-invitations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ActivityLogModule,
    GroupsModule,
    CyclesModule,
    ContributionsModule,
    WalletModule,
    AdminModule,
    GroupInvitationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
