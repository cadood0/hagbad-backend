import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    console.log('DATABASE_URL =', connectionString);

    if (!connectionString) throw new Error('DATABASE_URL is missing');

    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }
}