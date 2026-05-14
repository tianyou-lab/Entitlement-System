<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { clearToken, createLicense, createPlan, createProduct, createVersionPolicy, getToken, listActivationLogs, listAuditLogs, listDevices, listHeartbeatLogs, listLicenses, listPlans, listProducts, listVersionPolicies, login, updateDeviceStatus, updateLicenseStatus, updateVersionPolicy } from './api';
import type { ActivationLog, AuditLog, CreateLicenseInput, CreatePlanInput, CreateProductInput, CreateVersionPolicyInput, Device, HeartbeatLog, License, Plan, Product, VersionPolicy } from './types';

const token = ref(getToken());
const loading = ref(false);
const products = ref<Product[]>([]);
const plans = ref<Plan[]>([]);
const licenses = ref<License[]>([]);
const devices = ref<Device[]>([]);
const activationLogs = ref<ActivationLog[]>([]);
const heartbeatLogs = ref<HeartbeatLog[]>([]);
const auditLogs = ref<AuditLog[]>([]);
const versionPolicies = ref<VersionPolicy[]>([]);

const loginForm = reactive({ username: 'admin', password: 'admin123456' });
const productForm = reactive<CreateProductInput>({ productCode: '', name: '', description: '' });
const planForm = reactive<CreatePlanInput>({ productId: 0, planCode: '', name: '', durationDays: 365, maxDevices: 1, maxConcurrency: 1, graceHours: 24, featureFlags: { publish: true, maxWindowCount: 20 } });
const licenseForm = reactive<CreateLicenseInput>({ productId: 0, planId: 0, licenseKey: '', expireAt: '', maxDevicesOverride: undefined, featureFlagsOverride: undefined, notes: '' });
const versionPolicyForm = reactive<CreateVersionPolicyInput>({ productId: 0, minSupportedVersion: '1.0.0', latestVersion: '1.0.0', forceUpgrade: false, downloadUrl: '', notice: '' });

const isAuthenticated = computed(() => Boolean(token.value));

onMounted(async () => {
  if (isAuthenticated.value) await refreshAll();
});

async function submitLogin() {
  loading.value = true;
  try {
    const result = await login(loginForm.username, loginForm.password);
    token.value = result.accessToken;
    ElMessage.success(`欢迎 ${result.admin.username}`);
    await refreshAll();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败');
  } finally {
    loading.value = false;
  }
}

