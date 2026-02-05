import React from 'react';

export interface MenuSectionProps {
  id: string;
  label: string;
  icon: string | React.ReactNode;
  isFocused: boolean;
  isExpanded: boolean;
  onClick: () => void;
  colorClass?: string;
  renderContent?: () => React.ReactNode;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  id,
  label,
  icon,
  isFocused,
  isExpanded,
  onClick,
  colorClass,
  renderContent,
}) => {
  return (
    <>
      {/* Section button */}
      <button
        className={`scrollable-menu-button ${isFocused ? 'focused' : ''} ${isExpanded ? 'expanded' : ''} ${id === 'color' ? `scrollable-menu-color-button ${colorClass || ''}` : ''}`}
        onClick={onClick}
        title={label}
      >
        {typeof icon === 'string' ? (
          <span className="scrollable-menu-button-icon">{icon}</span>
        ) : (
          icon
        )}
      </button>

      {/* Expanded content bubble */}
      {isExpanded && renderContent && (
        <div className="scrollable-menu-bubble">
          <div className="scrollable-menu-bubble-label">{label}</div>
          {renderContent()}
        </div>
      )}
    </>
  );
};
