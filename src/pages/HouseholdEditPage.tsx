import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Spinner } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { householdsService } from '../services/households';
import type { Household, EntityColorId } from '../types';
import { ENTITY_COLORS } from '../types';

export const HouseholdEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [household, setHousehold] = useState<Household | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<EntityColorId>('navy');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchHousehold = async () => {
      try {
        setLoading(true);
        const householdData = await householdsService.getHousehold(id);
        setHousehold(householdData);
        if (householdData) {
          setName(householdData.name);
          setColor(householdData.color || 'navy');
        }
      } catch (error) {
        console.error('Failed to fetch household:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHousehold();
  }, [id]);

  // Get owner ID (support both old and new field names)
  const ownerId = household ? ((household as any).owner || (household as any).createdBy) : null;
  const isOwner = ownerId === currentUser?.uid;

  const handleSave = async () => {
    if (!id || !currentUser || !name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      await householdsService.renameHousehold(id, name.trim(), currentUser.uid);
      await householdsService.updateHouseholdColor(id, color, currentUser.uid);
      navigate(`/household/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/household/${id}`);
  };

  if (loading) {
    return (
      <div className="edit-page">
        <div className="empty-state">
          <Spinner size={40} />
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="edit-page">
        <div className="empty-state">
          <p>Household not found</p>
          <Link to="/">Back to Library</Link>
        </div>
      </div>
    );
  }

  // Check if user is owner
  if (!isOwner) {
    return (
      <div className="edit-page">
        <div className="empty-state">
          <p>You don't have permission to edit this household.</p>
          <Link to={`/household/${id}`}>Back to Household</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-page-wrapper">
      <div className="edit-page">
        <Link to={`/household/${id}`} className="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Household
        </Link>

        <div className="edit-header">
          <h1>Edit Household</h1>
        </div>

        {error && (
          <div className="form-error-message">
            {error}
          </div>
        )}

        <div className="edit-section">
          <div className="edit-section-title">Household Information</div>

          <div className="form-group">
            <label htmlFor="householdName" className="form-label">Household Name</label>
            <input
              id="householdName"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter household name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Household Color</label>
            <div className="color-picker">
              {ENTITY_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`color-swatch ${color === c.id ? 'selected' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setColor(c.id)}
                  title={c.label}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="edit-actions">
          <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
