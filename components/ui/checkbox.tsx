import * as React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onCheckedChange, ...props }) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={e => onCheckedChange(e.target.checked)}
    {...props}
  />
); 