import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ page: z.coerce.number().min(1) }).strict());

  it('passes clean input through, converted', () => {
    expect(pipe.transform({ page: '2' })).toEqual({ page: 2 });
  });

  it('lists each problem by field', () => {
    try {
      pipe.transform({ page: '0', sneaky: 'x' });
      throw new Error('should have failed');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const body = (error as BadRequestException).getResponse() as {
        errors: Record<string, string[]>;
      };
      expect(Object.keys(body.errors)).toEqual(['page', '_']);
      expect(body.errors._?.[0]).toMatch(/sneaky/);
    }
  });
});
