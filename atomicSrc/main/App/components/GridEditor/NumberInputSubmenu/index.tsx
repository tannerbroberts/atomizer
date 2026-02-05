import React, { useState, useEffect, useRef } from 'react';
import './NumberInputSubmenu.css';

interface NumberInputSubmenuProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  isExpanded: boolean;
}

export const NumberInputSubmenu: React.FC<NumberInputSubmenuProps> = ({
  label,
  value,
  min,
  max,
  onChange,
  isExpanded,
}) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isExpanded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
      setInputValue(clampedValue.toString());
    } else {
      setInputValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setInputValue(value.toString());
      inputRef.current?.blur();
    }
  };

  return (
    <div className="number-input-submenu">
      <div className="number-input-label">{label}</div>
      <div className="number-input-controls">
        <button
          className="number-input-button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          -
        </button>
        <input
          ref={inputRef}
          type="number"
          className="number-input-field"
          value={inputValue}
          min={min}
          max={max}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
        />
        <button
          className="number-input-button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          +
        </button>
      </div>
      <div className="number-input-hint">
        Range: {min}-{max} | Scroll to adjust
      </div>
    </div>
  );
};
