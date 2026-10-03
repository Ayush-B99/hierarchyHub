import { BadRequestException, type PipeTransform } from '@nestjs/common';

interface Schema<T> {
  safeParse(value: unknown):
    | { success: true; data: T }
    | {
        success: false;
        error: {
          flatten(): { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
        };
      };
}

/**
 * checks request input with one of the shared zod schemas (adr 0005), so the api and the
 * web forms agree on every rule. anything that fails becomes a 400 listing each field's problem
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: Schema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const { fieldErrors, formErrors } = result.error.flatten();
    const errors = Object.fromEntries(
      Object.entries(fieldErrors).filter((entry): entry is [string, string[]] =>
        Boolean(entry[1]?.length),
      ),
    );
    // unknown keys show up as form errors, list them under their own heading
    if (formErrors.length) errors._ = formErrors;
    throw new BadRequestException({ message: 'Validation failed', errors });
  }
}
