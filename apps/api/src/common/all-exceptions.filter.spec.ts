import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter';

function run(exception: unknown) {
  const reply = jest.fn();
  const filter = new AllExceptionsFilter({ httpAdapter: { reply } } as unknown as HttpAdapterHost);
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'PATCH', path: '/api/employees/1', requestId: 'req-12345678' }),
      getResponse: () => ({}),
    }),
  };
  filter.catch(exception, host as never);
  const [, body, status] = reply.mock.calls[0] as [unknown, Record<string, unknown>, number];
  return { body, status };
}

describe('AllExceptionsFilter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('passes our own http errors through in the standard shape', () => {
    expect(run(new NotFoundException('Employee not found'))).toEqual({
      status: 404,
      body: { statusCode: 404, message: 'Employee not found' },
    });
    const withFields = run(
      new BadRequestException({ message: 'Validation failed', errors: { email: ['Bad'] } }),
    );
    expect(withFields.body).toEqual({
      statusCode: 400,
      message: 'Validation failed',
      errors: { email: ['Bad'] },
    });
  });

  it('turns database rule errors into friendly ones with the field', () => {
    const { status, body } = run({
      name: 'DriverAdapterError',
      cause: {
        originalCode: '23514',
        originalMessage: 'this change would create a reporting loop',
      },
    });
    expect(status).toBe(400);
    expect(body.errors).toEqual({
      managerId: [expect.stringContaining('reports to the employee')],
    });
  });

  it('handles bad request bodies before they reach our code', () => {
    expect(
      run(Object.assign(new Error('too big'), { type: 'entity.too.large', status: 413 })),
    ).toMatchObject({ status: 413 });
    expect(
      run(Object.assign(new Error('bad json'), { type: 'entity.parse.failed', status: 400 })),
    ).toMatchObject({
      status: 400,
      body: { statusCode: 400, message: 'The request body is not valid JSON.' },
    });
  });

  it('hides unexpected errors and logs them without their message', () => {
    const logged: string[] = [];
    jest.spyOn(Logger.prototype, 'error').mockImplementation((message: unknown) => {
      logged.push(String(message));
    });
    const leaky = Object.assign(
      new Error('Failing row contains (EMP-0007, Ruan, 76000.00, 1990-02-02)'),
      { code: 'XX000' },
    );

    const { status, body } = run(leaky);

    expect(status).toBe(500);
    expect(body.message).toBe('Something went wrong on our side. Please try again.');
    expect(JSON.stringify(body)).not.toMatch(/76000|Ruan/);
    expect(logged.join('\n')).toContain(
      'PATCH /api/employees/1 [req-12345678] -> 500 unexpected Error (XX000)',
    );
    expect(logged.join('\n')).not.toMatch(/76000|Ruan|1990/);
  });
});
