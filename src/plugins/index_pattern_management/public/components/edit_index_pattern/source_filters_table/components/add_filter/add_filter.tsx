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

import React, { useState, useCallback } from 'react';

import { i18n } from '@osd/i18n';
import { FormattedMessage } from '@osd/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiCompressedFieldText, EuiSmallButton } from '@elastic/eui';

interface AddFilterProps {
  onAddFilter: (filter: string) => void;
  useUpdatedUX: boolean;
}

const sourcePlaceholder = i18n.translate(
  'indexPatternManagement.editIndexPattern.sourcePlaceholder',
  {
    defaultMessage:
      "source filter, accepts wildcards (e.g., `user*` to filter fields starting with 'user')",
  }
);

export const AddFilter = ({ onAddFilter, useUpdatedUX }: AddFilterProps) => {
  const [filter, setFilter] = useState<string>('');

  const onAddButtonClick = useCallback(() => {
    onAddFilter(filter);
    setFilter('');
  }, [filter, onAddFilter]);

  return (
    <EuiFlexGroup {...(useUpdatedUX ? { gutterSize: 's' } : {})}>
      <EuiFlexItem grow={10}>
        <EuiCompressedFieldText
          fullWidth
          value={filter}
          onChange={(e) => setFilter(e.target.value.trim())}
          placeholder={sourcePlaceholder}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSmallButton isDisabled={filter.length === 0} onClick={onAddButtonClick}>
          <FormattedMessage
            id="indexPatternManagement.editIndexPattern.source.addButtonLabel"
            defaultMessage="Add"
          />
        </EuiSmallButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
