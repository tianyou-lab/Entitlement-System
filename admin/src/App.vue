<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Bell, Box, Connection, Cpu, DataAnalysis, Document, Download, Key, Link, Monitor, Refresh, Setting, SwitchButton, TrendCharts } from '@element-plus/icons-vue';
import { changePassword, clearToken, createAdmin, createCardKey, createChannel, createDeviceUnbindRequest, createLicense, createOfflinePackage, createPlan, createProduct, createProtectorAdapter, createRiskEvent, createTenant, createVersionPolicy, deleteCardKey, deleteProduct, getMonitoringMetrics, getRiskSummary, getToken, listActivationLogs, listAdmins, listAuditLogs, listCardKeys, listChannels, listDeviceUnbindRequests, listDevices, listHeartbeatLogs, listLicenses, listOfflinePackages, listPlans, listProducts, listProtectorAdapters, listRiskEvents, listTenants, listVersionPolicies, login, reviewDeviceUnbindRequest, updateAdminRole, updateAdminStatus, updateCardKeyStatus, updateChannelStatus, updateDeviceStatus, updateLicenseStatus, updateOfflinePackageStatus, updatePlan, updateProduct, updateProtectorAdapterStatus, updateRiskEventStatus, updateVersionPolicy } from './api';
import type { ActivationLog, AdminAccount, AuditLog, CardKey, Channel, CreateAdminInput, CreateCardKeyInput, CreateChannelInput, CreateDeviceUnbindRequestInput, CreateLicenseInput, CreateOfflinePackageInput, CreatePlanInput, CreateProductInput, CreateProtectorAdapterInput, CreateRiskEventInput, CreateTenantInput, CreateVersionPolicyInput, Device, DeviceBindingPolicy, DeviceUnbindRequest, HeartbeatLog, License, MonitoringMetrics, OfflinePackage, Plan, Product, ProductRequestSigningSecret, ProtectorAdapter, RiskEvent, RiskSummary, Tenant, VersionPolicy } from './types';

const navItems = [
  { id: 'console', label: '运营控制台', summary: '查看授权、卡密、设备和风险的整体运营态势', icon: DataAnalysis },
  { id: 'products', label: '产品管理', summary: '创建产品并自动生成防重复产品 Key', icon: Box },
  { id: 'plans', label: '套餐配置', summary: '设置绑定设备数、在线并发数和多设备登录策略', icon: Setting },
  { id: 'cardKeys', label: '授权管理', summary: '按产品和时长类型生成、复制、导出授权码', icon: Key },
  { id: 'devices', label: '设备绑定', summary: '查看绑定设备并处理启用、移除和封禁', icon: Monitor },
  { id: 'versions', label: '版本策略', summary: '维护最低版本、最新版本和强制升级策略', icon: TrendCharts },
  { id: 'risk', label: '风控面板', summary: '跟踪风险事件、级别和处理状态', icon: DataAnalysis },
  { id: 'monitoring', label: '监控告警', summary: '查看 API 请求、失败率、延迟和数据库运行指标', icon: TrendCharts },
  { id: 'offline', label: '离线与解绑', summary: '创建离线授权包并审核解绑申请', icon: Connection },
  { id: 'protectors', label: '保护器适配', summary: '维护加壳和保护器适配器配置', icon: Cpu },
  { id: 'sdk', label: 'SDK 接入', summary: '下载客户端 SDK 并查看 Electron、C++、.NET 接入步骤', icon: Download },
  { id: 'logs', label: '运行日志', summary: '审计激活、心跳和后台操作记录', icon: Document },
] as const;

type AdminSection = typeof navItems[number]['id'] | 'plans' | 'admins' | 'channels' | 'licenses';
const githubBaseUrl = 'https://github.com/tianyou-lab/Entitlement-System';
const sdkResources = [
  { name: '完整源码 ZIP', description: '包含 Server、Admin、License UI、Electron/C++/.NET SDK 和 Demo', url: `${githubBaseUrl}/archive/refs/heads/main.zip`, action: '下载 ZIP' },
  { name: 'Electron SDK', description: 'TypeScript SDK，支持激活、验证、心跳、本地加密缓存和请求签名', url: `${githubBaseUrl}/tree/main/sdk-electron`, action: '查看源码' },
  { name: 'C++ SDK Demo', description: 'C++ 客户端接入示例，适合原生桌面软件集成', url: `${githubBaseUrl}/tree/main/sdk-cpp`, action: '查看源码' },
  { name: '.NET SDK', description: '.NET 8 客户端与 Demo，支持公共 API HMAC 请求签名', url: `${githubBaseUrl}/tree/main/sdk-dotnet`, action: '查看源码' },
  { name: 'License UI', description: '可嵌入授权激活界面的前端组件工程', url: `${githubBaseUrl}/tree/main/license-ui`, action: '查看源码' },
] as const;
const cardKeyDurationOptions = [
  { label: '时卡', value: 'hour' },
  { label: '天卡', value: 'day' },
  { label: '周卡', value: 'week' },
  { label: '月卡', value: 'month' },
  { label: '季卡', value: 'quarter' },
  { label: '年卡', value: 'year' },
] as const;
const deviceBindingPolicyOptions: Array<{ label: string; value: DeviceBindingPolicy; description: string }> = [
  { label: '满额拒绝新设备/新在线', value: 'deny_new', description: '绑定数或在线并发达到上限时返回 DEVICE_LIMIT_REACHED' },
  { label: '顶掉最久未活跃设备', value: 'kick_oldest', description: '绑定满额时移除旧设备；在线满额时仅撤销旧在线凭证' },
];

const token = ref(getToken());
const loading = ref(false);
const passwordChangeRequired = ref(false);
const admins = ref<AdminAccount[]>([]);
const products = ref<Product[]>([]);
const plans = ref<Plan[]>([]);
const licenses = ref<License[]>([]);
const devices = ref<Device[]>([]);
const activationLogs = ref<ActivationLog[]>([]);
const heartbeatLogs = ref<HeartbeatLog[]>([]);
const auditLogs = ref<AuditLog[]>([]);
const versionPolicies = ref<VersionPolicy[]>([]);
const tenants = ref<Tenant[]>([]);
const channels = ref<Channel[]>([]);
const cardKeys = ref<CardKey[]>([]);
const offlinePackages = ref<OfflinePackage[]>([]);
const riskEvents = ref<RiskEvent[]>([]);
const riskSummary = ref<RiskSummary>({ total: 0, open: 0, high: 0, resolved: 0 });
const monitoringMetrics = ref<MonitoringMetrics>(emptyMonitoringMetrics());
const unbindRequests = ref<DeviceUnbindRequest[]>([]);
const protectorAdapters = ref<ProtectorAdapter[]>([]);
const selectedLicenses = ref<License[]>([]);
const selectedCardKeys = ref<CardKey[]>([]);
const darkMode = ref(false);
const activeSection = ref<AdminSection>('console');
const activeLogType = ref<'activation' | 'heartbeat' | 'audit'>('activation');
const productEditorVisible = ref(false);
const editingProductId = ref<number | null>(null);

const loginForm = reactive({ username: 'admin', password: '' });
const passwordForm = reactive({ oldPassword: '', newPassword: '' });
const adminForm = reactive<CreateAdminInput>({ username: '', password: '', roleCode: 'viewer', tenantId: undefined });
const productForm = reactive<CreateProductInput>({ productCode: generateProductKey(), name: '', description: '' });
const productEditForm = reactive({ name: '', description: '' });
const planForm = reactive<CreatePlanInput>({ productId: 0, planCode: '', name: '', durationDays: 365, maxDevices: 1, maxConcurrency: 1, graceHours: 24, featureFlags: { publish: true, maxWindowCount: 20, deviceBindingPolicy: 'deny_new' } });
const planDeviceBindingPolicy = ref<DeviceBindingPolicy>('deny_new');
const licenseForm = reactive<CreateLicenseInput>({ productId: 0, planId: 0, licenseKey: '', expireAt: '', maxDevicesOverride: undefined, featureFlagsOverride: undefined, notes: '' });
const versionPolicyForm = reactive<CreateVersionPolicyInput>({ productId: 0, minSupportedVersion: '1.0.0', latestVersion: '1.0.0', forceUpgrade: false, downloadUrl: '', notice: '' });
const tenantForm = reactive<CreateTenantInput>({ tenantCode: '', name: '', contactEmail: '' });
const channelForm = reactive<CreateChannelInput>({ tenantId: undefined, channelCode: '', name: '', contact: '', notes: '' });
const cardKeyForm = reactive<CreateCardKeyInput>({ tenantId: undefined, productId: 0, planId: 0, channelId: undefined, cardKey: '', batchCode: '' });
const cardKeyDurationType = ref<typeof cardKeyDurationOptions[number]['value']>('day');
const cardKeyQuantity = ref(1);
const cardKeyDurationHours = ref(1);
const offlinePackageForm = reactive<CreateOfflinePackageInput>({ tenantId: undefined, licenseId: 0, deviceId: undefined, packageCode: '', expireAt: nextYearIso() });
const riskEventForm = reactive<CreateRiskEventInput>({ tenantId: undefined, licenseId: undefined, deviceId: undefined, eventType: 'manual_review', severity: 'medium', summary: '' });
const unbindRequestForm = reactive<CreateDeviceUnbindRequestInput>({ licenseId: 0, deviceId: 0, reason: '' });
const protectorAdapterForm = reactive<CreateProtectorAdapterInput>({ tenantId: undefined, productId: undefined, adapterCode: '', name: '', notes: '' });

