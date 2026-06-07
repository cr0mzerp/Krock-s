import React from 'react';
import { Search } from 'lucide-react';

export default function PageView({ title, actions, searchPlaceholder, onSearch, children }) {
  return (
    <div className="page-view">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      {searchPlaceholder && (
        <div className="search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      )}
      {children}
    </div>
  );
}
