import { ExecutionContext } from '@nestjs/common';
import { AdminStatus } from '@prisma/client';
import { ErrorCode } from '../../common/error-codes';
import { AdminAuthGuard } from './admin-auth.guard';

function contextFor(request: unknown) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

function createGuard(admin: { id?: number; username?: string; roleCode?: string; tenantId?: number | null; status?: AdminStatus; passwordChangedAt?: Date | null } | null, roles?: string[]) {
  const jwt = {
    verifyAsync: jest.fn().mockResolvedValue({ sub: admin?.id ?? 1, username: admin?.username ?? 'admin', roleCode: admin?.roleCode ?? 'viewer' }),
  };
  const prisma = {
    admin: {
      findUnique: jest.fn().mockResolvedValue(admin),
    },
  };
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(roles),
  };
  return { guard: new AdminAuthGuard(jwt as any, prisma as any, reflector as any), jwt, prisma, reflector };
}

describe('AdminAuthGuard', () => {
  it('allows viewer read requests and attaches fresh database role context', async () => {
    const { guard } = createGuard({
      id: 7,
      username: 'viewer',
      roleCode: 'viewer',
      tenantId: 3,
      status: AdminStatus.active,
      passwordChangedAt: new Date(),
    });
    const request = { method: 'GET', path: '/admin/products', headers: { authorization: 'Bearer token' } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request).toMatchObject({ admin: { sub: 7, username: 'viewer', roleCode: 'viewer', tenantId: 3 } });
  });

  it('rejects viewer write requests by default', async () => {
    const { guard } = createGuard({
      id: 8,
      username: 'viewer',
      roleCode: 'viewer',
      tenantId: null,
      status: AdminStatus.active,
      passwordChangedAt: new Date(),
    });
    const request = { method: 'POST', path: '/admin/products', headers: { authorization: 'Bearer token' } };

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN });
  });

  it('allows viewer write requests when a handler explicitly allows viewer', async () => {
    const { guard } = createGuard({
      id: 9,
      username: 'viewer',
      roleCode: 'viewer',
      tenantId: null,
      status: AdminStatus.active,
      passwordChangedAt: new Date(),
    }, ['super_admin', 'operator', 'viewer']);
    const request = { method: 'POST', path: '/admin/auth/change-password', headers: { authorization: 'Bearer token' } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
  });

  it('rejects disabled admins even when the token is valid', async () => {
    const { guard } = createGuard({
      id: 10,
      username: 'operator',
      roleCode: 'operator',
      tenantId: null,
      status: AdminStatus.disabled,
      passwordChangedAt: new Date(),
    });
    const request = { method: 'GET', path: '/admin/products', headers: { authorization: 'Bearer token' } };

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({ code: ErrorCode.UNAUTHORIZED });
  });
});
