<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Bell, Box, Connection, Cpu, DataAnalysis, Document, Download, Grid, Key, Link, Monitor, Refresh, Setting, SwitchButton, Tickets, TrendCharts } from '@element-plus/icons-vue';
import { changePassword, clearToken, createCardKey, createChannel, createDeviceUnbindRequest, createLicense, createOfflinePackage, createPlan, createProduct, createProtectorAdapter, createRiskEvent, createTenant, createVersionPolicy, getRiskSummary, getToken, listActivationLogs, listAuditLogs, listCardKeys, listChannels, listDeviceUnbindRequests, listDevices, listHeartbeatLogs, listLicenses, listOfflinePackages, listPlans, listProducts, listProtectorAdapters, listRiskEvents, listTenants, listVersionPolicies, login, reviewDeviceUnbindRequest, updateCardKeyStatus, updateChannelStatus, updateDeviceStatus, updateLicenseStatus, updateOfflinePackageStatus, updateProtectorAdapterStatus, updateRiskEventStatus, updateVersionPolicy } from './api';
import type { ActivationLog, AuditLog, CardKey, Channel, CreateCardKeyInput, CreateChannelInput, CreateDeviceUnbindRequestInput, CreateLicenseInput, CreateOfflinePackageInput, CreatePlanInput, CreateProductInput, CreateProtectorAdapterInput, CreateRiskEventInput, CreateTenantInput, CreateVersionPolicyInput, Device, DeviceUnbindRequest, HeartbeatLog, License, OfflinePackage, Plan, Product, ProtectorAdapter, RiskEvent, RiskSummary, Tenant, VersionPolicy } from './types';

const navItems = [
  { id: 'console', label: '运营控制台', summary: '查看授权、卡密、设备和风险的整体运营态势', icon: DataAnalysis },
  { id: 'products', label: '产品管理', summary: '维护产品编码、名称与启停状态', icon: Box },
  { id: 'plans', label: '套餐配置', summary: '配置授权周期、设备数和功能开关', icon: Grid },
  { id: 'licenses', label: '授权卡密', summary: '生成、复制和批量封禁授权码', icon: Key },
  { id: 'devices', label: '设备绑定', summary: '查看绑定设备并处理启用、移除和封禁', icon: Monitor },
  { id: 'versions', label: '版本策略', summary: '维护最低版本、最新版本和强制升级策略', icon: TrendCharts },
  { id: 'risk', label: '风控面板', summary: '跟踪风险事件、级别和处理状态', icon: DataAnalysis },
  { id: 'channels', label: '渠道与卡密', summary: '管理租户、渠道和批次卡密库存', icon: Tickets },
  { id: 'offline', label: '离线与解绑', summary: '创建离线授权包并审核解绑申请', icon: Connection },
  { id: 'protectors', label: '保护器适配', summary: '维护加壳和保护器适配器配置', icon: Cpu },
  { id: 'sdk', label: 'SDK 接入', summary: '下载客户端 SDK 并查看 Electron、C++、.NET 接入步骤', icon: Download },
  { id: 'logs', label: '运行日志', summary: '审计激活、心跳和后台操作记录', icon: Document },
] as const;

type AdminSection = typeof navItems[number]['id'];
const githubBaseUrl = 'https://github.com/tianyou-lab/Entitlement-System';
const sdkResources = [
  { name: '完整源码 ZIP', description: '包含 Server、Admin、License UI、Electron/C++/.NET SDK 和 Demo', url: `${githubBaseUrl}/archive/refs/heads/main.zip`, action: '下载 ZIP' },
  { name: 'Electron SDK', description: 'TypeScript SDK，支持激活、验证、心跳、本地加密缓存和请求签名', url: `${githubBaseUrl}/tree/main/sdk-electron`, action: '查看源码' },
  { name: 'C++ SDK Demo', description: 'C++ 客户端接入示例，适合原生桌面软件集成', url: `${githubBaseUrl}/tree/main/sdk-cpp`, action: '查看源码' },
  { name: '.NET SDK', description: '.NET 8 客户端与 Demo，支持公共 API HMAC 请求签名', url: `${githubBaseUrl}/tree/main/sdk-dotnet`, action: '查看源码' },
  { name: 'License UI', description: '可嵌入授权激活界面的前端组件工程', url: `${githubBaseUrl}/tree/main/license-ui`, action: '查看源码' },
] as const;

