/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { join } from 'path';
import { merge, get } from 'lodash';
import { execSync } from 'child_process';
// deep import to avoid loading the whole package
import { getDataPath } from '@osd/utils/target/path';
import { readFileSync } from 'fs';
import { ApmAgentConfig } from './types';

const getDefaultConfig = (isDistributable: boolean): ApmAgentConfig => {
  if (isDistributable) {
    return {
      active: false,
      globalLabels: {},
      // Do not use a centralized controlled config
      centralConfig: false,
      // Capture all exceptions that are not caught
      logUncaughtExceptions: true,
      // Can be performance intensive, disabling by default
      breakdownMetrics: false,
    };
  }

  return {
    active: false,
    serverUrl: 'https://f1542b814f674090afd914960583265f.apm.us-central1.gcp.cloud.es.io:443',
    // TODO: [RENAMEME] Update serverUrl and secretToken if we have replacements
    // The secretToken below is intended to be hardcoded in this file even though
    // it makes it public. This is not a security/privacy issue. Normally we'd
    // instead disable the need for a secretToken in the APM Server config where
    // the data is transmitted to, but due to how it's being hosted, it's easier,
    // for now, to simply leave it in.
    secretToken: 'R0Gjg46pE9K9wGestd',
    globalLabels: {},
    breakdownMetrics: true,
    centralConfig: false,
    logUncaughtExceptions: true,
  };
};

export class ApmConfiguration {
  private baseConfig?: any;
  private opensearchDashboardsVersion: string;
  private pkgBuild: Record<string, any>;

  constructor(
    private readonly rootDir: string,
    private readonly rawOpenSearchDashboardsConfig: Record<string, any>,
    private readonly isDistributable: boolean
  ) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version, build } = require(join(this.rootDir, 'package.json'));
    this.opensearchDashboardsVersion = version;
    this.pkgBuild = build;
  }

  public getConfig(serviceName: string): ApmAgentConfig {
    return {
      ...this.getBaseConfig(),
      serviceName,
    };
  }

  private getBaseConfig() {
    if (!this.baseConfig) {
      const apmConfig = merge(
        getDefaultConfig(this.isDistributable),
        this.getConfigFromOpenSearchDashboardsConfig(),
        this.getDevConfig(),
        this.getDistConfig()
      );

      const rev = this.getGitRev();
      if (rev !== null) {
        apmConfig.globalLabels.git_rev = rev;
      }

      const uuid = this.getOpenSearchDashboardsUuid();
      if (uuid) {
        apmConfig.globalLabels.opensearch_dashboards_uuid = uuid;
      }

      apmConfig.serviceVersion = this.opensearchDashboardsVersion;
      this.baseConfig = apmConfig;
    }

    return this.baseConfig;
  }

  private getConfigFromOpenSearchDashboardsConfig(): ApmAgentConfig {
    return get(this.rawOpenSearchDashboardsConfig, 'opensearch.apm', {});
  }

  private getOpenSearchDashboardsUuid() {
    // try to access the `server.uuid` value from the config file first.
    // if not manually defined, we will then read the value from the `{DATA_FOLDER}/uuid` file.
    // note that as the file is created by the platform AFTER apm init, the file
    // will not be present at first startup, but there is nothing we can really do about that.
    if (get(this.rawOpenSearchDashboardsConfig, 'server.uuid')) {
      return this.rawOpenSearchDashboardsConfig.server.uuid;
    }

    const dataPath: string = get(this.rawOpenSearchDashboardsConfig, 'path.data') || getDataPath();
    try {
      const filename = join(dataPath, 'uuid');
      return readFileSync(filename, 'utf8');
    } catch (e) {} // eslint-disable-line no-empty
  }

  private getDevConfig(): ApmAgentConfig {
    try {
      const apmDevConfigPath = join(this.rootDir, 'config', 'apm.dev.js');
      return require(apmDevConfigPath);
    } catch (e) {
      return {};
    }
  }

  /** Config keys that cannot be overridden in production builds */
  private getDistConfig(): ApmAgentConfig {
    if (!this.isDistributable) {
      return {};
    }

    return {
      // Headers & body may contain sensitive info
      captureHeaders: false,
      captureBody: 'off',
    };
  }

  private getGitRev() {
    if (this.isDistributable) {
      return this.pkgBuild.sha;
    }
    try {
      return execSync('git rev-parse --short HEAD', {
        encoding: 'utf-8' as BufferEncoding,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch (e) {
      return null;
    }
  }
}
