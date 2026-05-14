import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ElementPlus from 'element-plus';
import App from '../App.vue';

const api = vi.hoisted(() => ({
  clearToken: vi.fn(),
  createLicense: vi.fn(),
  createPlan: vi.fn(),
  createProduct: vi.fn(),
  getToken: vi.fn(),
  listLicenses: vi.fn(),
  listPlans: vi.fn(),
  listProducts: vi.fn(),
  login: vi.fn(),
  updateLicenseStatus: vi.fn(),
}));

vi.mock('../api', () => api);

beforeEach(() => {
  vi.clearAllMocks();
  api.listProducts.mockResolvedValue([{ id: 1, productCode: 'demo_app', name: 'Demo App', status: 'active' }]);
  api.listPlans.mockResolvedValue([{ id: 1, productId: 1, planCode: 'basic', name: 'Basic', status: 'active', durationDays: 365, maxDevices: 1, maxConcurrency: 1, graceHours: 24, featureFlags: {} }]);
  api.listLicenses.mockResolvedValue([{ id: 1, productId: 1, planId: 1, licenseKey: 'DEMO-AAAA-BBBB-CCCC', status: 'active' }]);
});

describe('App', () => {
  it('renders login form when no token exists', () => {
    api.getToken.mockReturnValue(null);
    const wrapper = mount(App, { global: { plugins: [ElementPlus] } });

    expect(wrapper.text()).toContain('授权系统管理端');
    expect(wrapper.text()).toContain('使用 Admin 账号登录后管理产品、套餐和 License。');
  });

  it('loads admin resources when token exists', async () => {
    api.getToken.mockReturnValue('token');
    const wrapper = mount(App, { global: { plugins: [ElementPlus] } });
    await flushPromises();

    expect(api.listProducts).toHaveBeenCalled();
    expect(api.listPlans).toHaveBeenCalled();
    expect(api.listLicenses).toHaveBeenCalled();
    expect(wrapper.text()).toContain('通用授权系统管理端');
    expect(wrapper.text()).toContain('产品');
    expect(wrapper.text()).toContain('套餐');
    expect(wrapper.text()).toContain('License');
  });
});