const token = ref(getToken());
const loading = ref(false);
const passwordChangeRequired = ref(false);
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
const unbindRequests = ref<DeviceUnbindRequest[]>([]);
const protectorAdapters = ref<ProtectorAdapter[]>([]);
const selectedLicenses = ref<License[]>([]);
const selectedCardKeys = ref<CardKey[]>([]);
const darkMode = ref(false);
const activeSection = ref<AdminSection>('console');
const activeLogType = ref<'activation' | 'heartbeat' | 'audit'>('activation');

const loginForm = reactive({ username: 'admin', password: '' });
const passwordForm = reactive({ oldPassword: '', newPassword: '' });
const productForm = reactive<CreateProductInput>({ productCode: '', name: '', description: '' });
const planForm = reactive<CreatePlanInput>({ productId: 0, planCode: '', name: '', durationDays: 365, maxDevices: 1, maxConcurrency: 1, graceHours: 24, featureFlags: { publish: true, maxWindowCount: 20 } });
const licenseForm = reactive<CreateLicenseInput>({ productId: 0, planId: 0, licenseKey: '', expireAt: '', maxDevicesOverride: undefined, featureFlagsOverride: undefined, notes: '' });
const versionPolicyForm = reactive<CreateVersionPolicyInput>({ productId: 0, minSupportedVersion: '1.0.0', latestVersion: '1.0.0', forceUpgrade: false, downloadUrl: '', notice: '' });
const tenantForm = reactive<CreateTenantInput>({ tenantCode: '', name: '', contactEmail: '' });
const channelForm = reactive<CreateChannelInput>({ tenantId: undefined, channelCode: '', name: '', contact: '', notes: '' });
const cardKeyForm = reactive<CreateCardKeyInput>({ tenantId: undefined, productId: 0, planId: 0, channelId: undefined, cardKey: '', batchCode: '', expireAt: '' });
const offlinePackageForm = reactive<CreateOfflinePackageInput>({ tenantId: undefined, licenseId: 0, deviceId: undefined, packageCode: '', expireAt: nextYearIso() });
const riskEventForm = reactive<CreateRiskEventInput>({ tenantId: undefined, licenseId: undefined, deviceId: undefined, eventType: 'manual_review', severity: 'medium', summary: '' });
const unbindRequestForm = reactive<CreateDeviceUnbindRequestInput>({ licenseId: 0, deviceId: 0, reason: '' });
const protectorAdapterForm = reactive<CreateProtectorAdapterInput>({ tenantId: undefined, productId: undefined, adapterCode: '', name: '', notes: '' });

const isAuthenticated = computed(() => Boolean(token.value));
const activeLicenses = computed(() => licenses.value.filter((license) => license.status === 'active').length);
const disabledLicenses = computed(() => licenses.value.filter((license) => license.status === 'banned' || license.status === 'suspended' || license.status === 'inactive').length);
const activeCardKeys = computed(() => cardKeys.value.filter((cardKey) => cardKey.status === 'unused' || cardKey.status === 'issued').length);
const onlineDevices = computed(() => devices.value.filter((device) => device.status === 'active').length);
const openRisks = computed(() => riskSummary.value.open);
const activeNavItem = computed(() => navItems.find((item) => item.id === activeSection.value) ?? navItems[0]);

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
    const [nextProducts, nextPlans, nextLicenses, nextDevices, nextActivationLogs, nextHeartbeatLogs, nextAuditLogs, nextVersionPolicies, nextTenants, nextChannels, nextCardKeys, nextOfflinePackages, nextRiskEvents, nextRiskSummary, nextUnbindRequests, nextProtectorAdapters] = await Promise.all([
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
      listDeviceUnbindRequests(),
      listProtectorAdapters(),
    ]);
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
    unbindRequests.value = nextUnbindRequests;
    protectorAdapters.value = nextProtectorAdapters;
    if (!planForm.productId && nextProducts[0]) planForm.productId = nextProducts[0].id;
    if (!licenseForm.productId && nextProducts[0]) licenseForm.productId = nextProducts[0].id;
    if (!licenseForm.planId && nextPlans[0]) licenseForm.planId = nextPlans[0].id;
    if (!versionPolicyForm.productId && nextProducts[0]) versionPolicyForm.productId = nextProducts[0].id;
    if (!cardKeyForm.productId && nextProducts[0]) cardKeyForm.productId = nextProducts[0].id;
    if (!cardKeyForm.planId && nextPlans[0]) cardKeyForm.planId = nextPlans[0].id;
    if (!offlinePackageForm.licenseId && nextLicenses[0]) offlinePackageForm.licenseId = nextLicenses[0].id;
    if (!unbindRequestForm.licenseId && nextLicenses[0]) unbindRequestForm.licenseId = nextLicenses[0].id;
    if (!unbindRequestForm.deviceId && nextDevices[0]) unbindRequestForm.deviceId = nextDevices[0].id;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载失败');
  } finally {
    loading.value = false;
  }
}

