import React, { useState, useEffect, useRef } from 'react';
import {
  InputGroup,
  Spinner,
  Callout,
  Intent,
  Card,
} from '@blueprintjs/core';
import type { BGGSearchResult, BGGGameDetails } from '../types';

interface BGGSearchPanelProps {
  onGameSelect: (game: BGGGameDetails) => void;
  searchResults: BGGSearchResult[];
  searching: boolean;
  loadingDetails: boolean;
  error: string | null;
  onSearch: (query: string) => void;
  onSelectResult: (bggId: string) => void;
  onClearResults: () => void;
}

const DEBOUNCE_MS = 300;

export const BGGSearchPanel: React.FC<BGGSearchPanelProps> = ({
  searchResults,
  searching,
  loadingDetails,
  error,
  onSearch,
  onSelectResult,
  onClearResults,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.trim()) {
      debounceRef.current = setTimeout(() => {
        onSearch(searchQuery);
      }, DEBOUNCE_MS);
    } else {
      onClearResults();
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, onSearch, onClearResults]);

  const handleResultClick = (result: BGGSearchResult) => {
    setSearchQuery('');
    onSelectResult(result.bggId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const showResults = searchResults.length > 0 && !loadingDetails;

  return (
    <Card className="bgg-search-panel" elevation={1}>
      <div className="bgg-search-header">
        <h4>Search BoardGameGeek</h4>
        <a
          href="https://boardgamegeek.com"
          target="_blank"
          rel="noopener noreferrer"
          className="bgg-attribution"
        >
          Powered by BGG
        </a>
      </div>

      <InputGroup
        inputRef={inputRef}
        leftIcon="search"
        placeholder="Search for a game to auto-fill..."
        value={searchQuery}
        onChange={handleInputChange}
        rightElement={
          searching || loadingDetails ? (
            <Spinner size={16} className="bgg-search-spinner" />
          ) : undefined
        }
      />

      {error && (
        <Callout intent={Intent.WARNING} className="bgg-search-error">
          {error}
        </Callout>
      )}

      {loadingDetails && (
        <div className="bgg-loading-details">
          <Spinner size={20} />
          <span>Loading game details...</span>
        </div>
      )}

      {showResults && (
        <div className="bgg-search-results">
          {searchResults.map((result) => (
            <div
              key={result.bggId}
              className="bgg-result-item"
              onClick={() => handleResultClick(result)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleResultClick(result)}
            >
              <div className="bgg-result-thumbnail">
                {result.thumbnail ? (
                  <img src={result.thumbnail} alt="" />
                ) : (
                  <div className="bgg-result-placeholder" />
                )}
              </div>
              <div className="bgg-result-info">
                <span className="bgg-result-name">{result.name}</span>
                {result.yearPublished && (
                  <span className="bgg-result-year">({result.yearPublished})</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
