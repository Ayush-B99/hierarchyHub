import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import {
  signInSchema,
  signUpSchema,
  type Me,
  type SignInInput,
  type SignUpInput,
} from '@hierarchy-hub/shared';
import type { Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import type { SignedInAccount } from './auth.types';
import { CurrentAccount, Public } from './decorators';
import { cookieOptions, SESSION_COOKIE } from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.ACCEPTED)
  async signUp(@Body(new ZodValidationPipe(signUpSchema)) input: SignUpInput) {
    return { message: await this.auth.signUp(input) };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body(new ZodValidationPipe(signInSchema)) input: SignInInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Me> {
    const { token, me } = await this.auth.signIn(input);
    res.cookie(
      SESSION_COOKIE,
      token,
      cookieOptions(this.auth.secureCookie, this.auth.cookieMaxAgeMs),
    );
    res.setHeader('Cache-Control', 'no-store');
    return me;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(
    @CurrentAccount() account: SignedInAccount,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.signOut(account);
    res.clearCookie(SESSION_COOKIE, cookieOptions(this.auth.secureCookie, 0));
  }

  @Get('me')
  me(@CurrentAccount() account: SignedInAccount, @Res({ passthrough: true }) res: Response): Me {
    res.setHeader('Cache-Control', 'no-store');
    const { sessionId: _session, ...me } = account;
    return me;
  }
}