const isAuthenticated = computed(() => Boolean(token.value));
const activeLicenses = computed(() => licenses.value.filter((license) => license.status === 'active').length);
const disabledLicenses = computed(() => licenses.value.filter((license) => license.status === 'banned' || license.status === 'suspended' || license.status === 'inactive').length);
const activeCardKeys = computed(() => cardKeys.value.filter((cardKey) => cardKey.status === 'unused' || cardKey.status === 'issued').length);
const productNameColumnWidth = computed(() => {
  const longestNameLength = Math.max(0, ...cardKeys.value.map((cardKey) => cardKey.product?.name?.length ?? 0));
  return Math.min(150, Math.max(90, longestNameLength * 14 + 42));
});
const onlineDevices = computed(() => devices.value.filter((device) => device.status === 'active').length);
const openRisks = computed(() => riskSummary.value.open);
const activeNavItem = computed(() => navItems.find((item) => item.id === activeSection.value) ?? navItems[0]);
const topErrorCodes = computed(() => Object.entries(monitoringMetrics.value.api.errorCodes).sort((left, right) => right[1] - left[1]).slice(0, 8));
const activeProducts = computed(() => products.value.filter((product) => product.status === 'active').length);
const productsMissingPolicy = computed(() => products.value.filter((product) => !versionPolicies.value.some((policy) => policy.productId === product.id)).length);
const pendingUnbindRequests = computed(() => unbindRequests.value.filter((request) => request.status === 'pending').length);
const activeOfflinePackages = computed(() => offlinePackages.value.filter((item) => item.status === 'active').length);
const forcedUpgradePolicies = computed(() => versionPolicies.value.filter((policy) => policy.forceUpgrade).length);
const requestFailureRate = computed(() => monitoringMetrics.value.api.requests.failureRate);
const signingMode = computed(() => '产品/版本级密钥');
const clientApiBaseUrl = computed(() => {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return (configured ? new URL(configured, window.location.origin).toString() : window.location.origin).replace(/\/$/, '');
});
const consoleHealthItems = computed(() => [
  {
    label: '产品版本策略覆盖',
    value: productsMissingPolicy.value === 0 ? '正常' : `${productsMissingPolicy.value} 个产品缺失`,
    status: productsMissingPolicy.value === 0 ? 'success' : 'warning',
    detail: `${versionPolicies.value.length} 条版本策略 / ${products.value.length} 个产品`,
  },
  {
    label: '请求签名隔离',
    value: signingMode.value,
    status: 'success',
    detail: '服务端按 productCode + appVersion 精确匹配 secret',
  },
  {
    label: '公共 API 健康',
    value: percent(requestFailureRate.value),
    status: requestFailureRate.value > 0.05 ? 'danger' : requestFailureRate.value > 0.01 ? 'warning' : 'success',
    detail: `${monitoringMetrics.value.api.requests.total} 次请求 / 平均 ${monitoringMetrics.value.api.requests.averageLatencyMs} ms`,
  },
  {
    label: '待处理队列',
    value: String(openRisks.value + pendingUnbindRequests.value),
    status: openRisks.value || pendingUnbindRequests.value ? 'warning' : 'success',
    detail: `风险 ${openRisks.value} / 解绑 ${pendingUnbindRequests.value}`,
  },
]);
const productVersionRows = computed(() => products.value.map((product) => {
  const policy = versionPolicies.value.find((item) => item.productId === product.id);
  const productLicenses = licenses.value.filter((license) => license.productId === product.id);
  const productDevices = devices.value.filter((device) => device.license?.productId === product.id || productLicenses.some((license) => license.id === device.licenseId));
  const appVersions = Array.from(new Set(productDevices.map((device) => device.appVersion).filter(Boolean))).sort(compareVersionDesc);
  return {
    id: product.id,
    product,
    policy,
    activeLicenses: productLicenses.filter((license) => license.status === 'active').length,
    activeDevices: productDevices.filter((device) => device.status === 'active').length,
    observedVersions: appVersions.slice(0, 3).join(', ') || '-',
    signingScope: policy ? `${product.productCode} / ${policy.latestVersion}` : `${product.productCode} / 未配置版本`,
  };
}));
const consoleQueueRows = computed(() => [
  { label: '待处理风险', value: openRisks.value, detail: `高危 ${riskSummary.value.high}` },
  { label: '解绑审核', value: pendingUnbindRequests.value, detail: `${unbindRequests.value.length} 条总申请` },
  { label: '活跃离线包', value: activeOfflinePackages.value, detail: `${offlinePackages.value.length} 个离线包` },
  { label: '强制升级策略', value: forcedUpgradePolicies.value, detail: `${versionPolicies.value.length} 条版本策略` },
]);

function statusText(status?: string | boolean) {
  if (typeof status === 'boolean') return status ? '是' : '否';
  const map: Record<string, string> = {
    active: '正常',
    inactive: '停用',
    expired: '已过期',
    banned: '已封禁',
    suspended: '已暂停',
    removed: '已移除',
    unused: '未使用',
    issued: '已发放',
    redeemed: '已兑换',
    disabled: '已禁用',
    super_admin: '超级管理员',
    operator: '运营人员',
    viewer: '只读人员',
    revoked: '已撤销',
    open: '待处理',
    resolved: '已解决',
    ignored: '已忽略',
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    low: '低',
    medium: '中',
    high: '高',
  };
  return status ? (map[status] ?? status) : '-';
}

function statusTagType(status?: string | boolean) {
  if (status === true || status === 'active' || status === 'unused' || status === 'resolved' || status === 'approved') return 'success';
  if (status === 'issued' || status === 'pending' || status === 'medium') return 'warning';
  if (status === 'banned' || status === 'disabled' || status === 'revoked' || status === 'high' || status === 'rejected') return 'danger';
  if (status === 'expired' || status === 'suspended' || status === 'removed') return 'info';
  return undefined;
}

onMounted(async () => {
  if (isAuthenticated.value) await refreshAll();
});

async function submitLogin() {
  loading.value = true;
  try {
    const result = await login(loginForm.username, loginForm.password);
    token.value = result.accessToken;
    passwordChangeRequired.value = result.passwordChangeRequired;
    passwordForm.oldPassword = loginForm.password;
    ElMessage.success(`欢迎 ${result.admin.username}`);
    if (!result.passwordChangeRequired) await refreshAll();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败');
  } finally {
    loading.value = false;
  }
}

async function refreshAll() {
  loading.value = true;
  try {
    const [nextAdmins, nextProducts, nextPlans, nextLicenses, nextDevices, nextActivationLogs, nextHeartbeatLogs, nextAuditLogs, nextVersionPolicies, nextTenants, nextChannels, nextCardKeys, nextOfflinePackages, nextRiskEvents, nextRiskSummary, nextMonitoringMetrics, nextUnbindRequests, nextProtectorAdapters] = await Promise.all([
      listAdmins().catch(() => []),
      listProducts(),
      listPlans(),
      listLicenses(),
      listDevices(),
      listActivationLogs(),
      listHeartbeatLogs(),
      listAuditLogs(),
      listVersionPolicies(),
      listTenants(),
      listChannels(),
      listCardKeys(),
      listOfflinePackages(),
      listRiskEvents(),
      getRiskSummary(),
      getMonitoringMetrics(),
      listDeviceUnbindRequests(),
      listProtectorAdapters(),
    ]);
    admins.value = nextAdmins;
    products.value = nextProducts;
    plans.value = nextPlans;
    licenses.value = nextLicenses;
    devices.value = nextDevices;
    activationLogs.value = nextActivationLogs;
    heartbeatLogs.value = nextHeartbeatLogs;
    auditLogs.value = nextAuditLogs;
    versionPolicies.value = nextVersionPolicies;
    tenants.value = nextTenants;
    channels.value = nextChannels;
    cardKeys.value = nextCardKeys;
    offlinePackages.value = nextOfflinePackages;
    riskEvents.value = nextRiskEvents;
    riskSummary.value = nextRiskSummary;
    monitoringMetrics.value = nextMonitoringMetrics;
    unbindRequests.value = nextUnbindRequests;
    protectorAdapters.value = nextProtectorAdapters;
    if (!planForm.productId && nextProducts[0]) planForm.productId = nextProducts[0].id;
    if (!licenseForm.productId && nextProducts[0]) licenseForm.productId = nextProducts[0].id;
    if (!licenseForm.planId && nextPlans[0]) licenseForm.planId = nextPlans[0].id;
    if (!versionPolicyForm.productId && nextProducts[0]) versionPolicyForm.productId = nextProducts[0].id;
    if (!cardKeyForm.productId && nextProducts[0]) cardKeyForm.productId = nextProducts[0].id;
    if (!cardKeyForm.planId && nextPlans[0]) cardKeyForm.planId = nextPlans[0].id;
    if (!adminForm.tenantId && nextTenants[0]) adminForm.tenantId = nextTenants[0].id;
    if (!offlinePackageForm.licenseId && nextLicenses[0]) offlinePackageForm.licenseId = nextLicenses[0].id;
    if (!unbindRequestForm.licenseId && nextLicenses[0]) unbindRequestForm.licenseId = nextLicenses[0].id;
    if (!unbindRequestForm.deviceId && nextDevices[0]) unbindRequestForm.deviceId = nextDevices[0].id;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载失败');
  } finally {
    loading.value = false;
  }
}

