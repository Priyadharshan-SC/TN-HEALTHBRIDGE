import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Edit,
  Power,
  X,
  Server
} from 'lucide-react';
import {
  listOrganizations,
  createOrganization,
  updateOrganization,
  toggleOrganizationStatus
} from '../services/apiClient';

export default function OrganizationsView() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [formData, setFormData] = useState({
    org_id: '',
    name: '',
    code: '',
    org_type: 'HOSPITAL',
    endpoint_url: '',
    contact_email: '',
    contact_phone: '',
    address: '',
  });

  useEffect(() => {
    loadOrgs();
  }, []);

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const data = await listOrganizations();
      setOrganizations(data);
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createOrganization(formData);
      setFeedback({ type: 'success', text: `Organization ${formData.name} registered successfully.` });
      setIsAddModalOpen(false);
      setFormData({ org_id: '', name: '', code: '', org_type: 'HOSPITAL', endpoint_url: '', contact_email: '', contact_phone: '', address: '' });
      await loadOrgs();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleToggle = async (orgId) => {
    try {
      await toggleOrganizationStatus(orgId);
      await loadOrgs();
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = organizations.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return o.name.toLowerCase().includes(s) || o.org_id.toLowerCase().includes(s) || o.code.toLowerCase().includes(s);
  });

  return (
    <div className="page-wrapper organizations-page">
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 className="page-main-heading">Healthcare Organizations</h1>
          <p className="page-subheading">
            Register and monitor participating hospital nodes, diagnostic laboratories, and primary clinics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadOrgs}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#475569'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-search-blue"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={16} />
            <span>Add Organization</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: feedback.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Search size={16} color="#64748b" />
        <input
          type="text"
          placeholder="Search organizations by name, ID, or short code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13.5px' }}
        />
      </div>

      {/* Organizations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {filtered.map((org) => (
          <div
            key={org.org_id}
            style={{
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1' }}>
                  {org.code} &bull; {org.org_type}
                </span>

                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: org.is_active ? '#dcfce7' : '#fee2e2',
                  color: org.is_active ? '#15803d' : '#b91c1c'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: org.is_active ? '#16a34a' : '#dc2626' }} />
                  {org.is_active ? org.connection_status : 'DISABLED'}
                </span>
              </div>

              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {org.name}
              </h3>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '12px' }}>
                ID: <code>{org.org_id}</code> &bull; Users: {org.user_count} &bull; Exchanges: {org.exchange_count}
              </div>

              <div style={{ fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', marginBottom: '12px' }}>
                <div style={{ marginBottom: '3px' }}><strong>Adapter URL:</strong> <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{org.endpoint_url}</span></div>
                <div><strong>Contact:</strong> {org.contact_email || 'admin@healthbridge.tn.gov.in'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                Last active: {org.last_exchange_at?.slice(0, 10) || 'Recent'}
              </span>

              <button
                onClick={() => handleToggle(org.org_id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: org.is_active ? '#dc2626' : '#16a34a'
                }}
              >
                <Power size={12} />
                <span>{org.is_active ? 'Disable' : 'Enable'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Organization Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ width: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Register New Healthcare Organization</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Organization ID (e.g. HOSPITAL_G)</label>
                  <input
                    type="text"
                    value={formData.org_id}
                    onChange={(e) => setFormData({ ...formData, org_id: e.target.value.toUpperCase() })}
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Short Code (e.g. HG)</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Full Organization Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Facility Type</label>
                  <select
                    value={formData.org_type}
                    onChange={(e) => setFormData({ ...formData, org_type: e.target.value })}
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="HOSPITAL">HOSPITAL</option>
                    <option value="LABORATORY">LABORATORY</option>
                    <option value="CLINIC">CLINIC</option>
                    <option value="PUBLIC_HEALTH">PUBLIC HEALTH</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>FHIR Adapter Endpoint</label>
                  <input
                    type="url"
                    placeholder="https://api.facility.tn.gov.in/fhir"
                    value={formData.endpoint_url}
                    onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-search-blue" style={{ padding: '8px 18px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Register Facility</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
