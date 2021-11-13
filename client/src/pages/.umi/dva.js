import dva from 'dva';
import { Component } from 'react';
import createLoading from 'dva-loading';
import history from '@tmp/history';

let app = null;

export function _onCreate() {
  const plugins = require('umi/_runtimePlugin');
  const runtimeDva = plugins.mergeConfig('dva');
  app = dva({
    history,
    
    ...(runtimeDva.config || {}),
    ...(window.g_useSSR ? { initialState: window.g_initialData } : {}),
  });
  
  app.use(createLoading());
  (runtimeDva.plugins || []).forEach(plugin => {
    app.use(plugin);
  });
  
  app.model({ namespace: 'auditLog', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/admin/auditLog.js').default) });
app.model({ namespace: 'organization', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/admin/organization.js').default) });
app.model({ namespace: 'permission', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/admin/permission.js').default) });
app.model({ namespace: 'role', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/admin/role.js').default) });
app.model({ namespace: 'user', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/admin/user.js').default) });
app.model({ namespace: 'global', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/global.js').default) });
app.model({ namespace: 'list', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/list.js').default) });
app.model({ namespace: 'login', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/login.js').default) });
app.model({ namespace: 'menu', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/menu.js').default) });
app.model({ namespace: 'account', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/account.js').default) });
app.model({ namespace: 'auditLog', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/auditLog.js').default) });
app.model({ namespace: 'caching', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/caching.js').default) });
app.model({ namespace: 'chat', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/chat.js').default) });
app.model({ namespace: 'commonLookup', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/commonLookup.js').default) });
app.model({ namespace: 'demoUiComponents', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/demoUiComponents.js').default) });
app.model({ namespace: 'edition', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/edition.js').default) });
app.model({ namespace: 'friendship', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/friendship.js').default) });
app.model({ namespace: 'hostDashboard', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/hostDashboard.js').default) });
app.model({ namespace: 'hostSettings', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/hostSettings.js').default) });
app.model({ namespace: 'install', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/install.js').default) });
app.model({ namespace: 'invoice', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/invoice.js').default) });
app.model({ namespace: 'language', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/language.js').default) });
app.model({ namespace: 'notification', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/notification.js').default) });
app.model({ namespace: 'organizationUnit', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/organizationUnit.js').default) });
app.model({ namespace: 'payment', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/payment.js').default) });
app.model({ namespace: 'permission', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/permission.js').default) });
app.model({ namespace: 'profile', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/profile.js').default) });
app.model({ namespace: 'role', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/role.js').default) });
app.model({ namespace: 'session', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/session.js').default) });
app.model({ namespace: 'subscription', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/subscription.js').default) });
app.model({ namespace: 'tenant', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/tenant.js').default) });
app.model({ namespace: 'tenantDashboard', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/tenantDashboard.js').default) });
app.model({ namespace: 'tenantRegistration', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/tenantRegistration.js').default) });
app.model({ namespace: 'tenantSettings', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/tenantSettings.js').default) });
app.model({ namespace: 'timing', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/timing.js').default) });
app.model({ namespace: 'tokenAuth', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/tokenAuth.js').default) });
app.model({ namespace: 'uiCustomizationSettings', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/uiCustomizationSettings.js').default) });
app.model({ namespace: 'user', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/user.js').default) });
app.model({ namespace: 'userLink', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/userLink.js').default) });
app.model({ namespace: 'userLogin', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/userLogin.js').default) });
app.model({ namespace: 'webLog', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/precise/webLog.js').default) });
app.model({ namespace: 'project', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/project.js').default) });
app.model({ namespace: 'setting', ...(require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/models/setting.js').default) });
  return app;
}

export function getApp() {
  return app;
}

export class _DvaContainer extends Component {
  render() {
    const app = getApp();
    app.router(() => this.props.children);
    return app.start()();
  }
}
