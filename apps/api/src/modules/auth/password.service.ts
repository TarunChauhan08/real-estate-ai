import { Injectable, type OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Argon2id password hashing with OWASP-recommended parameters
 * (19 MiB memory, 2 iterations, 1 lane).
 */
@Injectable()
export class PasswordService implements OnModuleInit {
  private static readonly OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  } as const;

  /** Hash used to keep login timing uniform when the email does not exist. */
  private dummyHash = '';

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hash('timing-equalisation-placeholder');
  }

  hash(password: string): Promise<string> {
    return argon2.hash(password, PasswordService.OPTIONS);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /** Performs a verification of comparable cost so missing accounts are not revealed by timing. */
  async verifyAgainstDummy(password: string): Promise<false> {
    if (this.dummyHash) await this.verify(this.dummyHash, password);
    return false;
  }
}
