import { LicenseUiState, LicenseUiTheme } from '../types';

const content: Record<Exclude<LicenseUiState, 'activate'>, { title: string; message: string; action: string }> = {
  expired: { title: '授权已到期', message: '当前 License 已过期，请续费后继续使用。', action: '联系续费' },
  'device-limit': { title: '设备数量已满', message: '该 License 已达到可绑定设备上限，请联系管理员解绑旧设备。', action: '联系管理员' },
  'force-upgrade': { title: '需要升级客户端', message: '当前版本已不可用，请升级到最新版本后继续使用。', action: '下载最新版本' },
  'network-error': { title: '网络连接异常', message: '无法连接授权服务器，如仍在宽限期内可稍后重试。', action: '重试' },
  banned: { title: '授权已被禁用', message: '当前 License 已被后台禁用，请联系管理员处理。', action: '联系管理员' },
  invalid: { title: '授权不可用', message: '当前授权状态异常，请重新激活或联系管理员。', action: '重新激活' },
};

export function renderStatus(state: Exclude<LicenseUiState, 'activate'>, theme: LicenseUiTheme) {
  const item = content[state];
  return `
    <section class="card" data-testid="status-screen">
      ${theme.logoUrl ? `<img class="logo" src="${theme.logoUrl}" alt="${theme.productName}" />` : `<div class="logo-mark">${theme.productName.slice(0, 1)}</div>`}
      <p class="eyebrow">${theme.productName}</p>
      <h1>${theme.texts[state] ?? item.title}</h1>
      <p class="description">${item.message}</p>
      <div class="status-box">${theme.supportText}</div>
      <button class="primary" id="status-action">${item.action}</button>
    </section>
  `;
}
