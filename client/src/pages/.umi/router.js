import React from 'react';
import {
  Router as DefaultRouter,
  Route,
  Switch,
  StaticRouter,
} from 'react-router-dom';
import dynamic from 'umi/dynamic';
import renderRoutes from 'umi/lib/renderRoutes';
import history from '@@/history';
import RendererWrapper0 from 'D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/.umi/LocaleWrapper.jsx';
import _dvaDynamic from 'dva/dynamic';

const Router = require('dva/router').routerRedux.ConnectedRouter;

const routes = [
  {
    path: '/accounts',
    component: __IS_BROWSER
      ? _dvaDynamic({
          component: () => import('../../layouts/UserLayout'),
          LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
            .default,
        })
      : require('../../layouts/UserLayout').default,
    routes: [
      {
        path: '/accounts',
        redirect: '/Account/Login/login',
        exact: true,
      },
      {
        path: '/accounts/login',
        component: __IS_BROWSER
          ? _dvaDynamic({
              app: require('@tmp/dva').getApp(),
              models: () => [
                import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/models/register.js').then(
                  m => {
                    return { namespace: 'register', ...m.default };
                  },
                ),
              ],
              component: () => import('../Account/Login/Login'),
              LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                .default,
            })
          : require('../Account/Login/Login').default,
        exact: true,
      },
      {
        path: '/accounts/register',
        component: __IS_BROWSER
          ? _dvaDynamic({
              app: require('@tmp/dva').getApp(),
              models: () => [
                import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/models/register.js').then(
                  m => {
                    return { namespace: 'register', ...m.default };
                  },
                ),
              ],
              component: () => import('../Account/Register/Register'),
              LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                .default,
            })
          : require('../Account/Register/Register').default,
        exact: true,
      },
      {
        path: '/accounts/register-result',
        component: __IS_BROWSER
          ? _dvaDynamic({
              app: require('@tmp/dva').getApp(),
              models: () => [
                import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/models/register.js').then(
                  m => {
                    return { namespace: 'register', ...m.default };
                  },
                ),
              ],
              component: () =>
                import('../Account/RegisterResult/RegisterResult'),
              LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                .default,
            })
          : require('../Account/RegisterResult/RegisterResult').default,
        exact: true,
      },
      {
        component: () =>
          React.createElement(
            require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/node_modules/umi-build-dev/lib/plugins/404/NotFound.js')
              .default,
            { pagesPath: 'src/pages', hasRoutesInConfig: true },
          ),
      },
    ],
  },
  {
    path: '/',
    component: __IS_BROWSER
      ? _dvaDynamic({
          component: () => import('../../layouts/BasicLayout'),
          LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
            .default,
        })
      : require('../../layouts/BasicLayout').default,
    Routes: [require('../Authorized').default],
    routes: [
      {
        path: '/',
        redirect: '/analysis',
        exact: true,
      },
      {
        path: '/analysis',
        name: 'analysis',
        icon: 'precise-shouye',
        component: __IS_BROWSER
          ? _dvaDynamic({
              app: require('@tmp/dva').getApp(),
              models: () => [
                import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Dashboard/models/activities.js').then(
                  m => {
                    return { namespace: 'activities', ...m.default };
                  },
                ),
                import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Dashboard/models/chart.js').then(
                  m => {
                    return { namespace: 'chart', ...m.default };
                  },
                ),
                import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Dashboard/models/monitor.js').then(
                  m => {
                    return { namespace: 'monitor', ...m.default };
                  },
                ),
              ],
              component: () => import('../Dashboard/Analysis'),
              LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                .default,
            })
          : require('../Dashboard/Analysis').default,
        exact: true,
      },
      {
        path: '/dashboard',
        name: 'dashboard',
        icon: 'precise-gongzuotai',
        routes: [
          {
            path: '/dashboard/workplace',
            name: 'workplace',
            icon: 'precise-zhuzhuangtu',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  app: require('@tmp/dva').getApp(),
                  models: () => [
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Dashboard/models/activities.js').then(
                      m => {
                        return { namespace: 'activities', ...m.default };
                      },
                    ),
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Dashboard/models/chart.js').then(
                      m => {
                        return { namespace: 'chart', ...m.default };
                      },
                    ),
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Dashboard/models/monitor.js').then(
                      m => {
                        return { namespace: 'monitor', ...m.default };
                      },
                    ),
                  ],
                  component: () => import('../Dashboard/Workplace'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Dashboard/Workplace').default,
            exact: true,
          },
          {
            path: '/dashboard/monitor',
            name: 'monitor',
            icon: 'precise-jiankong',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  app: require('@tmp/dva').getApp(),
                  models: () => [
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Dashboard/models/activities.js').then(
                      m => {
                        return { namespace: 'activities', ...m.default };
                      },
                    ),
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Dashboard/models/chart.js').then(
                      m => {
                        return { namespace: 'chart', ...m.default };
                      },
                    ),
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Dashboard/models/monitor.js').then(
                      m => {
                        return { namespace: 'monitor', ...m.default };
                      },
                    ),
                  ],
                  component: () => import('../Dashboard/Monitor'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Dashboard/Monitor').default,
            exact: true,
          },
          {
            component: () =>
              React.createElement(
                require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/node_modules/umi-build-dev/lib/plugins/404/NotFound.js')
                  .default,
                { pagesPath: 'src/pages', hasRoutesInConfig: true },
              ),
          },
        ],
      },
      {
        path: '/arcgis',
        icon: 'precise-17',
        name: 'arcgis',
        routes: [
          {
            path: '/arcgis/arcgismap',
            name: 'arcgismap',
            icon: 'precise-changyongshili',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  component: () => import('../ArcgisMap'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../ArcgisMap').default,
            exact: true,
          },
          {
            component: () =>
              React.createElement(
                require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/node_modules/umi-build-dev/lib/plugins/404/NotFound.js')
                  .default,
                { pagesPath: 'src/pages', hasRoutesInConfig: true },
              ),
          },
        ],
      },
      {
        path: '/list',
        icon: 'table',
        name: 'list',
        routes: [
          {
            path: '/list/table-list',
            name: 'searchtable',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  app: require('@tmp/dva').getApp(),
                  models: () => [
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/List/models/rule.js').then(
                      m => {
                        return { namespace: 'rule', ...m.default };
                      },
                    ),
                  ],
                  component: () => import('../List/TableList'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../List/TableList').default,
            exact: true,
          },
          {
            path: '/list/basic-list',
            name: 'basiclist',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  app: require('@tmp/dva').getApp(),
                  models: () => [
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/List/models/rule.js').then(
                      m => {
                        return { namespace: 'rule', ...m.default };
                      },
                    ),
                  ],
                  component: () => import('../List/BasicList'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../List/BasicList').default,
            exact: true,
          },
          {
            path: '/list/card-list',
            name: 'cardlist',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  app: require('@tmp/dva').getApp(),
                  models: () => [
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/List/models/rule.js').then(
                      m => {
                        return { namespace: 'rule', ...m.default };
                      },
                    ),
                  ],
                  component: () => import('../List/CardList'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../List/CardList').default,
            exact: true,
          },
          {
            path: '/list/search',
            name: 'searchlist',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  app: require('@tmp/dva').getApp(),
                  models: () => [
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/List/models/rule.js').then(
                      m => {
                        return { namespace: 'rule', ...m.default };
                      },
                    ),
                  ],
                  component: () => import('../List/List'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../List/List').default,
            routes: [
              {
                path: '/list/search',
                redirect: '/list/search/articles',
                exact: true,
              },
              {
                path: '/list/search/articles',
                name: 'articles',
                component: __IS_BROWSER
                  ? _dvaDynamic({
                      app: require('@tmp/dva').getApp(),
                      models: () => [
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/List/models/rule.js').then(
                          m => {
                            return { namespace: 'rule', ...m.default };
                          },
                        ),
                      ],
                      component: () => import('../List/Articles'),
                      LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                        .default,
                    })
                  : require('../List/Articles').default,
                exact: true,
              },
              {
                path: '/list/search/projects',
                name: 'projects',
                component: __IS_BROWSER
                  ? _dvaDynamic({
                      app: require('@tmp/dva').getApp(),
                      models: () => [
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/List/models/rule.js').then(
                          m => {
                            return { namespace: 'rule', ...m.default };
                          },
                        ),
                      ],
                      component: () => import('../List/Projects'),
                      LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                        .default,
                    })
                  : require('../List/Projects').default,
                exact: true,
              },
              {
                path: '/list/search/applications',
                name: 'applications',
                component: __IS_BROWSER
                  ? _dvaDynamic({
                      app: require('@tmp/dva').getApp(),
                      models: () => [
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/List/models/rule.js').then(
                          m => {
                            return { namespace: 'rule', ...m.default };
                          },
                        ),
                      ],
                      component: () => import('../List/Applications'),
                      LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                        .default,
                    })
                  : require('../List/Applications').default,
                exact: true,
              },
              {
                component: () =>
                  React.createElement(
                    require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/node_modules/umi-build-dev/lib/plugins/404/NotFound.js')
                      .default,
                    { pagesPath: 'src/pages', hasRoutesInConfig: true },
                  ),
              },
            ],
          },
          {
            component: () =>
              React.createElement(
                require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/node_modules/umi-build-dev/lib/plugins/404/NotFound.js')
                  .default,
                { pagesPath: 'src/pages', hasRoutesInConfig: true },
              ),
          },
        ],
      },
      {
        path: '/admin',
        name: 'admin',
        authority: ['Pages.Administration'],
        icon: 'precise-xitongguanli',
        routes: [
          {
            path: '/admin/organization',
            name: 'organization',
            authority: ['Pages.Administration.OrganizationUnits'],
            icon: 'cluster',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  component: () => import('../Admin/OrganizationUnit'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Admin/OrganizationUnit').default,
            exact: true,
          },
          {
            path: '/admin/role',
            name: 'role',
            authority: ['Pages.Administration.Roles'],
            icon: 'idcard',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  component: () => import('../Admin/Role'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Admin/Role').default,
            exact: true,
          },
          {
            path: '/admin/user',
            name: 'user',
            authority: ['Pages.Administration.Users'],
            icon: 'user',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  component: () => import('../Precise/Users'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Precise/Users').default,
            exact: true,
          },
          {
            path: '/admin/workflow',
            name: 'workflow',
            icon: 'precise-navicon-lcpz',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  component: () => import('../Admin/WorkFlow/EditWork'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Admin/WorkFlow/EditWork').default,
            exact: true,
          },
          {
            path: '/admin/auditLog',
            name: 'auditLog',
            authority: ['Pages.Administration.AuditLogs'],
            icon: 'precise-rizhi',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  component: () => import('../Admin/AuditLog'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Admin/AuditLog').default,
            exact: true,
          },
          {
            path: '/admin/ui',
            name: 'ui',
            authority: ['Pages.Administration.UiCustomization'],
            icon: 'precise-yanjing',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  component: () => import('../Admin/UiCustomization'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Admin/UiCustomization').default,
            exact: true,
          },
          {
            path: '/admin/settings',
            name: 'settings',
            authority: [
              'Pages.Administration.Tenant.Settings',
              'Pages.Administration.Host.Settings',
            ],
            icon: 'precise-shezhi',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  component: () => import('../Admin/Settings'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Admin/Settings').default,
            exact: true,
          },
          {
            component: () =>
              React.createElement(
                require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/node_modules/umi-build-dev/lib/plugins/404/NotFound.js')
                  .default,
                { pagesPath: 'src/pages', hasRoutesInConfig: true },
              ),
          },
        ],
      },
      {
        path: '/account',
        routes: [
          {
            path: '/account/center',
            name: 'center',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  app: require('@tmp/dva').getApp(),
                  models: () => [
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/models/register.js').then(
                      m => {
                        return { namespace: 'register', ...m.default };
                      },
                    ),
                  ],
                  component: () => import('../Account/Center/Center'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Account/Center/Center').default,
            routes: [
              {
                path: '/account/center',
                redirect: '/account/center/articles',
                exact: true,
              },
              {
                path: '/account/center/articles',
                component: __IS_BROWSER
                  ? _dvaDynamic({
                      app: require('@tmp/dva').getApp(),
                      models: () => [
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/models/register.js').then(
                          m => {
                            return { namespace: 'register', ...m.default };
                          },
                        ),
                      ],
                      component: () => import('../Account/Center/Articles'),
                      LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                        .default,
                    })
                  : require('../Account/Center/Articles').default,
                exact: true,
              },
              {
                path: '/account/center/applications',
                component: __IS_BROWSER
                  ? _dvaDynamic({
                      app: require('@tmp/dva').getApp(),
                      models: () => [
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/models/register.js').then(
                          m => {
                            return { namespace: 'register', ...m.default };
                          },
                        ),
                      ],
                      component: () => import('../Account/Center/Applications'),
                      LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                        .default,
                    })
                  : require('../Account/Center/Applications').default,
                exact: true,
              },
              {
                path: '/account/center/projects',
                component: __IS_BROWSER
                  ? _dvaDynamic({
                      app: require('@tmp/dva').getApp(),
                      models: () => [
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/models/register.js').then(
                          m => {
                            return { namespace: 'register', ...m.default };
                          },
                        ),
                      ],
                      component: () => import('../Account/Center/Projects'),
                      LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                        .default,
                    })
                  : require('../Account/Center/Projects').default,
                exact: true,
              },
              {
                component: () =>
                  React.createElement(
                    require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/node_modules/umi-build-dev/lib/plugins/404/NotFound.js')
                      .default,
                    { pagesPath: 'src/pages', hasRoutesInConfig: true },
                  ),
              },
            ],
          },
          {
            path: '/account/settings',
            name: 'settings',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  app: require('@tmp/dva').getApp(),
                  models: () => [
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/Settings/models/geographic.js').then(
                      m => {
                        return { namespace: 'geographic', ...m.default };
                      },
                    ),
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/models/register.js').then(
                      m => {
                        return { namespace: 'register', ...m.default };
                      },
                    ),
                  ],
                  component: () => import('../Account/Settings/Info'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Account/Settings/Info').default,
            routes: [
              {
                path: '/account/settings',
                redirect: '/account/settings/base',
                exact: true,
              },
              {
                path: '/account/settings/base',
                component: __IS_BROWSER
                  ? _dvaDynamic({
                      app: require('@tmp/dva').getApp(),
                      models: () => [
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/Settings/models/geographic.js').then(
                          m => {
                            return { namespace: 'geographic', ...m.default };
                          },
                        ),
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/models/register.js').then(
                          m => {
                            return { namespace: 'register', ...m.default };
                          },
                        ),
                      ],
                      component: () => import('../Account/Settings/BaseView'),
                      LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                        .default,
                    })
                  : require('../Account/Settings/BaseView').default,
                exact: true,
              },
              {
                path: '/account/settings/security',
                component: __IS_BROWSER
                  ? _dvaDynamic({
                      app: require('@tmp/dva').getApp(),
                      models: () => [
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/Settings/models/geographic.js').then(
                          m => {
                            return { namespace: 'geographic', ...m.default };
                          },
                        ),
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/models/register.js').then(
                          m => {
                            return { namespace: 'register', ...m.default };
                          },
                        ),
                      ],
                      component: () =>
                        import('../Account/Settings/SecurityView'),
                      LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                        .default,
                    })
                  : require('../Account/Settings/SecurityView').default,
                exact: true,
              },
              {
                path: '/account/settings/binding',
                component: __IS_BROWSER
                  ? _dvaDynamic({
                      app: require('@tmp/dva').getApp(),
                      models: () => [
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/Settings/models/geographic.js').then(
                          m => {
                            return { namespace: 'geographic', ...m.default };
                          },
                        ),
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/models/register.js').then(
                          m => {
                            return { namespace: 'register', ...m.default };
                          },
                        ),
                      ],
                      component: () =>
                        import('../Account/Settings/BindingView'),
                      LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                        .default,
                    })
                  : require('../Account/Settings/BindingView').default,
                exact: true,
              },
              {
                path: '/account/settings/notification',
                component: __IS_BROWSER
                  ? _dvaDynamic({
                      app: require('@tmp/dva').getApp(),
                      models: () => [
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/Settings/models/geographic.js').then(
                          m => {
                            return { namespace: 'geographic', ...m.default };
                          },
                        ),
                        import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Account/models/register.js').then(
                          m => {
                            return { namespace: 'register', ...m.default };
                          },
                        ),
                      ],
                      component: () =>
                        import('../Account/Settings/NotificationView'),
                      LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                        .default,
                    })
                  : require('../Account/Settings/NotificationView').default,
                exact: true,
              },
              {
                component: () =>
                  React.createElement(
                    require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/node_modules/umi-build-dev/lib/plugins/404/NotFound.js')
                      .default,
                    { pagesPath: 'src/pages', hasRoutesInConfig: true },
                  ),
              },
            ],
          },
          {
            component: () =>
              React.createElement(
                require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/node_modules/umi-build-dev/lib/plugins/404/NotFound.js')
                  .default,
                { pagesPath: 'src/pages', hasRoutesInConfig: true },
              ),
          },
        ],
      },
      {
        path: '/exception',
        routes: [
          {
            path: '/exception/403',
            name: 'not-permission',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  app: require('@tmp/dva').getApp(),
                  models: () => [
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Exception/models/error.js').then(
                      m => {
                        return { namespace: 'error', ...m.default };
                      },
                    ),
                  ],
                  component: () => import('../Exception/403'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Exception/403').default,
            exact: true,
          },
          {
            path: '/exception/404',
            name: 'not-find',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  app: require('@tmp/dva').getApp(),
                  models: () => [
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Exception/models/error.js').then(
                      m => {
                        return { namespace: 'error', ...m.default };
                      },
                    ),
                  ],
                  component: () => import('../Exception/404'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Exception/404').default,
            exact: true,
          },
          {
            path: '/exception/500',
            name: 'server-error',
            component: __IS_BROWSER
              ? _dvaDynamic({
                  app: require('@tmp/dva').getApp(),
                  models: () => [
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Exception/models/error.js').then(
                      m => {
                        return { namespace: 'error', ...m.default };
                      },
                    ),
                  ],
                  component: () => import('../Exception/500'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Exception/500').default,
            exact: true,
          },
          {
            path: '/exception/trigger',
            name: 'trigger',
            hideInMenu: true,
            component: __IS_BROWSER
              ? _dvaDynamic({
                  app: require('@tmp/dva').getApp(),
                  models: () => [
                    import('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/pages/Exception/models/error.js').then(
                      m => {
                        return { namespace: 'error', ...m.default };
                      },
                    ),
                  ],
                  component: () => import('../Exception/TriggerException'),
                  LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                    .default,
                })
              : require('../Exception/TriggerException').default,
            exact: true,
          },
          {
            component: () =>
              React.createElement(
                require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/node_modules/umi-build-dev/lib/plugins/404/NotFound.js')
                  .default,
                { pagesPath: 'src/pages', hasRoutesInConfig: true },
              ),
          },
        ],
      },
      {
        component: __IS_BROWSER
          ? _dvaDynamic({
              component: () => import('../404'),
              LoadingComponent: require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/src/components/PageLoading/index')
                .default,
            })
          : require('../404').default,
        exact: true,
      },
      {
        component: () =>
          React.createElement(
            require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/node_modules/umi-build-dev/lib/plugins/404/NotFound.js')
              .default,
            { pagesPath: 'src/pages', hasRoutesInConfig: true },
          ),
      },
    ],
  },
  {
    component: () =>
      React.createElement(
        require('D:/guyver/pro/abp-react-antd-master/Precise-Antd/node_modules/umi-build-dev/lib/plugins/404/NotFound.js')
          .default,
        { pagesPath: 'src/pages', hasRoutesInConfig: true },
      ),
  },
];
window.g_routes = routes;
const plugins = require('umi/_runtimePlugin');
plugins.applyForEach('patchRoutes', { initialValue: routes });

export { routes };

export default class RouterWrapper extends React.Component {
  unListen() {}

  constructor(props) {
    super(props);

    // route change handler
    function routeChangeHandler(location, action) {
      plugins.applyForEach('onRouteChange', {
        initialValue: {
          routes,
          location,
          action,
        },
      });
    }
    this.unListen = history.listen(routeChangeHandler);
    // dva 中 history.listen 会初始执行一次
    // 这里排除掉 dva 的场景，可以避免 onRouteChange 在启用 dva 后的初始加载时被多执行一次
    const isDva =
      history.listen
        .toString()
        .indexOf('callback(history.location, history.action)') > -1;
    if (!isDva) {
      routeChangeHandler(history.location);
    }
  }

  componentWillUnmount() {
    this.unListen();
  }

  render() {
    const props = this.props || {};
    return (
      <RendererWrapper0>
        <Router history={history}>{renderRoutes(routes, props)}</Router>
      </RendererWrapper0>
    );
  }
}
