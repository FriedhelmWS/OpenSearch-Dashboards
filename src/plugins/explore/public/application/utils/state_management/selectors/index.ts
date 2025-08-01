/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';

/**
 * Basic selectors
 */
const selectQueryState = (state: RootState) => state.query;
export const selectUIState = (state: RootState) => state.ui;
const selectResultsState = (state: RootState) => state.results;
const selectLegacyState = (state: RootState) => state.legacy;
export const selectTabState = (state: RootState) => state.tab;

/**
 * Query selectors
 */
export const selectQuery = createSelector([selectQueryState], (queryState) => queryState);

export const selectQueryString = createSelector(
  [selectQueryState],
  (queryState) => queryState.query
);

export const selectQueryLanguage = createSelector(
  [selectQueryState],
  (queryState) => queryState.language
);

export const selectDataset = createSelector([selectQueryState], (queryState) => queryState.dataset);

/**
 * UI selectors
 */
export const selectActiveTabId = createSelector([selectUIState], (uiState) => uiState.activeTabId);

export const selectShowHistogram = createSelector(
  [selectUIState],
  (uiState) => uiState.showHistogram
);

export const selectActiveTab = createSelector(
  [selectActiveTabId],
  (activeTabId) => activeTabId // Return just the ID, components will resolve the tab via context
);

/**
 * Results selectors
 */
export const selectResults = createSelector([selectResultsState], (resultsState) => resultsState);

/**
 * Legacy selectors
 */
export const selectColumns = createSelector(
  [selectLegacyState],
  (legacyState) => legacyState.columns
);

export const selectSort = createSelector([selectLegacyState], (legacyState) => legacyState.sort);

export const selectSavedSearch = createSelector(
  [selectLegacyState],
  (legacyState) => legacyState.savedSearch
);

export * from './query_editor';
