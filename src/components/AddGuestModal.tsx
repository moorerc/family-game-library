import React, { useState, useCallback } from 'react';
import { Dialog, Button, FormGroup, InputGroup } from '@blueprintjs/core';
import { GUEST_COLORS, type GuestColor } from '../context/GameNightContext';
import { getInitials } from './PlayerCard';

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGuest: (name: string, color: GuestColor) => void;
}

export const AddGuestModal: React.FC<AddGuestModalProps> = ({
  isOpen,
  onClose,
  onAddGuest,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<GuestColor>('purple');

  const handleSubmit = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    onAddGuest(trimmedName, selectedColor);
    setName('');
    setSelectedColor('purple');
    onClose();
  }, [name, selectedColor, onAddGuest, onClose]);

  const handleClose = useCallback(() => {
    setName('');
    setSelectedColor('purple');
    onClose();
  }, [onClose]);

  const initials = name.trim() ? getInitials(name) : '';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      className="add-guest-modal"
      canOutsideClickClose
    >
      <div className="modal-header">
        <h2>Add Guest</h2>
        <button className="modal-close" onClick={handleClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="modal-body">
        <FormGroup label="Guest Name" labelFor="guest-name">
          <InputGroup
            id="guest-name"
            placeholder="Enter name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </FormGroup>

        <div className="form-group">
          <label className="form-label">Pick a Color</label>
          <p className="form-hint">Helps identify the guest during game night</p>
          <div className="avatar-picker">
            {GUEST_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                className={`avatar-option ${color.id} ${selectedColor === color.id ? 'selected' : ''}`}
                style={{ backgroundColor: color.hex }}
                onClick={() => setSelectedColor(color.id)}
                aria-label={`Select ${color.label}`}
              >
                {initials}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          intent="warning"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          Add Guest
        </Button>
      </div>
    </Dialog>
  );
};
