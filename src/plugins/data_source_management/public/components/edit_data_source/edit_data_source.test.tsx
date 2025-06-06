/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getMappedDataSources,
  mockDataSourceAttributesWithAuth,
  mockManagementPlugin,
} from '../../mocks';
import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { scopedHistoryMock } from '../../../../../core/public/mocks';
import { ScopedHistory } from 'opensearch-dashboards/public';
import * as utils from '../utils';
import { act } from 'react-dom/test-utils';
import { wrapWithIntl } from 'test_utils/enzyme_helpers';
import { RouteComponentProps } from 'react-router-dom';
import { OpenSearchDashboardsContextProvider } from '../../../../opensearch_dashboards_react/public';
import { EditDataSource } from './edit_data_source';
import {
  noAuthCredentialAuthMethod,
  sigV4AuthMethod,
  usernamePasswordAuthMethod,
} from '../../types';
const formIdentifier = 'EditDataSourceForm';
const notFoundIdentifier = '[data-test-subj="dataSourceNotFound"]';

describe('Datasource Management: Edit Datasource Wizard', () => {
  const mockedContext = {
    ...mockManagementPlugin.createDataSourceManagementContext(),
    application: { capabilities: { dataSource: { canManage: true } } },
  };
  const uiSettings = mockedContext.uiSettings;
  mockedContext.authenticationMethodRegistry.registerAuthenticationMethod(
    noAuthCredentialAuthMethod
  );
  mockedContext.authenticationMethodRegistry.registerAuthenticationMethod(
    usernamePasswordAuthMethod
  );
  mockedContext.authenticationMethodRegistry.registerAuthenticationMethod(sigV4AuthMethod);

  let component: ReactWrapper<any, Readonly<{}>, React.Component<{}, {}, any>>;
  const history = (scopedHistoryMock.create() as unknown) as ScopedHistory;

  describe('should fail to load resources', () => {
    beforeEach(async () => {
      spyOn(utils, 'getDataSources').and.throwError('');
      spyOn(utils, 'getDataSourceById').and.throwError('');
      await act(async () => {
        component = mount(
          wrapWithIntl(
            <EditDataSource
              history={history}
              location={({} as unknown) as RouteComponentProps['location']}
              match={{ params: { id: 'test1' }, isExact: true, path: '', url: '' }}
            />
          ),
          {
            wrappingComponent: OpenSearchDashboardsContextProvider,
            wrappingComponentProps: {
              services: mockedContext,
            },
          }
        );
      });
      component.update();
    });

    test('should NOT render normally', () => {
      expect(utils.getDataSources).not.toHaveBeenCalled();
      expect(utils.getDataSourceById).toHaveBeenCalled();
      expect(history.push).toBeCalledWith('');
    });
  });

  describe('should load resources successfully', () => {
    beforeEach(async () => {
      spyOn(utils, 'getDefaultDataSourceId').and.returnValue(Promise.resolve('test1'));
      spyOn(utils, 'getDataSources').and.returnValue(Promise.resolve(getMappedDataSources));
      spyOn(utils, 'getDataSourceById').and.returnValue(
        Promise.resolve(mockDataSourceAttributesWithAuth)
      );
      await act(async () => {
        component = mount(
          wrapWithIntl(
            <EditDataSource
              history={history}
              location={({} as unknown) as RouteComponentProps['location']}
              match={{ params: { id: 'test1' }, isExact: true, path: '', url: '' }}
            />
          ),
          {
            wrappingComponent: OpenSearchDashboardsContextProvider,
            wrappingComponentProps: {
              services: mockedContext,
            },
          }
        );
      });
      component.update();
    });

    test('should render normally', () => {
      expect(component.find(notFoundIdentifier).exists()).toBe(false);
      expect(utils.getDataSources).toHaveBeenCalled();
      expect(utils.getDataSourceById).toHaveBeenCalled();
    });
    test('should update datasource successfully', async () => {
      spyOn(utils, 'updateDataSourceById').and.returnValue({});

      await act(async () => {
        // @ts-ignore
        await component.find(formIdentifier).first().prop('handleSubmit')(
          mockDataSourceAttributesWithAuth
        );
      });
      expect(utils.updateDataSourceById).toHaveBeenCalled();
      expect(history.push).toBeCalledWith('');
    });
    test('should fail to update datasource', async () => {
      spyOn(utils, 'updateDataSourceById').and.returnValue(new Error(''));
      await act(async () => {
        // @ts-ignore
        await component.find(formIdentifier).first().prop('handleSubmit')(
          mockDataSourceAttributesWithAuth
        );
      });
      component.update();
      expect(utils.updateDataSourceById).toHaveBeenCalled();
    });
    test('should set default data source', async () => {
      spyOn(uiSettings, 'set').and.returnValue({});
      await act(async () => {
        // @ts-ignore
        await component.find(formIdentifier).first().prop('onSetDefaultDataSource')(
          mockDataSourceAttributesWithAuth
        );
      });
      expect(uiSettings.set).toHaveBeenCalled();
    });

    test('should not set default data source if no permission', async () => {
      spyOn(uiSettings, 'set').and.returnValue(Promise.resolve(false));
      await act(async () => {
        // @ts-ignore
        const result = await component.find(formIdentifier).first().prop('onSetDefaultDataSource')(
          mockDataSourceAttributesWithAuth
        );
        expect(result).toBe(false);
      });
      expect(uiSettings.set).toHaveBeenCalled();
    });

    test('should delete default datasource and set new default data source successfully', async () => {
      spyOn(utils, 'deleteDataSourceById').and.returnValue({});
      spyOn(utils, 'setFirstDataSourceAsDefault').and.returnValue({});
      spyOn(uiSettings, 'getUserProvidedWithScope').and.callFake((key) => {
        if (key === 'home:useNewHomePage') {
          return false;
        }
        return Promise.resolve('test1');
      });
      await act(async () => {
        // @ts-ignore
        await component.find(formIdentifier).first().prop('onDeleteDataSource')(
          mockDataSourceAttributesWithAuth
        );
      });
      expect(utils.deleteDataSourceById).toHaveBeenCalled();
      expect(history.push).toBeCalledWith('');
      expect(utils.setFirstDataSourceAsDefault).toHaveBeenCalled();
    });
    test('should fail to delete datasource', async () => {
      spyOn(utils, 'deleteDataSourceById').and.throwError('error');
      spyOn(utils, 'setFirstDataSourceAsDefault').and.returnValue({});
      spyOn(uiSettings, 'get').and.returnValue('test1');
      await act(async () => {
        // @ts-ignore
        await component.find(formIdentifier).first().prop('onDeleteDataSource')(
          mockDataSourceAttributesWithAuth
        );
      });
      component.update();
      expect(utils.deleteDataSourceById).toHaveBeenCalled();
      expect(utils.setFirstDataSourceAsDefault).not.toHaveBeenCalled();
    });
    test('should test connection', () => {
      spyOn(utils, 'testConnection');
      // @ts-ignore
      component.find('EditDataSourceForm').first().prop('handleTestConnection')(
        mockDataSourceAttributesWithAuth
      );
      component.update();
      expect(utils.testConnection).toHaveBeenCalled();
    });
  });
});
