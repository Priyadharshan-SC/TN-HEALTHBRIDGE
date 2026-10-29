import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';

export default function AddOrganizationModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Hospital',
    id: 'ORG-008',
    location: 'Chennai, Tamil Nadu',
    description: 'Connected health system node'
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const newOrg = {
      id: formData.id,
      name: formData.name,
      type: formData.type,
      typeLabel: formData.type,
      iconType: formData.type === 'Laboratory' ? 'lab' : formData.type === 'Clinic' ? 'clinic' : 'hospital',
      location: formData.location,
      totalUsers: 1,
      connectedSince: 'Today',
      description: formData.description,
      status: 'Active',
      permissions: [
        { resource: 'Patient', read: true, write: true, accessLevel: 'Full Access' },
        { resource: 'Observation', read: true, write: true, accessLevel: 'Full Access' }
      ],
      users: [
        { id: Date.now(), name: 'Primary Admin', role: 'IT Admin', roleCategory: 'admin', department: 'Operations', status: 'Active', lastAccess: 'Just now' }
      ]
    };

    onAdd(newOrg);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ width: '540px' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-heading)' }}>Connect New Organization</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Register and authorize a healthcare facility on the TN HealthBridge platform
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ gap: '14px' }}>
            <div className="filter-item">
              <label className="filter-label">Organization Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Apollo Super Speciality Hospital"
                style={{ padding: '8px 12px', border: '1px solid #d0d7e2', borderRadius: '6px' }}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="filter-item">
                <label className="filter-label">Facility Type</label>
                <select
                  style={{ padding: '8px 12px', border: '1px solid #d0d7e2', borderRadius: '6px' }}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Hospital">Hospital</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Clinic">Clinic</option>
                  <option value="Imaging Center">Imaging Center</option>
                </select>
              </div>

              <div className="filter-item">
                <label className="filter-label">Organization ID</label>
                <input
                  type="text"
                  required
                  style={{ padding: '8px 12px', border: '1px solid #d0d7e2', borderRadius: '6px' }}
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                />
              </div>
            </div>

            <div className="filter-item">
              <label className="filter-label">Location</label>
              <input
                type="text"
                required
                placeholder="City, State"
                style={{ padding: '8px 12px', border: '1px solid #d0d7e2', borderRadius: '6px' }}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="filter-item">
              <label className="filter-label">Description</label>
              <textarea
                rows="3"
                style={{ padding: '8px 12px', border: '1px solid #d0d7e2', borderRadius: '6px', fontFamily: 'inherit' }}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--highlight-mint-text)', backgroundColor: 'var(--highlight-mint)', padding: '8px 12px', borderRadius: '6px' }}>
              <ShieldCheck size={16} />
              <span>TN Interoperability Zero-Trust Federation Node</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-modal-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-primary">
              Connect Organization
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
