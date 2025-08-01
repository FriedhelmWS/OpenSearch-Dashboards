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

import moment from 'moment';
import dateMath from '@elastic/datemath';
import { IAggConfigs } from '../../../../../data/common';
import { search } from '../../../../../data/public';

export function getDimensions(aggs: IAggConfigs, data: any) {
  const [metric, agg] = aggs.aggs;
  const { from, to } = data.query.timefilter.timefilter.getTime();
  agg.params.timeRange = {
    from: dateMath.parse(from),
    to: dateMath.parse(to, { roundUp: true }),
  };
  const bounds = agg.params.timeRange
    ? data.query.timefilter.timefilter.calculateBounds(agg.params.timeRange)
    : null;
  const buckets = search.aggs.isDateHistogramBucketAggConfig(agg) ? agg.buckets : undefined;

  if (!buckets || !bounds) {
    return;
  }

  const { opensearchUnit, opensearchValue } = buckets.getInterval();
  return {
    x: {
      accessor: 0,
      label: agg.makeLabel(),
      format: agg.toSerializedFieldFormat(),
      params: {
        date: true,
        interval: moment.duration(opensearchValue, opensearchUnit),
        intervalOpenSearchValue: opensearchValue,
        intervalOpenSearchUnit: opensearchUnit,
        format: buckets.getScaledDateFormat(),
        bounds: buckets.getBounds(),
      },
    },
    y: {
      accessor: 1,
      format: metric.toSerializedFieldFormat(),
      label: metric.makeLabel(),
    },
  };
}
