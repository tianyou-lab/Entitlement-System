import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ElementPlus from 'element-plus';
import App from '../App.vue';

const api = vi.hoisted(() => ({
  changePassword: vi.fn(),
  clearToken: vi.fn(),
  createAdmin: vi.fn(),
  createCardKey: vi.fn(),
  createChannel: vi.fn(),
  createDeviceUnbindRequest: vi.fn(),
  createLicense: vi.fn(),
  createOfflinePackage: vi.fn(),
  createPlan: vi.fn(),
  createProduct: vi.fn(),
  createProtectorAdapter: vi.fn(),
  createRiskEvent: vi.fn(),
  createTenant: vi.fn(),
  createVersionPolicy: vi.fn(),
  deleteCardKey: vi.fn(),
  deleteProduct: vi.fn(),
  getMonitoringMetrics: vi.fn(),
  getRiskSummary: vi.fn(),
  getToken: vi.fn(),
  listActivationLogs: vi.fn(),
  listAdmins: vi.fn(),
  listAuditLogs: vi.fn(),
  listCardKeys: vi.fn(),
  listChannels: vi.fn(),
  listDeviceUnbindRequests: vi.fn(),
  listDevices: vi.fn(),
  listHeartbeatLogs: vi.fn(),
  listLicenses: vi.fn(),
  listOfflinePackages: vi.fn(),
  listPlans: vi.fn(),
  listProducts: vi.fn(),
  listProtectorAdapters: vi.fn(),
  listRiskEvents: vi.fn(),
  listTenants: vi.fn(),
  listVersionPolicies: vi.fn(),
  login: vi.fn(),
  reviewDeviceUnbindRequest: vi.fn(),
  updateAdminRole: vi.fn(),
  updateAdminStatus: vi.fn(),
  updateCardKeyStatus: vi.fn(),
  updateChannelStatus: vi.fn(),
  updateDeviceStatus: vi.fn(),
  updateLicenseStatus: vi.fn(),
  updateOfflinePackageStatus: vi.fn(),
  updateProduct: vi.fn(),
  updateProtectorAdapterStatus: vi.fn(),
  updateRiskEventStatus: vi.fn(),
  updateVersionPolicy: vi.fn(),
}));

vi.mock('../api', () => api);

beforeEach(() => {
  vi.clearAllMocks();
  api.listProducts.mockResolvedValue([{ id: 1, productCode: 'demo_app', name: 'Demo App', status: 'active' }]);
  api.listAdmins.mockResolvedValue([]);
  api.listPlans.mockResolvedValue([{ id: 1, productId: 1, planCode: 'basic', name: 'Basic', status: 'active', durationDays: 365, maxDevices: 1, maxConcurrency: 1, graceHours: 24, featureFlags: {} }]);
  api.listLicenses.mockResolvedValue([{ id: 1, productId: 1, planId: 1, licenseKey: 'DEMO-AAAA-BBBB-CCCC', status: 'active' }]);
  api.listDevices.mockResolvedValue([]);
  api.listActivationLogs.mockResolvedValue([]);
  api.listHeartbeatLogs.mockResolvedValue([]);
  api.listAuditLogs.mockResolvedValue([]);
  api.listVersionPolicies.mockResolvedValue([]);
  api.listTenants.mockResolvedValue([]);
  api.listChannels.mockResolvedValue([]);
  api.listCardKeys.mockResolvedValue([]);
  api.listOfflinePackages.mockResolvedValue([]);
  api.listRiskEvents.mockResolvedValue([]);
  api.getRiskSummary.mockResolvedValue({ total: 0, open: 0, high: 0, resolved: 0 });
  api.getMonitoringMetrics.mockResolvedValue({
    api: {
      startedAt: new Date().toISOString(),
      uptimeSeconds: 0,
      requests: { total: 0, failures: 0, failureRate: 0, averageLatencyMs: 0, maxLatencyMs: 0 },
      errorCodes: {},
      routes: [],
    },
    postgres: { connections: null, databaseSizeBytes: null },
  });
  api.listDeviceUnbindRequests.mockResolvedValue([]);
  api.listProtectorAdapters.mockResolvedValue([]);
});

describe('App', () => {
  it('renders login form when no token exists', () => {
    api.getToken.mockReturnValue(null);
    const wrapper = mount(App, { global: { plugins: [ElementPlus] } });

    expect(wrapper.text()).toContain('卡密授权验证系统');
    expect(wrapper.text()).toContain('授权运营管理后台');
    expect(wrapper.text()).toContain('管理员登录');
  });

  it('loads admin resources when token exists', async () => {
    api.getToken.mockReturnValue('token');
    const wrapper = mount(App, { global: { plugins: [ElementPlus] } });
    await flushPromises();

    expect(api.listProducts).toHaveBeenCalled();
    expect(api.listPlans).toHaveBeenCalled();
    expect(api.listLicenses).toHaveBeenCalled();
    expect(wrapper.text()).toContain('授权与卡密管理后台');
    expect(wrapper.text()).toContain('产品管理');
    expect(wrapper.text()).toContain('签名密钥匹配矩阵');
    expect(wrapper.text()).toContain('PUBLIC_API_SIGNING_SECRETS');
  });
});
