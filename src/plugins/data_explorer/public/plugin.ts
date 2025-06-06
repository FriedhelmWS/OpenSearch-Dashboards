/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  AppNavLinkStatus,
  ScopedHistory,
  AppUpdater,
  DEFAULT_NAV_GROUPS,
} from '../../../core/public';
import {
  DataExplorerPluginSetup,
  DataExplorerPluginSetupDependencies,
  DataExplorerPluginStart,
  DataExplorerPluginStartDependencies,
  DataExplorerServices,
} from './types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { ViewService } from './services/view_service';
import {
  createOsdUrlStateStorage,
  createOsdUrlTracker,
  withNotifyOnErrors,
} from '../../opensearch_dashboards_utils/public';
import { getPreloadedStore } from './utils/state_management';
import { opensearchFilters } from '../../data/public';
import { setUsageCollector } from './services';
import { WorkspaceAvailability } from '../../../../src/core/public';

export class DataExplorerPlugin
  implements
    Plugin<
      DataExplorerPluginSetup,
      DataExplorerPluginStart,
      DataExplorerPluginSetupDependencies,
      DataExplorerPluginStartDependencies
    > {
  private viewService = new ViewService();
  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private stopUrlTracking?: () => void;
  private currentHistory?: ScopedHistory;

  public setup(
    core: CoreSetup<DataExplorerPluginStartDependencies, DataExplorerPluginStart>,
    { data, usageCollection }: DataExplorerPluginSetupDependencies
  ): DataExplorerPluginSetup {
    const viewService = this.viewService;

    setUsageCollector(usageCollection);
    const { appMounted, appUnMounted, stop: stopUrlTracker } = createOsdUrlTracker({
      baseUrl: core.http.basePath.prepend(`/app/${PLUGIN_ID}`),
      defaultSubUrl: '#/',
      storageKey: `lastUrl:${core.http.basePath.get()}:${PLUGIN_ID}`,
      navLinkUpdater$: this.appStateUpdater,
      toastNotifications: core.notifications.toasts,
      stateParams: [
        {
          osdUrlKey: '_g',
          stateUpdate$: data.query.state$.pipe(
            filter(
              ({ changes }) => !!(changes.globalFilters || changes.time || changes.refreshInterval)
            ),
            map(({ state }) => ({
              ...state,
              filters: state.filters?.filter(opensearchFilters.isFilterPinned),
            }))
          ),
        },
      ],
      getHistory: () => {
        return this.currentHistory!;
      },
    });
    this.stopUrlTracking = () => {
      stopUrlTracker();
    };

    // Register an application into the side navigation menu
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      navLinkStatus: AppNavLinkStatus.hidden,
      workspaceAvailability: WorkspaceAvailability.insideWorkspace,
      mount: async (params: AppMountParameters) => {
        // Load application bundle
        const { renderApp } = await import('./application');

        const [coreStart, pluginsStart] = await core.getStartServices();
        this.currentHistory = params.history;

        // make sure the index pattern list is up to date
        pluginsStart.data.indexPatterns.clearCache();

        const services: DataExplorerServices = {
          ...coreStart,
          scopedHistory: this.currentHistory,
          data: pluginsStart.data,
          embeddable: pluginsStart.embeddable,
          expressions: pluginsStart.expressions,
          osdUrlStateStorage: createOsdUrlStateStorage({
            history: this.currentHistory,
            useHash: coreStart.uiSettings.get('state:storeInSessionStorage'),
            ...withNotifyOnErrors(coreStart.notifications.toasts),
          }),
          viewRegistry: viewService.start(),
        };

        // Get start services as specified in opensearch_dashboards.json
        // Render the application
        const { store, unsubscribe: unsubscribeStore } = await getPreloadedStore(services);
        services.store = store;

        const unmount = renderApp(coreStart, services, params, store);
        appMounted();

        return () => {
          unsubscribeStore();
          appUnMounted();
          unmount();
        };
      },
    });

    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      {
        id: PLUGIN_ID,
        order: 301, // The nav link should be put behind discover
      },
    ]);

    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS['security-analytics'], [
      {
        id: PLUGIN_ID,
        order: 301,
      },
    ]);

    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.essentials, [
      {
        id: PLUGIN_ID,
        order: 201,
      },
    ]);

    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.search, [
      {
        id: PLUGIN_ID,
        order: 201,
      },
    ]);

    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.all, [
      {
        id: PLUGIN_ID,
        order: 201,
      },
    ]);

    return {
      ...this.viewService.setup(),
    };
  }

  public start(core: CoreStart): DataExplorerPluginStart {
    return {};
  }

  public stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
