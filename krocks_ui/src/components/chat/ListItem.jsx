import React from 'react';

export default function ListItem({ title, subtitle, onClick }) {
  return (
    <div className="list-item" onClick={onClick}>
      <span className="item-title">{title}</span>
      <span className="item-date">{subtitle}</span>
    </div>
  );
}