async function refreshAll() {
  loading.value = true;
  try {
    const [nextProducts, nextPlans, nextLicenses, nextDevices, nextActivationLogs, nextHeartbeatLogs, nextAuditLogs, nextVersionPolicies] = await Promise.all([
      listProducts(),
      listPlans(),
      listLicenses(),
      listDevices(),
      listActivationLogs(),
      listHeartbeatLogs(),
      listAuditLogs(),
      listVersionPolicies(),
    ]);
    products.value = nextProducts;
    plans.value = nextPlans;
    licenses.value = nextLicenses;
    devices.value = nextDevices;
    activationLogs.value = nextActivationLogs;
    heartbeatLogs.value = nextHeartbeatLogs;
    auditLogs.value = nextAuditLogs;
    versionPolicies.value = nextVersionPolicies;
    if (!planForm.productId && nextProducts[0]) planForm.productId = nextProducts[0].id;
    if (!licenseForm.productId && nextProducts[0]) licenseForm.productId = nextProducts[0].id;
    if (!licenseForm.planId && nextPlans[0]) licenseForm.planId = nextPlans[0].id;
    if (!versionPolicyForm.productId && nextProducts[0]) versionPolicyForm.productId = nextProducts[0].id;
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
  await withMessage('License 已创建', async () => {
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
  await withMessage('License 状态已更新', async () => {
    await updateLicenseStatus(row.id, status);
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

function logout() {
  clearToken();
  token.value = null;
}

const planFlagsText = ref(JSON.stringify(planForm.featureFlags, null, 2));
const licenseFlagsText = ref('');

function parseJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    throw new Error('Feature Flags 必须是合法 JSON');
  }
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
  <main v-if="!isAuthenticated" class="login-card">
    <h1>授权系统管理端</h1>
    <p>使用 Admin 账号登录后管理产品、套餐和 License。</p>
    <el-form label-position="top" @submit.prevent="submitLogin">
      <el-form-item label="用户名">
        <el-input v-model="loginForm.username" autocomplete="username" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="loginForm.password" type="password" autocomplete="current-password" show-password />
      </el-form-item>
      <el-button type="primary" :loading="loading" native-type="submit" style="width: 100%">登录</el-button>
    </el-form>
  </main>

  <main v-else class="admin-shell">
    <header class="header">
      <div>
        <h1>通用授权系统管理端</h1>
        <p>管理产品、套餐、License 状态与封禁流程。</p>
      </div>
      <div>
        <el-button @click="refreshAll">刷新</el-button>
        <el-button type="danger" plain @click="logout">退出</el-button>
      </div>
    </header>

    <el-tabs type="border-card" v-loading="loading">
      <el-tab-pane label="产品">
        <div class="table-card">
          <div class="toolbar">
            <strong>创建产品</strong>
            <span class="muted">productCode 必须与客户端 productCode 一致</span>
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
          <el-table-column prop="status" label="状态" width="120" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="套餐">
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
            <el-form-item class="full" label="Feature Flags JSON">
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
          <el-table-column prop="status" label="状态" width="120" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="License">
        <div class="table-card">
          <div class="toolbar"><strong>创建 License</strong></div>
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
            <el-form-item label="License Key（留空自动生成）">
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
            <el-form-item class="full" label="Feature Flags Override JSON">
              <el-input v-model="licenseFlagsText" type="textarea" :rows="3" placeholder="留空表示不覆盖" />
            </el-form-item>
            <el-button type="primary" native-type="submit">创建 License</el-button>
          </el-form>
        </div>
        <el-table :data="licenses" style="margin-top: 18px">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="licenseKey" label="License Key" min-width="210" />
          <el-table-column prop="product.productCode" label="产品" />
          <el-table-column prop="plan.planCode" label="套餐" />
          <el-table-column prop="status" label="状态" width="130" />
          <el-table-column prop="expireAt" label="到期时间" min-width="190" />
          <el-table-column label="操作" width="220">
            <template #default="{ row }">
              <el-button size="small" @click="changeLicenseStatus(row, 'active')">启用</el-button>
              <el-button size="small" type="danger" @click="changeLicenseStatus(row, 'banned')">封禁</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="设备">
        <el-table :data="devices">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="deviceCode" label="设备码" min-width="180" />
          <el-table-column prop="deviceName" label="名称" />
          <el-table-column prop="license.licenseKey" label="License" min-width="210" />
          <el-table-column prop="appVersion" label="应用版本" width="120" />
          <el-table-column prop="status" label="状态" width="120" />
          <el-table-column prop="lastSeenAt" label="最后在线" min-width="190" />
          <el-table-column label="操作" width="240">
            <template #default="{ row }">
              <el-button size="small" @click="changeDeviceStatus(row, 'active')">启用</el-button>
              <el-button size="small" @click="changeDeviceStatus(row, 'removed')">移除</el-button>
              <el-button size="small" type="danger" @click="changeDeviceStatus(row, 'banned')">封禁</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="版本策略">
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
      </el-tab-pane>

      <el-tab-pane label="日志">
        <h3>激活日志</h3>
        <el-table :data="activationLogs" size="small">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="license.licenseKey" label="License" min-width="210" />
          <el-table-column prop="device.deviceCode" label="设备" min-width="160" />
          <el-table-column prop="resultCode" label="结果" width="140" />
          <el-table-column prop="message" label="消息" />
          <el-table-column prop="createdAt" label="时间" min-width="190" />
        </el-table>

        <h3>心跳日志</h3>
        <el-table :data="heartbeatLogs" size="small">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="license.licenseKey" label="License" min-width="210" />
          <el-table-column prop="device.deviceCode" label="设备" min-width="160" />
          <el-table-column prop="actionType" label="动作" width="120" />
          <el-table-column prop="resultCode" label="结果" width="140" />
          <el-table-column prop="createdAt" label="时间" min-width="190" />
        </el-table>

        <h3>审计日志</h3>
        <el-table :data="auditLogs" size="small">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="targetType" label="对象" width="140" />
          <el-table-column prop="targetId" label="对象 ID" width="100" />
          <el-table-column prop="action" label="动作" />
          <el-table-column prop="createdAt" label="时间" min-width="190" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </main>
</template>
