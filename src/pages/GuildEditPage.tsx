import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Spinner } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';
import { guildsService } from '../services/guilds';
import type { Guild, EntityColorId } from '../types';
import { ENTITY_COLORS } from '../types';

export const GuildEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<EntityColorId>('navy');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchGuild = async () => {
      try {
        setLoading(true);
        const guildData = await guildsService.getGuild(id);
        setGuild(guildData);
        if (guildData) {
          setName(guildData.name);
          setColor(guildData.color || 'navy');
        }
      } catch (error) {
        console.error('Failed to fetch guild:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuild();
  }, [id]);

  const handleSave = async () => {
    if (!id || !currentUser || !name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      await guildsService.renameGuild(id, name.trim(), currentUser.uid);
      await guildsService.updateGuildColor(id, color, currentUser.uid);
      navigate(`/guild/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/guild/${id}`);
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

  if (!guild) {
    return (
      <div className="edit-page">
        <div className="empty-state">
          <p>Guild not found</p>
          <Link to="/">Back to Library</Link>
        </div>
      </div>
    );
  }

  // Check if user is owner
  if (guild.createdBy !== currentUser?.uid) {
    return (
      <div className="edit-page">
        <div className="empty-state">
          <p>You don't have permission to edit this guild.</p>
          <Link to={`/guild/${id}`}>Back to Guild</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-page-wrapper">
      <div className="edit-page">
        <Link to={`/guild/${id}`} className="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Guild
        </Link>

        <div className="edit-header">
          <h1>Edit Guild</h1>
        </div>

        {error && (
          <div className="form-error-message">
            {error}
          </div>
        )}

        <div className="edit-section">
          <div className="edit-section-title">Guild Information</div>

          <div className="form-group">
            <label htmlFor="guildName" className="form-label">Guild Name</label>
            <input
              id="guildName"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter guild name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Guild Color</label>
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
