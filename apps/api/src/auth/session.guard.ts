import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import type { SignedInRequest } from './auth.types';
import { ADMIN_ONLY, IS_PUBLIC } from './decorators';
import { tokenFrom } from './session-cookie';

/**
 * every route needs a signed in, approved account unless it's marked @Public()
 * on by default, so a new endpoint can't be left open by forgetting a decorator
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const request = context.switchToHttp().getRequest<SignedInRequest>();
    const token = tokenFrom(request);
    const account = token ? await this.auth.whoIs(token) : null;
    if (!account) throw new UnauthorizedException('Please sign in.');
    request.account = account;

    if (this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY, targets) && !account.isAdmin) {
      throw new ForbiddenException('Only admins can do that.');
    }
    return true;
  }
}
