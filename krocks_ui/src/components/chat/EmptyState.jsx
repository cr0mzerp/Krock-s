import React from 'react';

export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon className="empty-icon" />}
      <div className="empty-title">{title}</div>
      <div className="empty-subtitle">{subtitle}</div>
      {action && <div>{action}</div>}
    </div>
  );
}
