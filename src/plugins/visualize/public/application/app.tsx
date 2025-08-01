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

import './app.scss';
import React, { useEffect } from 'react';
import { Route, Switch, useLocation } from 'react-router-dom';

import { AppMountParameters } from 'opensearch-dashboards/public';
import { syncQueryStateWithUrl } from '../../../data/public';
import { useOpenSearchDashboards } from '../../../opensearch_dashboards_react/public';
// @ts-expect-error TS6133 TODO(ts-error): fixme
import { HeaderVariant } from '../../../../core/public/index';
import { VisualizeServices } from './types';
import {
  VisualizeEditor,
  VisualizeListing,
  VisualizeNoMatch,
  VisualizeByValueEditor,
} from './components';
import { VisualizeConstants } from './visualize_constants';

export interface VisualizeAppProps {
  onAppLeave: AppMountParameters['onAppLeave'];
}

export const VisualizeApp = ({ onAppLeave }: VisualizeAppProps) => {
  const {
    services: {
      data: { query },
      osdUrlStateStorage,
    },
  } = useOpenSearchDashboards<VisualizeServices>();
  const { pathname } = useLocation();

  useEffect(() => {
    // syncs `_g` portion of url with query services
    const { stop } = syncQueryStateWithUrl(query, osdUrlStateStorage);

    return () => stop();

    // this effect should re-run when pathname is changed to preserve querystring part,
    // so the global state is always preserved
  }, [query, osdUrlStateStorage, pathname]);

  return (
    <Switch>
      <Route exact path={`${VisualizeConstants.EDIT_BY_VALUE_PATH}`}>
        <VisualizeByValueEditor onAppLeave={onAppLeave} />
      </Route>
      <Route path={[VisualizeConstants.CREATE_PATH, `${VisualizeConstants.EDIT_PATH}/:id`]}>
        <VisualizeEditor onAppLeave={onAppLeave} />
      </Route>
      <Route
        exact
        path={[VisualizeConstants.LANDING_PAGE_PATH, VisualizeConstants.WIZARD_STEP_1_PAGE_PATH]}
      >
        <VisualizeListing />
      </Route>
      <VisualizeNoMatch />
    </Switch>
  );
};