async function submitAdmin() {
  await withMessage('管理员已创建', async () => {
    await createAdmin({ ...adminForm, tenantId: optionalId(adminForm.tenantId) });
    adminForm.username = '';
    adminForm.password = '';
    adminForm.roleCode = 'viewer';
    await refreshAll();
  });
}

async function changeAdminStatus(row: AdminAccount, status: AdminAccount['status']) {
  await withMessage('管理员状态已更新', async () => {
    await updateAdminStatus(row.id, status);
    await refreshAll();
  });
}

async function changeAdminRole(row: AdminAccount, roleCode: AdminAccount['roleCode']) {
  await withMessage('管理员角色已更新', async () => {
    await updateAdminRole(row.id, roleCode);
    await refreshAll();
  });
}

function emptyMonitoringMetrics(): MonitoringMetrics {
  return {
    api: {
      startedAt: '',
      uptimeSeconds: 0,
      requests: { total: 0, failures: 0, failureRate: 0, averageLatencyMs: 0, maxLatencyMs: 0 },
      errorCodes: {},
      routes: [],
    },
    postgres: {
      connections: null,
      databaseSizeBytes: null,
    },
  };
}

function percent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatBytes(value: number | null) {
  if (value === null) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function compareVersionDesc(left: string, right: string) {
  return right.localeCompare(left, undefined, { numeric: true, sensitivity: 'base' });
}

function queueTagType(value: number) {
  return value > 0 ? 'warning' : 'success';
}

function generateProductKey() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  const random = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `prd_${random}`;
}

function refreshProductKey() {
  const existingKeys = new Set(products.value.map((product) => product.productCode));
  let nextKey = generateProductKey();
  while (existingKeys.has(nextKey)) nextKey = generateProductKey();
  productForm.productCode = nextKey;
}

async function submitProduct() {
  await withMessage('产品已创建', async () => {
    if (!productForm.productCode) refreshProductKey();
    await createProduct({ ...productForm });
    refreshProductKey();
    productForm.name = '';
    productForm.description = '';
    await refreshAll();
  });
}

function openProductEditor(product: Product) {
  editingProductId.value = product.id;
  productEditForm.name = product.name;
  productEditForm.description = product.description ?? '';
  productEditorVisible.value = true;
}

async function submitProductEdit() {
  if (!editingProductId.value) return;
  await withMessage('产品已更新', async () => {
    await updateProduct(editingProductId.value as number, { name: productEditForm.name, description: productEditForm.description });
    productEditorVisible.value = false;
    editingProductId.value = null;
    await refreshAll();
  });
}

async function toggleProductStatus(product: Product) {
  const nextStatus = product.status === 'active' ? 'inactive' : 'active';
  const message = nextStatus === 'active' ? '产品已启用' : '产品已停用';
  await withMessage(message, async () => {
    await updateProduct(product.id, { status: nextStatus });
    await refreshAll();
  });
}

