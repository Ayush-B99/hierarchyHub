import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { SignedInAccount, SignedInRequest } from './auth.types';

export const IS_PUBLIC = 'isPublic';
export const ADMIN_ONLY = 'adminOnly';

/** a route anyone can use without signing in, eg health checks and the sign in form itself */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** a route only admins can use */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY, true);

/** the signed in account making the request */
export const CurrentAccount = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SignedInAccount =>
    context.switchToHttp().getRequest<SignedInRequest>().account,
);
