import './styles.css';

interface DemoLicenseView {
  status: string;
  code?: string;
  message?: string;
  leaseExpireAt?: string;
  featureFlags: Record<string, unknown>;
  canPublish: boolean;
  maxWindowCount?: number;
}

declare global {
  interface Window {
    demoLicense?: {
      getState(): Promise<DemoLicenseView>;
      verify(): Promise<DemoLicenseView>;
      startHeartbeat(): Promise<DemoLicenseView>;
      stopHeartbeat(): Promise<DemoLicenseView>;
      deactivate(licenseKey: string): Promise<DemoLicenseView>;
      openLicenseWindow(): Promise<void>;
      onChanged(handler: (state: DemoLicenseView) => void): () => void;
    };
  }
}

const app = document.querySelector<HTMLDivElement>('#app');
let state: DemoLicenseView = { status: 'inactive', featureFlags: {}, canPublish: false };

async function init() {
  if (!window.demoLicense) {
    state = {
      status: 'inactive',
      code: 'NO_ELECTRON_BRIDGE',
      message: '请在 Electron Demo 中运行以启用授权联调',
      featureFlags: {},
      canPublish: false,
    };
    render();
    return;
  }

  state = await window.demoLicense.getState();
  render();
  window.demoLicense.onChanged((next) => {
    state = next;
    render();
  });
}

function render() {
  if (!app) return;
  app.innerHTML = `
    <section class="shell">
      <div class="header">
        <div>
          <p class="eyebrow">Electron Demo</p>
          <h1>通用授权系统客户端联调</h1>
        </div>
        <span class="badge ${cssClass(state.status)}">${escapeHtml(state.status)}</span>
      </div>

      <div class="grid">
        <article class="card">
          <h2>授权状态</h2>
          <dl>
            <div><dt>状态</dt><dd>${escapeHtml(state.status)}</dd></div>
            <div><dt>错误码</dt><dd>${escapeHtml(state.code ?? '-')}</dd></div>
            <div><dt>消息</dt><dd>${escapeHtml(state.message ?? '-')}</dd></div>
            <div><dt>Lease 到期</dt><dd>${escapeHtml(state.leaseExpireAt ?? '-')}</dd></div>
          </dl>
        </article>

        <article class="card">
          <h2>Feature Gate</h2>
          <dl>
            <div><dt>publish</dt><dd>${state.canPublish ? '可用' : '不可用'}</dd></div>
            <div><dt>maxWindowCount</dt><dd>${escapeHtml(String(state.maxWindowCount ?? '-'))}</dd></div>
          </dl>
          <pre>${escapeHtml(JSON.stringify(state.featureFlags, null, 2))}</pre>
        </article>
      </div>

      <div class="actions">
        <button id="verify">启动验证</button>
        <button id="start-heartbeat">开始心跳</button>
        <button id="stop-heartbeat">停止心跳</button>
        <button id="open-license">打开授权窗口</button>
        <button id="deactivate" class="danger">解绑</button>
      </div>
    </section>
  `;
  bindActions();
}

function bindActions() {
  const bridge = window.demoLicense;
  document.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.disabled = !bridge;
  });
  if (!bridge) return;

  document.querySelector('#verify')?.addEventListener('click', () => run(() => bridge.verify()));
  document.querySelector('#start-heartbeat')?.addEventListener('click', () => run(() => bridge.startHeartbeat()));
  document.querySelector('#stop-heartbeat')?.addEventListener('click', () => run(() => bridge.stopHeartbeat()));
  document.querySelector('#open-license')?.addEventListener('click', () => void bridge.openLicenseWindow());
  document.querySelector('#deactivate')?.addEventListener('click', async () => {
    const key = prompt('输入要解绑的 License Key');
    if (key) await run(() => bridge.deactivate(key));
  });
}

async function run(action: () => Promise<DemoLicenseView>) {
  state = await action();
  render();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);
}

function cssClass(value: string) {
  return value.replace(/[^a-z0-9-]/gi, '');
}

void init();
