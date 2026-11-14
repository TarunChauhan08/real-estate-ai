import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { type ApiSuccess, type PaginationMeta } from '@rea/shared-types';
import { type Observable, map } from 'rxjs';

/** Return this from a handler to emit `{ data, meta }` with pagination metadata. */
export class Paginated<T> {
  constructor(
    readonly items: T[],
    readonly meta: PaginationMeta,
  ) {}

  static of<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
    return new Paginated(items, {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  }
}

/** Wraps every successful handler result in the standard `{ data }` envelope. */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiSuccess<unknown> | undefined> {
    return next.handle().pipe(
      map((result: unknown) => {
        if (result === undefined) return undefined;
        if (result instanceof Paginated) return { data: result.items, meta: result.meta };
        return { data: result };
      }),
    );
  }
}