async function removeProduct(product: Product) {
  try {
    await ElMessageBox.confirm(`确认移除产品「${product.name}」？关联的套餐、授权码、设备、日志和版本策略会一并删除。`, '移除产品', {
      confirmButtonText: '移除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await withMessage('产品已移除', async () => {
    await deleteProduct(product.id);
    await refreshAll();
  });
}

async function submitPlan() {
  await withMessage('套餐已创建', async () => {
    await createPlan({ ...planForm, featureFlags: { ...parseJson(planFlagsText.value), deviceBindingPolicy: planDeviceBindingPolicy.value } });
    planForm.planCode = '';
    planForm.name = '';
    await refreshAll();
  });
}

async function updatePlanDevicePolicy(plan: Plan, policy: DeviceBindingPolicy) {
  await withMessage('设备绑定策略已更新', async () => {
    await updatePlan(plan.id, { featureFlags: { ...(plan.featureFlags ?? {}), deviceBindingPolicy: policy } });
    await refreshAll();
  });
}

function updatePlanDevicePolicyFromSelect(plan: Plan, value: string | number | boolean | Record<string, unknown>) {
  void updatePlanDevicePolicy(plan, value === 'kick_oldest' ? 'kick_oldest' : 'deny_new');
}

async function updatePlanDeviceLimits(plan: Plan) {
  await withMessage('设备限制已更新', async () => {
    await updatePlan(plan.id, {
      maxDevices: plan.maxDevices,
      maxConcurrency: plan.maxConcurrency,
      featureFlags: { ...(plan.featureFlags ?? {}), deviceBindingPolicy: planDeviceBindingPolicyFor(plan) },
    });
    await refreshAll();
  });
}

function planDeviceBindingPolicyFor(plan: Plan): DeviceBindingPolicy {
  return plan.featureFlags?.deviceBindingPolicy === 'kick_oldest' ? 'kick_oldest' : 'deny_new';
}

async function submitLicense() {
  await withMessage('授权码已创建', async () => {
    const created = await createLicense({
      ...licenseForm,
      licenseKey: licenseForm.licenseKey || undefined,
      expireAt: licenseForm.expireAt || undefined,
      notes: licenseForm.notes || undefined,
      featureFlagsOverride: licenseFlagsText.value.trim() ? parseJson(licenseFlagsText.value) : undefined,
    });
    if (created.licenseKey) {
      await copyText(created.licenseKey);
      ElMessage.success('授权码仅显示一次，已复制到剪贴板');
    }
    licenseForm.licenseKey = '';
    licenseForm.notes = '';
    licenseFlagsText.value = '';
    await refreshAll();
  });
}

async function changeLicenseStatus(row: License, status: License['status']) {
  await withMessage('授权码状态已更新', async () => {
    await updateLicenseStatus(row.id, status);
    await refreshAll();
  });
}

function handleLicenseSelection(rows: License[]) {
  selectedLicenses.value = rows;
}

function handleCardKeySelection(rows: CardKey[]) {
  selectedCardKeys.value = rows;
}

async function copyText(value?: string) {
  if (!value) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  ElMessage.success('已复制到剪贴板');
}

function clientConfig(product: Product, signingSecret: ProductRequestSigningSecret) {
  return {
    apiBaseUrl: clientApiBaseUrl.value,
    productCode: product.productCode,
    appVersion: signingSecret.appVersion,
    heartbeatIntervalMs: 30000,
    requestSigningSecret: signingSecret.requestSigningSecret,
  };
}

function clientConfigJson(product: Product, signingSecret: ProductRequestSigningSecret) {
  return JSON.stringify(clientConfig(product, signingSecret), null, 2);
}

function cardKeyExportRows(rows: CardKey[]) {
  return rows.map((row) => ({
    id: row.id,
    cardKey: row.cardKey,
    product: row.product?.productCode ?? row.product?.name ?? row.productId,
    plan: row.plan?.planCode ?? row.plan?.name ?? row.planId,
    status: statusText(row.status),
    license: licenseLabel(row.license),
  }));
}

function cardKeyPlainText(rows: CardKey[]) {
  return rows.map((row) => row.cardKey).filter(Boolean).join('\n');
}

async function copyCardKeys(rows: CardKey[], emptyMessage: string) {
  if (!rows.length) {
    ElMessage.warning(emptyMessage);
    return;
  }
  await copyText(cardKeyPlainText(rows));
}

function exportCardKeys(rows: CardKey[], emptyMessage: string, scope: 'all' | 'selected') {
  if (!rows.length) {
    ElMessage.warning(emptyMessage);
    return;
  }
  const headers = ['ID', '授权码', '产品', '类型', '状态', '关联授权'];
  const csvRows = cardKeyExportRows(rows).map((row) => [
    row.id,
    row.cardKey,
    row.product,
    row.plan,
    row.status,
    row.license,
  ]);
  downloadCsv(`card-keys-${scope}-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...csvRows]);
  ElMessage.success(`已导出 ${rows.length} 个授权码`);
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function licenseLabel(license?: License | null) {
  if (!license) return '-';
  return license.licenseKey ?? `License #${license.id}`;
}

async function batchBanLicenses() {
  if (!selectedLicenses.value.length) return;
  try {
    await ElMessageBox.confirm(`确认封禁选中的 ${selectedLicenses.value.length} 个授权码？`, '批量封禁确认', { type: 'warning' });
  } catch {
    return;
  }
  await withMessage('选中授权码已封禁', async () => {
    await Promise.all(selectedLicenses.value.map((license) => updateLicenseStatus(license.id, 'banned')));
    selectedLicenses.value = [];
    await refreshAll();
  });
}

async function batchDisableCardKeys() {
  if (!selectedCardKeys.value.length) return;
  try {
    await ElMessageBox.confirm(`确认禁用选中的 ${selectedCardKeys.value.length} 个授权码？`, '批量禁用确认', { type: 'warning' });
  } catch {
    return;
  }
  await withMessage('选中授权码已禁用', async () => {
    await Promise.all(selectedCardKeys.value.map((cardKey) => updateCardKeyStatus(cardKey.id, 'disabled')));
    selectedCardKeys.value = [];
    await refreshAll();
  });
}

async function changeDeviceStatus(row: Device, status: Device['status']) {
  await withMessage('设备状态已更新', async () => {
    await updateDeviceStatus(row.id, status);
    await refreshAll();
  });
}

async function submitVersionPolicy() {
  await withMessage('版本策略已创建', async () => {
    await createVersionPolicy({ ...versionPolicyForm, downloadUrl: versionPolicyForm.downloadUrl || undefined, notice: versionPolicyForm.notice || undefined });
    await refreshAll();
  });
}

async function toggleForceUpgrade(row: VersionPolicy) {
  await withMessage('强制升级策略已更新', async () => {
    await updateVersionPolicy(row.id, { forceUpgrade: !row.forceUpgrade });
    await refreshAll();
  });
}

async function submitTenant() {
  await withMessage('租户已创建', async () => {
    await createTenant({ ...tenantForm, contactEmail: tenantForm.contactEmail || undefined });
    tenantForm.tenantCode = '';
    tenantForm.name = '';
    tenantForm.contactEmail = '';
    await refreshAll();
  });
}

async function submitChannel() {
  await withMessage('渠道已创建', async () => {
    await createChannel({ ...channelForm, tenantId: optionalId(channelForm.tenantId), contact: channelForm.contact || undefined, notes: channelForm.notes || undefined });
    channelForm.channelCode = '';
    channelForm.name = '';
    channelForm.contact = '';
    channelForm.notes = '';
    await refreshAll();
  });
}

async function changeChannelStatus(row: Channel, status: Channel['status']) {
  await withMessage('渠道状态已更新', async () => {
    await updateChannelStatus(row.id, status);
    await refreshAll();
  });
}

async function submitCardKey() {
  const count = cardKeyForm.cardKey ? 1 : cardKeyQuantity.value;
  if (cardKeyForm.cardKey && cardKeyQuantity.value > 1) ElMessage.warning('自定义授权码只能生成 1 个，已按 1 个处理');
  await withMessage(`授权码已创建 ${count} 个`, async () => {
    await Promise.all(Array.from({ length: count }, () => createCardKey({
      productId: cardKeyForm.productId,
      durationType: cardKeyDurationType.value,
      durationHours: cardKeyDurationType.value === 'hour' ? cardKeyDurationHours.value : undefined,
      cardKey: cardKeyForm.cardKey || undefined,
    })));
    cardKeyForm.cardKey = '';
    cardKeyQuantity.value = 1;
    await refreshAll();
  });
}

async function changeCardKeyStatus(row: CardKey, status: CardKey['status']) {
  await withMessage('授权码状态已更新', async () => {
    await updateCardKeyStatus(row.id, status);
    await refreshAll();
  });
}

async function removeCardKey(row: CardKey) {
  try {
    await ElMessageBox.confirm(`确认移除授权码「${row.cardKey}」？`, '移除授权码', {
      confirmButtonText: '移除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await withMessage('授权码已移除', async () => {
    await deleteCardKey(row.id);
    await refreshAll();
  });
}

async function submitOfflinePackage() {
  await withMessage('离线授权包已创建', async () => {
    await createOfflinePackage({ ...offlinePackageForm, tenantId: optionalId(offlinePackageForm.tenantId), deviceId: optionalId(offlinePackageForm.deviceId), packageCode: offlinePackageForm.packageCode || undefined });
    offlinePackageForm.packageCode = '';
    await refreshAll();
  });
}

async function changeOfflinePackageStatus(row: OfflinePackage, status: OfflinePackage['status']) {
  await withMessage('离线授权包状态已更新', async () => {
    await updateOfflinePackageStatus(row.id, status);
    await refreshAll();
  });
}

async function submitRiskEvent() {
  await withMessage('风险事件已创建', async () => {
    await createRiskEvent({ ...riskEventForm, tenantId: optionalId(riskEventForm.tenantId), licenseId: optionalId(riskEventForm.licenseId), deviceId: optionalId(riskEventForm.deviceId) });
    riskEventForm.summary = '';
    await refreshAll();
  });
}

async function changeRiskEventStatus(row: RiskEvent, status: RiskEvent['status']) {
  await withMessage('风险事件状态已更新', async () => {
    await updateRiskEventStatus(row.id, status);
    await refreshAll();
  });
}

async function submitUnbindRequest() {
  await withMessage('解绑申请已创建', async () => {
    await createDeviceUnbindRequest({ ...unbindRequestForm, reason: unbindRequestForm.reason || undefined });
    unbindRequestForm.reason = '';
    await refreshAll();
  });
}

async function reviewUnbindRequest(row: DeviceUnbindRequest, status: 'approved' | 'rejected') {
  await withMessage('解绑申请已处理', async () => {
    await reviewDeviceUnbindRequest(row.id, status);
    await refreshAll();
  });
}

async function submitProtectorAdapter() {
  await withMessage('保护器适配器已创建', async () => {
    await createProtectorAdapter({ ...protectorAdapterForm, tenantId: optionalId(protectorAdapterForm.tenantId), productId: optionalId(protectorAdapterForm.productId), notes: protectorAdapterForm.notes || undefined });
    protectorAdapterForm.adapterCode = '';
    protectorAdapterForm.name = '';
    protectorAdapterForm.notes = '';
    await refreshAll();
  });
}

async function toggleProtectorAdapter(row: ProtectorAdapter) {
  await withMessage('保护器适配器状态已更新', async () => {
    await updateProtectorAdapterStatus(row.id, row.status === 'active' ? 'inactive' : 'active');
    await refreshAll();
  });
}

async function submitPasswordChange() {
  await withMessage('密码已修改', async () => {
    await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
    passwordChangeRequired.value = false;
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    await refreshAll();
  });
}

function logout() {
  clearToken();
  token.value = null;
  passwordChangeRequired.value = false;
}

const planFlagsText = ref(JSON.stringify(planForm.featureFlags, null, 2));
const licenseFlagsText = ref('');

function parseJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    throw new Error('功能开关必须是合法 JSON');
  }
}

function optionalId(value?: number) {
  return value && value > 0 ? value : undefined;
}

function nextYearIso() {
  return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
}

async function withMessage(message: string, action: () => Promise<void>) {
  loading.value = true;
  try {
    await action();
    ElMessage.success(message);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main v-if="!isAuthenticated" class="login-page">
    <section class="login-hero">
      <div class="brand-mark">KEY</div>
      <p class="eyebrow">卡密授权验证系统</p>
      <h1>授权运营管理后台</h1>
      <p>统一管理产品、套餐、授权码、卡密、设备绑定和风险风控，保障软件授权链路安全可控。</p>
      <div class="hero-pills">
        <span>授权码发放</span>
        <span>设备绑定</span>
        <span>风险审计</span>
      </div>
    </section>
    <section class="login-card">
      <h2>管理员登录</h2>
      <p>请输入生产环境管理员账号和密码。</p>
      <el-form label-position="top" @submit.prevent="submitLogin">
        <el-form-item label="管理员账号">
          <el-input v-model="loginForm.username" autocomplete="username" placeholder="admin" />
        </el-form-item>
        <el-form-item label="登录密码">
          <el-input v-model="loginForm.password" type="password" autocomplete="current-password" placeholder="请输入管理员密码" show-password />
        </el-form-item>
        <el-button type="primary" :loading="loading" native-type="submit" style="width: 100%">进入管理后台</el-button>
      </el-form>
    </section>
  </main>

  <main v-else-if="passwordChangeRequired" class="login-card password-card">
    <h1>修改默认管理员密码</h1>
    <p>首次登录后必须设置至少 12 位的新密码，以保护卡密和授权数据安全。</p>
    <el-form label-position="top" @submit.prevent="submitPasswordChange">
      <el-form-item label="旧密码">
        <el-input v-model="passwordForm.oldPassword" type="password" autocomplete="current-password" show-password />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input v-model="passwordForm.newPassword" type="password" autocomplete="new-password" show-password />
      </el-form-item>
      <el-button type="primary" :loading="loading" native-type="submit" style="width: 100%">修改密码</el-button>
      <el-button style="width: 100%; margin-top: 12px; margin-left: 0" @click="logout">退出</el-button>
    </el-form>
  </main>

  <main v-else class="admin-shell" :class="{ dark: darkMode }">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark">KEY</div>
        <div>
          <strong>卡密授权系统</strong>
          <span>Entitlement Console</span>
        </div>
      </div>
      <div class="sidebar-menu" aria-label="后台功能导航">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="sidebar-nav-item"
          :class="{ active: activeSection === item.id }"
          type="button"
          @click="activeSection = item.id"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </aside>

    <section class="workspace">
      <template v-if="activeSection === 'console'">
      <header class="header">
        <div>
          <p class="eyebrow">运营控制台</p>
          <h1>授权运营控制台</h1>
          <p>授权与卡密管理后台现在按产品、版本、密钥和风险队列组织运营视图。</p>
        </div>
        <div class="header-actions">
          <el-button circle :icon="Bell" title="消息中心" />
          <el-button circle :icon="Setting" title="系统设置" />
          <el-switch v-model="darkMode" active-text="深色" inactive-text="浅色" />
          <div class="avatar">管</div>
          <el-button :icon="Refresh" @click="refreshAll">刷新数据</el-button>
          <el-button :icon="SwitchButton" type="danger" plain @click="logout">退出登录</el-button>
        </div>
      </header>

      <section class="metric-grid">
        <article class="metric-card primary"><span>活跃产品</span><strong>{{ activeProducts }}</strong><small>{{ products.length }} 个产品 / {{ versionPolicies.length }} 条版本策略</small></article>
        <article class="metric-card"><span>有效授权码</span><strong>{{ activeLicenses }}</strong><small>停用或异常 {{ disabledLicenses }}</small></article>
        <article class="metric-card"><span>在线绑定设备</span><strong>{{ onlineDevices }}</strong><small>{{ devices.length }} 台设备 / {{ activeCardKeys }} 个待用卡密</small></article>
        <article class="metric-card danger"><span>待处理队列</span><strong>{{ openRisks + pendingUnbindRequests }}</strong><small>风险 {{ openRisks }} / 解绑 {{ pendingUnbindRequests }}</small></article>
      </section>

      <section class="console-panel console-home" v-loading="loading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">运行状态</p>
            <h2>授权链路健康</h2>
            <p>首屏聚焦产品版本策略、请求签名隔离、API 健康和待处理队列。</p>
          </div>
        </div>
        <div class="health-grid">
          <article v-for="item in consoleHealthItems" :key="item.label" class="health-card">
            <div>
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <el-tag :type="item.status" effect="plain">{{ item.status === 'success' ? '正常' : item.status === 'warning' ? '关注' : '异常' }}</el-tag>
            <small>{{ item.detail }}</small>
          </article>
        </div>
      </section>

      <section class="console-layout">
        <section class="console-panel">
          <div class="section-heading compact-heading">
            <div>
              <p class="eyebrow">产品与版本</p>
              <h2>签名密钥匹配矩阵</h2>
              <p>客户端必须使用表中产品 Key 和目标版本对应的版本级 secret。</p>
            </div>
          </div>
          <el-table :data="productVersionRows" size="small">
            <el-table-column label="产品" min-width="220">
              <template #default="{ row }">
                <strong>{{ row.product.name }}</strong>
                <span class="table-subtext">{{ row.product.productCode }}</span>
              </template>
            </el-table-column>
            <el-table-column label="版本策略" min-width="170">
              <template #default="{ row }">
                <span>{{ row.policy ? `${row.policy.minSupportedVersion} -> ${row.policy.latestVersion}` : '未配置' }}</span>
                <el-tag v-if="row.policy?.forceUpgrade" type="danger" size="small">强制升级</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="observedVersions" label="设备版本" min-width="140" />
            <el-table-column label="签名匹配范围" min-width="260">
              <template #default="{ row }"><code class="inline-code">{{ row.signingScope }}</code></template>
            </el-table-column>
            <el-table-column prop="activeLicenses" label="有效授权" width="100" />
            <el-table-column prop="activeDevices" label="在线设备" width="100" />
          </el-table>
        </section>

        <aside class="console-side">
          <section class="console-panel">
            <div class="section-heading compact-heading">
              <div>
                <p class="eyebrow">处理队列</p>
                <h2>今日优先级</h2>
              </div>
            </div>
            <div class="queue-list">
              <article v-for="item in consoleQueueRows" :key="item.label">
                <div>
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.detail }}</span>
                </div>
                <el-tag :type="queueTagType(item.value)" effect="plain">{{ item.value }}</el-tag>
              </article>
            </div>
          </section>

          <section class="console-panel">
            <div class="section-heading compact-heading">
              <div>
                <p class="eyebrow">API 监控</p>
                <h2>公共接口健康</h2>
              </div>
            </div>
            <div class="api-health">
              <article><span>请求总数</span><strong>{{ monitoringMetrics.api.requests.total }}</strong></article>
              <article><span>失败率</span><strong>{{ percent(monitoringMetrics.api.requests.failureRate) }}</strong></article>
              <article><span>平均延迟</span><strong>{{ monitoringMetrics.api.requests.averageLatencyMs }} ms</strong></article>
            </div>
            <div class="error-list" v-if="topErrorCodes.length">
              <div v-for="[code, count] in topErrorCodes" :key="code"><span>{{ code }}</span><strong>{{ count }}</strong></div>
            </div>
            <p v-else class="empty-note">暂无错误码记录</p>
          </section>
        </aside>
      </section>

      <section class="console-panel">
        <div class="section-heading compact-heading">
          <div>
            <p class="eyebrow">客户端配置</p>
            <h2>Win 客户端接入基线</h2>
            <p>打包配置必须和服务端 `PUBLIC_API_SIGNING_SECRETS` 的产品与版本完全一致。</p>
          </div>
        </div>
        <div class="config-baseline">
          <article>
            <span>密钥策略</span>
            <strong>PUBLIC_API_SIGNING_SECRETS</strong>
            <small>不再使用全局 PUBLIC_API_SIGNING_SECRET 作为生产兜底</small>
          </article>
          <article>
            <span>客户端字段</span>
            <strong>requestSigningSecret</strong>
            <small>对应当前 productCode + appVersion 的 secret</small>
          </article>
          <article>
            <span>配置文件</span>
            <strong>entitlement-client.config.json</strong>
            <small>放入 Electron resources 目录或用 LICENSE_CLIENT_CONFIG_PATH 指定</small>
          </article>
        </div>
      </section>
      </template>

      <template v-else>
      <header class="module-header">
        <div>
          <p class="eyebrow">模块工作台</p>
          <h1>{{ activeNavItem.label }}</h1>
          <p>{{ activeNavItem.summary }}</p>
        </div>
        <div class="header-actions">
          <el-switch v-model="darkMode" active-text="深色" inactive-text="浅色" />
          <div class="avatar">管</div>
          <el-button :icon="Refresh" @click="refreshAll">刷新数据</el-button>
          <el-button :icon="SwitchButton" type="danger" plain @click="logout">退出登录</el-button>
        </div>
      </header>

      <section class="console-panel module-panel" v-loading="loading">
      <div class="section-heading module-section-heading">
        <div>
          <p class="eyebrow">当前切面</p>
          <h2>{{ activeNavItem.label }}</h2>
          <p>{{ activeNavItem.summary }}</p>
        </div>
      </div>

      <section v-if="activeSection === 'products'" class="section-page">
        <div class="table-card">
          <div class="toolbar">
            <div><strong>创建产品</strong><span class="muted">产品 Key 自动生成，用于客户端 productCode 配置</span></div>
          </div>
          <el-form class="product-form-grid product-create-form" label-position="top" @submit.prevent="submitProduct">
            <el-form-item class="product-key-item" label="产品 Key">
              <div class="product-key-control">
                <el-input v-model="productForm.productCode" readonly />
                <el-button @click="refreshProductKey">重新生成</el-button>
              </div>
            </el-form-item>
            <el-form-item label="产品名称">
              <el-input v-model="productForm.name" placeholder="Demo App" />
            </el-form-item>
            <el-form-item label="产品描述">
              <el-input v-model="productForm.description" placeholder="产品用途或接入说明" />
            </el-form-item>
            <div class="form-actions">
              <el-button type="primary" native-type="submit">创建产品</el-button>
            </div>
          </el-form>
        </div>
        <el-table :data="products" style="margin-top: 18px">
          <el-table-column type="expand" width="52">
            <template #default="{ row }">
              <div class="product-config-panel">
                <div class="toolbar">
                  <div>
                    <strong>Win 客户端接入配置</strong>
                    <span class="muted">复制后放入打包版 Electron resources/entitlement-client.config.json</span>
                  </div>
                  <el-button size="small" @click="copyText(row.productCode)">复制产品 Key</el-button>
                </div>
                <div v-if="row.requestSigningSecrets?.length" class="client-config-list">
                  <article v-for="secret in row.requestSigningSecrets" :key="secret.keyId ?? `${secret.productCode}-${secret.appVersion}`" class="client-config-item">
                    <div class="client-config-meta">
                      <span>匹配版本</span>
                      <strong>{{ secret.appVersion }}</strong>
                      <small>{{ secret.keyId ?? `${row.productCode}-${secret.appVersion}` }}</small>
                    </div>
                    <div class="client-config-values">
                      <label>productCode</label>
                      <code>{{ row.productCode }}</code>
                      <label>requestSigningSecret</label>
                      <code>{{ secret.requestSigningSecret }}</code>
                    </div>
                    <div class="client-config-actions">
                      <el-button size="small" @click="copyText(secret.appVersion)">复制版本</el-button>
                      <el-button size="small" @click="copyText(secret.requestSigningSecret)">复制 secret</el-button>
                      <el-button size="small" type="primary" @click="copyText(clientConfigJson(row, secret))">复制完整 JSON</el-button>
                    </div>
                  </article>
                </div>
                <el-alert v-else title="当前产品没有匹配的 PUBLIC_API_SIGNING_SECRETS 条目" type="warning" :closable="false" />
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="产品 Key" min-width="380">
            <template #default="{ row }">
              <div class="key-cell">
                <span class="product-key-value">{{ row.productCode }}</span>
                <el-button size="small" @click="copyText(row.productCode)">复制</el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="description" label="描述" min-width="180" />
          <el-table-column label="客户端配置" width="140">
            <template #default="{ row }">
              <el-tag :type="row.requestSigningSecrets?.length ? 'success' : 'warning'">
                {{ row.requestSigningSecrets?.length ? `${row.requestSigningSecrets.length} 个版本` : '未配置' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="管理" width="260" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button size="small" @click="openProductEditor(row)">编辑</el-button>
                <el-button size="small" :type="row.status === 'active' ? 'warning' : 'success'" plain @click="toggleProductStatus(row)">
                  {{ row.status === 'active' ? '停用' : '启用' }}
                </el-button>
                <el-button size="small" type="danger" plain @click="removeProduct(row)">移除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <el-dialog v-model="productEditorVisible" title="编辑产品" width="520px">
          <el-form label-position="top" @submit.prevent="submitProductEdit">
            <el-form-item label="产品名称">
              <el-input v-model="productEditForm.name" />
            </el-form-item>
            <el-form-item label="产品描述">
              <el-input v-model="productEditForm.description" type="textarea" :rows="4" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="productEditorVisible = false">取消</el-button>
            <el-button type="primary" @click="submitProductEdit">保存</el-button>
          </template>
        </el-dialog>
      </section>

      <section v-if="activeSection === 'plans'" class="section-page">
        <div class="table-card">
          <div class="toolbar"><strong>创建套餐</strong></div>
          <el-form class="form-grid" label-position="top" @submit.prevent="submitPlan">
            <el-form-item label="产品">
              <el-select v-model="planForm.productId" style="width: 100%">
                <el-option v-for="product in products" :key="product.id" :label="`${product.name} (${product.productCode})`" :value="product.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="套餐编码">
              <el-input v-model="planForm.planCode" placeholder="basic" />
            </el-form-item>
            <el-form-item label="套餐名称">
              <el-input v-model="planForm.name" placeholder="Basic" />
            </el-form-item>
            <el-form-item label="有效天数">
              <el-input-number v-model="planForm.durationDays" :min="1" style="width: 100%" />
            </el-form-item>
            <el-form-item label="最大设备数">
              <el-input-number v-model="planForm.maxDevices" :min="1" style="width: 100%" />
            </el-form-item>
            <el-form-item label="最大并发数">
              <el-input-number v-model="planForm.maxConcurrency" :min="1" style="width: 100%" />
            </el-form-item>
            <el-form-item label="多设备登录策略">
              <el-select v-model="planDeviceBindingPolicy" style="width: 100%">
                <el-option v-for="option in deviceBindingPolicyOptions" :key="option.value" :label="option.label" :value="option.value">
                  <span>{{ option.label }}</span>
                  <small class="select-option-note">{{ option.description }}</small>
                </el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="宽限小时">
              <el-input-number v-model="planForm.graceHours" :min="0" style="width: 100%" />
            </el-form-item>
            <el-form-item class="full" label="功能开关 JSON">
              <el-input v-model="planFlagsText" type="textarea" :rows="4" />
            </el-form-item>
            <el-button type="primary" native-type="submit">创建套餐</el-button>
          </el-form>
        </div>
        <el-table :data="plans" style="margin-top: 18px">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="planCode" label="套餐编码" />
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="product.productCode" label="产品" />
          <el-table-column label="最大绑定设备" width="160">
            <template #default="{ row }">
              <el-input-number v-model="row.maxDevices" :min="1" size="small" style="width: 126px" @change="updatePlanDeviceLimits(row)" />
            </template>
          </el-table-column>
          <el-table-column label="最大并发" width="150">
            <template #default="{ row }">
              <el-input-number v-model="row.maxConcurrency" :min="1" size="small" style="width: 116px" @change="updatePlanDeviceLimits(row)" />
            </template>
          </el-table-column>
          <el-table-column label="多设备策略" min-width="220">
            <template #default="{ row }">
              <el-select :model-value="planDeviceBindingPolicyFor(row)" size="small" @change="updatePlanDevicePolicyFromSelect(row, $event)">
                <el-option v-for="option in deviceBindingPolicyOptions" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
              <span class="table-subtext">{{ planDeviceBindingPolicyFor(row) === 'kick_oldest' ? '新设备会顶掉最久未活跃设备' : '设备满额时拒绝新设备' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
        </el-table>
      </section>

      <section v-if="activeSection === 'licenses'" class="section-page">
        <div class="table-card">
          <div class="toolbar">
            <div><strong>生成授权码</strong><span class="muted">支持自动生成、设备数覆盖和功能开关覆盖</span></div>
            <el-button type="warning" plain :disabled="!selectedLicenses.length" @click="batchBanLicenses">批量封禁</el-button>
          </div>
          <el-form class="form-grid" label-position="top" @submit.prevent="submitLicense">
            <el-form-item label="产品">
              <el-select v-model="licenseForm.productId" style="width: 100%">
                <el-option v-for="product in products" :key="product.id" :label="`${product.name} (${product.productCode})`" :value="product.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="套餐">
              <el-select v-model="licenseForm.planId" style="width: 100%">
                <el-option v-for="plan in plans" :key="plan.id" :label="`${plan.name} (${plan.planCode})`" :value="plan.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="授权码（License Key）（留空自动生成）">
              <el-input v-model="licenseForm.licenseKey" />
            </el-form-item>
            <el-form-item label="到期时间">
              <el-input v-model="licenseForm.expireAt" placeholder="2027-01-01T00:00:00.000Z" />
            </el-form-item>
            <el-form-item label="设备数覆盖">
              <el-input-number v-model="licenseForm.maxDevicesOverride" :min="1" style="width: 100%" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="licenseForm.notes" />
            </el-form-item>
            <el-form-item class="full" label="功能开关覆盖 JSON">
              <el-input v-model="licenseFlagsText" type="textarea" :rows="3" placeholder="留空表示不覆盖" />
            </el-form-item>
            <el-button type="primary" native-type="submit">生成授权码</el-button>
          </el-form>
        </div>
        <el-table :data="licenses" class="data-table" size="small" stripe border empty-text="暂无授权码，先生成一个授权码" @selection-change="handleLicenseSelection">
          <el-table-column type="selection" width="44" fixed />
          <el-table-column prop="id" label="ID" width="80" sortable />
          <el-table-column label="授权码（License Key）" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">
              <el-button v-if="row.licenseKey" link type="primary" @click="copyText(row.licenseKey)">复制</el-button>
              <span class="key-text">{{ row.licenseKey ?? '仅创建时显示' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="product.productCode" label="产品" width="140" />
          <el-table-column prop="plan.planCode" label="套餐" width="140" />
          <el-table-column label="状态" width="120" sortable>
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="expireAt" label="到期时间" min-width="190" sortable />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="changeLicenseStatus(row, 'active')">启用</el-button>
              <el-button size="small" type="danger" @click="changeLicenseStatus(row, 'banned')">封禁</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section v-if="activeSection === 'devices'" class="section-page">
        <el-table :data="devices">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="deviceCode" label="设备码" min-width="180" />
          <el-table-column prop="deviceName" label="名称" />
          <el-table-column label="授权" min-width="210">
            <template #default="{ row }">{{ licenseLabel(row.license) }}</template>
          </el-table-column>
          <el-table-column prop="appVersion" label="应用版本" width="120" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="lastSeenAt" label="最后在线" min-width="190" />
          <el-table-column label="操作" width="240">
            <template #default="{ row }">
              <el-button size="small" @click="changeDeviceStatus(row, 'active')">启用</el-button>
              <el-button size="small" @click="changeDeviceStatus(row, 'removed')">移除</el-button>
              <el-button size="small" type="danger" @click="changeDeviceStatus(row, 'banned')">封禁</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section v-if="activeSection === 'versions'" class="section-page">
        <div class="table-card">
          <div class="toolbar"><strong>创建版本策略</strong></div>
          <el-form class="form-grid" label-position="top" @submit.prevent="submitVersionPolicy">
            <el-form-item label="产品">
              <el-select v-model="versionPolicyForm.productId" style="width: 100%">
                <el-option v-for="product in products" :key="product.id" :label="`${product.name} (${product.productCode})`" :value="product.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="最低支持版本">
              <el-input v-model="versionPolicyForm.minSupportedVersion" />
            </el-form-item>
            <el-form-item label="最新版本">
              <el-input v-model="versionPolicyForm.latestVersion" />
            </el-form-item>
            <el-form-item label="强制升级">
              <el-switch v-model="versionPolicyForm.forceUpgrade" />
            </el-form-item>
            <el-form-item label="下载地址">
              <el-input v-model="versionPolicyForm.downloadUrl" />
            </el-form-item>
            <el-form-item label="公告">
              <el-input v-model="versionPolicyForm.notice" />
            </el-form-item>
            <el-button type="primary" native-type="submit">创建策略</el-button>
          </el-form>
        </div>
        <el-table :data="versionPolicies" style="margin-top: 18px">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="product.productCode" label="产品" />
          <el-table-column prop="minSupportedVersion" label="最低版本" />
          <el-table-column prop="latestVersion" label="最新版本" />
          <el-table-column prop="forceUpgrade" label="强制升级" width="120" />
          <el-table-column prop="notice" label="公告" />
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" @click="toggleForceUpgrade(row)">{{ row.forceUpgrade ? '关闭强制' : '开启强制' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section v-if="activeSection === 'risk'" class="section-page">
        <el-row :gutter="16">
          <el-col :span="6"><el-card><strong>风险总数</strong><p>{{ riskSummary.total }}</p></el-card></el-col>
          <el-col :span="6"><el-card><strong>未处理</strong><p>{{ riskSummary.open }}</p></el-card></el-col>
          <el-col :span="6"><el-card><strong>高危</strong><p>{{ riskSummary.high }}</p></el-card></el-col>
          <el-col :span="6"><el-card><strong>已解决</strong><p>{{ riskSummary.resolved }}</p></el-card></el-col>
        </el-row>
        <div class="table-card" style="margin-top: 18px">
          <div class="toolbar"><strong>创建风险事件</strong></div>
          <el-form class="form-grid" label-position="top" @submit.prevent="submitRiskEvent">
            <el-form-item label="租户">
              <el-select v-model="riskEventForm.tenantId" clearable style="width: 100%">
                <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="授权码">
              <el-select v-model="riskEventForm.licenseId" clearable style="width: 100%">
                <el-option v-for="license in licenses" :key="license.id" :label="licenseLabel(license)" :value="license.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="设备">
              <el-select v-model="riskEventForm.deviceId" clearable style="width: 100%">
                <el-option v-for="device in devices" :key="device.id" :label="device.deviceCode" :value="device.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="事件类型">
              <el-input v-model="riskEventForm.eventType" />
            </el-form-item>
            <el-form-item label="级别">
              <el-select v-model="riskEventForm.severity" style="width: 100%">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
              </el-select>
            </el-form-item>
            <el-form-item class="full" label="摘要">
              <el-input v-model="riskEventForm.summary" />
            </el-form-item>
            <el-button type="primary" native-type="submit">创建风险事件</el-button>
          </el-form>
        </div>
        <el-table :data="riskEvents" style="margin-top: 18px">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="eventType" label="类型" />
          <el-table-column prop="severity" label="级别" width="100" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="summary" label="摘要" />
          <el-table-column label="授权" min-width="210">
            <template #default="{ row }">{{ licenseLabel(row.license) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="210">
            <template #default="{ row }">
              <el-button size="small" @click="changeRiskEventStatus(row, 'resolved')">解决</el-button>
              <el-button size="small" @click="changeRiskEventStatus(row, 'ignored')">忽略</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section v-if="activeSection === 'monitoring'" class="section-page">
        <el-row :gutter="16">
          <el-col :span="6"><el-card><strong>请求总数</strong><p>{{ monitoringMetrics.api.requests.total }}</p></el-card></el-col>
          <el-col :span="6"><el-card><strong>失败率</strong><p>{{ percent(monitoringMetrics.api.requests.failureRate) }}</p></el-card></el-col>
          <el-col :span="6"><el-card><strong>平均延迟</strong><p>{{ monitoringMetrics.api.requests.averageLatencyMs }} ms</p></el-card></el-col>
          <el-col :span="6"><el-card><strong>最大延迟</strong><p>{{ monitoringMetrics.api.requests.maxLatencyMs }} ms</p></el-card></el-col>
        </el-row>

        <el-row :gutter="16" style="margin-top: 18px">
          <el-col :span="8"><el-card><strong>运行时长</strong><p>{{ monitoringMetrics.api.uptimeSeconds }} s</p></el-card></el-col>
          <el-col :span="8"><el-card><strong>PostgreSQL 连接</strong><p>{{ monitoringMetrics.postgres.connections ?? '-' }}</p></el-card></el-col>
          <el-col :span="8"><el-card><strong>数据库大小</strong><p>{{ formatBytes(monitoringMetrics.postgres.databaseSizeBytes) }}</p></el-card></el-col>
        </el-row>

        <div class="table-card" style="margin-top: 18px">
          <div class="toolbar"><strong>错误码统计</strong></div>
          <el-empty v-if="topErrorCodes.length === 0" description="暂无失败错误码" />
          <el-table v-else :data="topErrorCodes.map(([code, count]) => ({ code, count }))" size="small">
            <el-table-column prop="code" label="错误码" />
            <el-table-column prop="count" label="次数" width="120" />
          </el-table>
        </div>

        <div class="table-card" style="margin-top: 18px">
          <div class="toolbar"><strong>接口指标</strong></div>
          <el-table :data="monitoringMetrics.api.routes" size="small">
            <el-table-column prop="route" label="接口" min-width="220" />
            <el-table-column prop="count" label="请求" width="100" />
            <el-table-column prop="failures" label="失败" width="100" />
            <el-table-column label="失败率" width="120">
              <template #default="{ row }">{{ percent(row.failureRate) }}</template>
            </el-table-column>
            <el-table-column prop="averageLatencyMs" label="平均延迟 ms" width="140" />
            <el-table-column prop="maxLatencyMs" label="最大延迟 ms" width="140" />
          </el-table>
        </div>
      </section>

      <section v-if="activeSection === 'admins'" class="section-page">
        <div class="table-card">
          <div class="toolbar"><strong>创建管理员</strong></div>
          <el-form class="form-grid" label-position="top" @submit.prevent="submitAdmin">
            <el-form-item label="用户名"><el-input v-model="adminForm.username" placeholder="viewer1" /></el-form-item>
            <el-form-item label="初始密码"><el-input v-model="adminForm.password" type="password" show-password /></el-form-item>
            <el-form-item label="角色">
              <el-select v-model="adminForm.roleCode" style="width: 100%">
                <el-option label="超级管理员" value="super_admin" />
                <el-option label="运营人员" value="operator" />
                <el-option label="只读人员" value="viewer" />
              </el-select>
            </el-form-item>
            <el-form-item label="租户">
              <el-select v-model="adminForm.tenantId" clearable style="width: 100%">
                <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
              </el-select>
            </el-form-item>
            <el-button type="primary" native-type="submit">创建管理员</el-button>
          </el-form>
        </div>

        <el-table :data="admins" style="margin-top: 18px">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="username" label="用户名" />
          <el-table-column label="角色" width="150">
            <template #default="{ row }"><el-tag>{{ statusText(row.roleCode) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="租户" width="160">
            <template #default="{ row }">{{ row.tenant?.name ?? '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="360">
            <template #default="{ row }">
              <el-button size="small" @click="changeAdminRole(row, 'viewer')">只读</el-button>
              <el-button size="small" @click="changeAdminRole(row, 'operator')">运营</el-button>
              <el-button size="small" @click="changeAdminStatus(row, row.status === 'active' ? 'disabled' : 'active')">{{ row.status === 'active' ? '禁用' : '启用' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section v-if="activeSection === 'channels'" class="section-page">
        <div class="table-card">
          <div class="toolbar"><strong>创建租户</strong></div>
          <el-form class="form-grid" label-position="top" @submit.prevent="submitTenant">
            <el-form-item label="租户编码"><el-input v-model="tenantForm.tenantCode" placeholder="tenant_a" /></el-form-item>
            <el-form-item label="名称"><el-input v-model="tenantForm.name" /></el-form-item>
            <el-form-item label="联系邮箱"><el-input v-model="tenantForm.contactEmail" /></el-form-item>
            <el-button type="primary" native-type="submit">创建租户</el-button>
          </el-form>
        </div>
        <el-table :data="tenants" style="margin-top: 18px">
          <el-table-column prop="tenantCode" label="租户编码" />
          <el-table-column prop="name" label="名称" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
        </el-table>

        <div class="table-card" style="margin-top: 18px">
          <div class="toolbar"><strong>创建渠道/代理商</strong></div>
          <el-form class="form-grid" label-position="top" @submit.prevent="submitChannel">
            <el-form-item label="租户">
              <el-select v-model="channelForm.tenantId" clearable style="width: 100%">
                <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="渠道编码"><el-input v-model="channelForm.channelCode" placeholder="agent_a" /></el-form-item>
            <el-form-item label="名称"><el-input v-model="channelForm.name" /></el-form-item>
            <el-form-item label="联系人"><el-input v-model="channelForm.contact" /></el-form-item>
            <el-form-item class="full" label="备注"><el-input v-model="channelForm.notes" /></el-form-item>
            <el-button type="primary" native-type="submit">创建渠道</el-button>
          </el-form>
        </div>
        <el-table :data="channels" style="margin-top: 18px">
          <el-table-column prop="channelCode" label="渠道编码" />
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="tenant.name" label="租户" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="170">
            <template #default="{ row }">
              <el-button size="small" @click="changeChannelStatus(row, row.status === 'active' ? 'disabled' : 'active')">{{ row.status === 'active' ? '停用' : '启用' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section v-if="activeSection === 'cardKeys'" class="section-page">
        <div class="table-card" style="margin-top: 18px">
          <div class="toolbar">
            <div><strong>生成授权码</strong><span class="muted">自动生成类型前缀授权码，例如月卡 YK + 32 位大写十六进制</span></div>
            <div class="toolbar-actions">
              <el-button :disabled="!cardKeys.length" @click="copyCardKeys(cardKeys, '暂无可复制授权码')">复制全部</el-button>
              <el-button :disabled="!selectedCardKeys.length" @click="copyCardKeys(selectedCardKeys, '请先勾选要复制的授权码')">复制选中</el-button>
              <el-button :icon="Download" :disabled="!cardKeys.length" @click="exportCardKeys(cardKeys, '暂无可导出授权码', 'all')">导出全部</el-button>
              <el-button :icon="Download" :disabled="!selectedCardKeys.length" @click="exportCardKeys(selectedCardKeys, '请先勾选要导出的授权码', 'selected')">导出选中</el-button>
              <el-button type="danger" plain :disabled="!selectedCardKeys.length" @click="batchDisableCardKeys">批量禁用</el-button>
            </div>
          </div>
          <el-form class="form-grid card-key-form" label-position="top" @submit.prevent="submitCardKey">
            <el-form-item class="card-key-product" label="产品">
              <el-select v-model="cardKeyForm.productId" style="width: 100%">
                <el-option v-for="product in products" :key="product.id" :label="product.name" :value="product.id" />
              </el-select>
            </el-form-item>
            <el-form-item class="card-key-mini" label="授权类型">
              <el-select v-model="cardKeyDurationType" style="width: 100%">
                <el-option v-for="option in cardKeyDurationOptions" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="cardKeyDurationType === 'hour'" class="card-key-mini" label="小时数">
              <el-input-number v-model="cardKeyDurationHours" :min="1" :max="720" style="width: 100%" />
            </el-form-item>
            <el-form-item class="card-key-custom" label="自定义授权码（留空自动生成）"><el-input v-model="cardKeyForm.cardKey" placeholder="例如 YK8676F971BDE04A99BC8CEDFC06920DE9" /></el-form-item>
            <el-form-item class="card-key-mini" label="数量"><el-input-number v-model="cardKeyQuantity" :min="1" :max="500" style="width: 100%" /></el-form-item>
            <el-button class="card-key-submit" type="primary" native-type="submit">生成授权码</el-button>
          </el-form>
        </div>
        <el-table :data="cardKeys" class="data-table" size="small" stripe border empty-text="暂无授权码，点击上方按钮生成" @selection-change="handleCardKeySelection">
          <el-table-column type="selection" width="44" fixed />
          <el-table-column prop="cardKey" label="授权码" min-width="120">
            <template #default="{ row }">
              <div class="key-cell">
                <span class="key-text card-key-code-text">{{ row.cardKey || '-' }}</span>
                <el-button link type="primary" @click="copyText(row.cardKey)">复制</el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="产品" min-width="200">
            <template #default="{ row }">
              <span class="product-column-text">{{ row.product?.productCode || row.product?.name || row.productId }}</span>
            </template>
          </el-table-column>
          <el-table-column label="产品名称" :width="productNameColumnWidth">
            <template #default="{ row }">
              <span class="product-column-text">{{ row.product?.name || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="plan.name" label="类型" width="130" />
          <el-table-column label="状态" width="120" sortable>
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="success" plain @click="changeCardKeyStatus(row, 'unused')">启用</el-button>
              <el-button size="small" type="warning" plain @click="changeCardKeyStatus(row, 'disabled')">禁用</el-button>
              <el-button size="small" type="danger" plain @click="removeCardKey(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section v-if="activeSection === 'offline'" class="section-page">
        <div class="table-card">
          <div class="toolbar"><strong>创建离线授权包</strong></div>
          <el-form class="form-grid" label-position="top" @submit.prevent="submitOfflinePackage">
            <el-form-item label="授权码">
              <el-select v-model="offlinePackageForm.licenseId" style="width: 100%">
                <el-option v-for="license in licenses" :key="license.id" :label="licenseLabel(license)" :value="license.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="设备（可选）">
              <el-select v-model="offlinePackageForm.deviceId" clearable style="width: 100%">
                <el-option v-for="device in devices" :key="device.id" :label="device.deviceCode" :value="device.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="包编码（留空自动生成）"><el-input v-model="offlinePackageForm.packageCode" /></el-form-item>
            <el-form-item label="到期时间"><el-input v-model="offlinePackageForm.expireAt" /></el-form-item>
            <el-button type="primary" native-type="submit">创建离线包</el-button>
          </el-form>
        </div>
        <el-table :data="offlinePackages" style="margin-top: 18px">
          <el-table-column prop="packageCode" label="包编码" min-width="210" />
          <el-table-column label="授权" min-width="210">
            <template #default="{ row }">{{ licenseLabel(row.license) }}</template>
          </el-table-column>
          <el-table-column prop="device.deviceCode" label="设备" />
          <el-table-column prop="expireAt" label="到期时间" min-width="190" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" @click="changeOfflinePackageStatus(row, row.status === 'active' ? 'revoked' : 'active')">{{ row.status === 'active' ? '撤销' : '恢复' }}</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-card" style="margin-top: 18px">
          <div class="toolbar"><strong>自助解绑申请</strong></div>
          <el-form class="form-grid" label-position="top" @submit.prevent="submitUnbindRequest">
            <el-form-item label="授权码">
              <el-select v-model="unbindRequestForm.licenseId" style="width: 100%">
                <el-option v-for="license in licenses" :key="license.id" :label="licenseLabel(license)" :value="license.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="设备">
              <el-select v-model="unbindRequestForm.deviceId" style="width: 100%">
                <el-option v-for="device in devices" :key="device.id" :label="device.deviceCode" :value="device.id" />
              </el-select>
            </el-form-item>
            <el-form-item class="full" label="原因"><el-input v-model="unbindRequestForm.reason" /></el-form-item>
            <el-button type="primary" native-type="submit">创建申请</el-button>
          </el-form>
        </div>
        <el-table :data="unbindRequests" style="margin-top: 18px">
          <el-table-column label="授权" min-width="210">
            <template #default="{ row }">{{ licenseLabel(row.license) }}</template>
          </el-table-column>
          <el-table-column prop="device.deviceCode" label="设备" />
          <el-table-column prop="reason" label="原因" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button size="small" @click="reviewUnbindRequest(row, 'approved')">通过</el-button>
              <el-button size="small" type="danger" @click="reviewUnbindRequest(row, 'rejected')">拒绝</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section v-if="activeSection === 'protectors'" class="section-page">
        <div class="table-card">
          <div class="toolbar"><strong>创建保护器适配器</strong></div>
          <el-form class="form-grid" label-position="top" @submit.prevent="submitProtectorAdapter">
            <el-form-item label="租户">
              <el-select v-model="protectorAdapterForm.tenantId" clearable style="width: 100%">
                <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="产品">
              <el-select v-model="protectorAdapterForm.productId" clearable style="width: 100%">
                <el-option v-for="product in products" :key="product.id" :label="product.name" :value="product.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="适配器编码"><el-input v-model="protectorAdapterForm.adapterCode" placeholder="protector_default" /></el-form-item>
            <el-form-item label="名称"><el-input v-model="protectorAdapterForm.name" /></el-form-item>
            <el-form-item class="full" label="备注"><el-input v-model="protectorAdapterForm.notes" /></el-form-item>
            <el-button type="primary" native-type="submit">创建适配器</el-button>
          </el-form>
        </div>
        <el-table :data="protectorAdapters" style="margin-top: 18px">
          <el-table-column prop="adapterCode" label="编码" />
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="product.productCode" label="产品" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" />
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" @click="toggleProtectorAdapter(row)">{{ row.status === 'active' ? '停用' : '启用' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section v-if="activeSection === 'sdk'" class="section-page">
        <div class="sdk-grid">
          <article v-for="resource in sdkResources" :key="resource.name" class="sdk-card">
            <div>
              <strong>{{ resource.name }}</strong>
              <p>{{ resource.description }}</p>
            </div>
            <a :href="resource.url" target="_blank" rel="noopener noreferrer">
              <el-button type="primary" plain :icon="resource.action === '下载 ZIP' ? Download : Link">{{ resource.action }}</el-button>
            </a>
          </article>
        </div>

        <div class="doc-panel">
          <div class="toolbar">
            <div>
              <strong>接入步骤</strong>
              <span class="muted">生产环境启用请求签名时，客户端必须配置与服务端一致的签名密钥</span>
            </div>
          </div>
          <ol class="integration-steps">
            <li>在后台创建产品，记录产品编码，例如 <code>demo_app</code>。</li>
            <li>创建套餐和授权卡密，并将 License Key 发放给客户。</li>
            <li>客户端集成对应 SDK，配置 <code>apiBaseUrl</code>、<code>productCode</code> 和可选的 <code>requestSigningSecret</code>。</li>
            <li>首次启动调用激活接口，保存服务端返回的 lease token。</li>
            <li>启动时调用验证接口，运行中定时调用心跳接口续租。</li>
            <li>根据返回的功能开关、版本策略和错误码控制软件功能、升级提示和封禁处理。</li>
          </ol>
        </div>

        <div class="doc-panel">
          <div class="toolbar"><strong>快速命令</strong></div>
          <div class="code-grid">
            <pre><code>npm --prefix sdk-electron install
npm --prefix sdk-electron run build</code></pre>
            <pre><code>make -C sdk-cpp clean all</code></pre>
            <pre><code>dotnet build sdk-dotnet/demo/Entitlement.Sdk.Demo.csproj</code></pre>
            <pre><code>export ENTITLEMENT_API_BASE_URL=http://127.0.0.1:3000
export ENTITLEMENT_PRODUCT_CODE=demo_app
export ENTITLEMENT_LICENSE_KEY=DEMO-AAAA-BBBB-CCCC</code></pre>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'logs'" class="section-page">
        <div class="log-toolbar">
          <el-select v-model="activeLogType" aria-label="选择日志类型" style="width: 220px">
            <el-option label="激活日志" value="activation" />
            <el-option label="心跳日志" value="heartbeat" />
            <el-option label="审计日志" value="audit" />
          </el-select>
        </div>

        <el-table v-if="activeLogType === 'activation'" :data="activationLogs" size="small">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="授权" min-width="210">
            <template #default="{ row }">{{ licenseLabel(row.license) }}</template>
          </el-table-column>
          <el-table-column prop="device.deviceCode" label="设备" min-width="160" />
          <el-table-column prop="resultCode" label="结果" width="140" />
          <el-table-column prop="message" label="消息" />
          <el-table-column prop="createdAt" label="时间" min-width="190" />
        </el-table>

        <el-table v-if="activeLogType === 'heartbeat'" :data="heartbeatLogs" size="small">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="授权" min-width="210">
            <template #default="{ row }">{{ licenseLabel(row.license) }}</template>
          </el-table-column>
          <el-table-column prop="device.deviceCode" label="设备" min-width="160" />
          <el-table-column prop="actionType" label="动作" width="120" />
          <el-table-column prop="resultCode" label="结果" width="140" />
          <el-table-column prop="createdAt" label="时间" min-width="190" />
        </el-table>

        <el-table v-if="activeLogType === 'audit'" :data="auditLogs" size="small">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="targetType" label="对象" width="140" />
          <el-table-column prop="targetId" label="对象 ID" width="100" />
          <el-table-column prop="action" label="动作" />
          <el-table-column prop="createdAt" label="时间" min-width="190" />
        </el-table>
      </section>
      </section>
      </template>
    </section>
  </main>
</template>
