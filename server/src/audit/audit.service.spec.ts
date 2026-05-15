import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('redacts sensitive values before writing activation logs', async () => {
    const prisma = {
      activationLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    } as any;
    const service = new AuditService(prisma);

    await service.activation({
      resultCode: 'OK',
      message: 'activated',
      requestPayload: {
        productCode: 'demo',
        licenseKey: 'LIC-SECRET-123456',
        nested: {
          leaseToken: 'LEASE-TOKEN-SECRET',
          password: 'password-secret',
        },
      },
    });

    expect(prisma.activationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestPayload: {
          productCode: 'demo',
          licenseKey: 'LIC-...3456',
          nested: {
            leaseToken: 'LEAS...CRET',
            password: 'pass...cret',
          },
        },
      }),
    });
  });
});