async function submitProduct() {
  await withMessage('产品已创建', async () => {
    await createProduct({ ...productForm });
    productForm.productCode = '';
    productForm.name = '';
    productForm.description = '';
    await refreshAll();
  });
}

async function submitPlan() {
  await withMessage('套餐已创建', async () => {
    await createPlan({ ...planForm, featureFlags: parseJson(planFlagsText.value) });
    planForm.planCode = '';
    planForm.name = '';
    await refreshAll();
  });
}

async function submitLicense() {
  await withMessage('授权码已创建', async () => {
    await createLicense({
      ...licenseForm,
      licenseKey: licenseForm.licenseKey || undefined,
      expireAt: licenseForm.expireAt || undefined,
      notes: licenseForm.notes || undefined,
      featureFlagsOverride: licenseFlagsText.value.trim() ? parseJson(licenseFlagsText.value) : undefined,
    });
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
    await ElMessageBox.confirm(`确认禁用选中的 ${selectedCardKeys.value.length} 个卡密？`, '批量禁用确认', { type: 'warning' });
  } catch {
    return;
  }
  await withMessage('选中卡密已禁用', async () => {
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
  await withMessage('卡密已创建', async () => {
    await createCardKey({ ...cardKeyForm, tenantId: optionalId(cardKeyForm.tenantId), channelId: optionalId(cardKeyForm.channelId), cardKey: cardKeyForm.cardKey || undefined, batchCode: cardKeyForm.batchCode || undefined, expireAt: cardKeyForm.expireAt || undefined });
    cardKeyForm.cardKey = '';
    cardKeyForm.batchCode = '';
    await refreshAll();
  });
}

async function changeCardKeyStatus(row: CardKey, status: CardKey['status']) {
  await withMessage('卡密状态已更新', async () => {
    await updateCardKeyStatus(row.id, status);
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
          <h1>授权与卡密管理后台</h1>
          <p>统一管理授权码、卡密发放、设备绑定、版本策略和异常风险。</p>
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
        <article class="metric-card primary"><span>有效授权码</span><strong>{{ activeLicenses }}</strong><small>可正常验证和续租</small></article>
        <article class="metric-card"><span>待用/已发卡密</span><strong>{{ activeCardKeys }}</strong><small>渠道和批次发放库存</small></article>
        <article class="metric-card"><span>在线绑定设备</span><strong>{{ onlineDevices }}</strong><small>当前正常设备数量</small></article>
        <article class="metric-card danger"><span>待处理风险</span><strong>{{ openRisks }}</strong><small>高危 {{ riskSummary.high }} / 停用授权 {{ disabledLicenses }}</small></article>
      </section>

      <section class="console-panel console-home" v-loading="loading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">控制台速览</p>
            <h2>运营概览</h2>
            <p>集中查看关键授权资产、渠道库存、设备绑定和风险处理压力。</p>
          </div>
        </div>
        <div class="overview-grid">
          <article>
            <strong>{{ products.length }}</strong>
            <span>授权产品</span>
          </article>
          <article>
            <strong>{{ plans.length }}</strong>
            <span>套餐配置</span>
          </article>
          <article>
            <strong>{{ licenses.length }}</strong>
            <span>授权码总量</span>
          </article>
          <article>
            <strong>{{ cardKeys.length }}</strong>
            <span>卡密总量</span>
          </article>
          <article>
            <strong>{{ tenants.length }}</strong>
            <span>租户</span>
          </article>
          <article>
            <strong>{{ channels.length }}</strong>
            <span>渠道</span>
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
            <div><strong>创建授权产品</strong><span class="muted">产品编码必须与客户端 productCode 一致</span></div>
          </div>
          <el-form class="form-grid" label-position="top" @submit.prevent="submitProduct">
            <el-form-item label="产品编码">
              <el-input v-model="productForm.productCode" placeholder="demo_app" />
            </el-form-item>
            <el-form-item label="产品名称">
              <el-input v-model="productForm.name" placeholder="Demo App" />
            </el-form-item>
            <el-form-item class="full" label="描述">
              <el-input v-model="productForm.description" />
            </el-form-item>
            <el-button type="primary" native-type="submit">创建产品</el-button>
          </el-form>
        </div>
        <el-table :data="products" style="margin-top: 18px">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="productCode" label="产品编码" />
          <el-table-column prop="name" label="名称" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
        </el-table>
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
          <el-table-column prop="maxDevices" label="设备数" width="100" />
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
          <el-table-column prop="licenseKey" label="授权码（License Key）" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">
              <el-button link type="primary" @click="copyText(row.licenseKey)">复制</el-button>
              <span class="key-text">{{ row.licenseKey }}</span>
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
          <el-table-column prop="license.licenseKey" label="授权码" min-width="210" />
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
                <el-option v-for="license in licenses" :key="license.id" :label="license.licenseKey" :value="license.id" />
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
          <el-table-column prop="license.licenseKey" label="授权码" min-width="210" />
          <el-table-column label="操作" width="210">
            <template #default="{ row }">
              <el-button size="small" @click="changeRiskEventStatus(row, 'resolved')">解决</el-button>
              <el-button size="small" @click="changeRiskEventStatus(row, 'ignored')">忽略</el-button>
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

        <div class="table-card" style="margin-top: 18px">
          <div class="toolbar">
            <div><strong>生成卡密</strong><span class="muted">适合渠道批次发放，可留空自动生成卡密串</span></div>
            <el-button type="danger" plain :disabled="!selectedCardKeys.length" @click="batchDisableCardKeys">批量禁用</el-button>
          </div>
          <el-form class="form-grid" label-position="top" @submit.prevent="submitCardKey">
            <el-form-item label="产品">
              <el-select v-model="cardKeyForm.productId" style="width: 100%">
                <el-option v-for="product in products" :key="product.id" :label="product.name" :value="product.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="套餐">
              <el-select v-model="cardKeyForm.planId" style="width: 100%">
                <el-option v-for="plan in plans" :key="plan.id" :label="plan.name" :value="plan.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="渠道">
              <el-select v-model="cardKeyForm.channelId" clearable style="width: 100%">
                <el-option v-for="channel in channels" :key="channel.id" :label="channel.name" :value="channel.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="卡密（留空自动生成）"><el-input v-model="cardKeyForm.cardKey" /></el-form-item>
            <el-form-item label="批次"><el-input v-model="cardKeyForm.batchCode" /></el-form-item>
            <el-form-item label="到期时间"><el-input v-model="cardKeyForm.expireAt" placeholder="2027-01-01T00:00:00.000Z" /></el-form-item>
            <el-button type="primary" native-type="submit">生成卡密</el-button>
          </el-form>
        </div>
        <el-table :data="cardKeys" class="data-table" size="small" stripe border empty-text="暂无卡密，点击上方按钮生成" @selection-change="handleCardKeySelection">
          <el-table-column type="selection" width="44" fixed />
          <el-table-column prop="cardKey" label="卡密" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">
              <el-button link type="primary" @click="copyText(row.cardKey)">复制</el-button>
              <span class="key-text">{{ row.cardKey }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="product.productCode" label="产品" width="130" />
          <el-table-column prop="plan.planCode" label="套餐" width="130" />
          <el-table-column prop="channel.name" label="渠道" width="140" />
          <el-table-column label="状态" width="120" sortable>
            <template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="changeCardKeyStatus(row, 'issued')">发放</el-button>
              <el-button size="small" type="danger" @click="changeCardKeyStatus(row, 'disabled')">禁用</el-button>
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
                <el-option v-for="license in licenses" :key="license.id" :label="license.licenseKey" :value="license.id" />
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
          <el-table-column prop="license.licenseKey" label="授权码" min-width="210" />
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
                <el-option v-for="license in licenses" :key="license.id" :label="license.licenseKey" :value="license.id" />
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
          <el-table-column prop="license.licenseKey" label="授权码" min-width="210" />
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
          <el-table-column prop="license.licenseKey" label="授权码" min-width="210" />
          <el-table-column prop="device.deviceCode" label="设备" min-width="160" />
          <el-table-column prop="resultCode" label="结果" width="140" />
          <el-table-column prop="message" label="消息" />
          <el-table-column prop="createdAt" label="时间" min-width="190" />
        </el-table>

        <el-table v-if="activeLogType === 'heartbeat'" :data="heartbeatLogs" size="small">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="license.licenseKey" label="授权码" min-width="210" />
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
