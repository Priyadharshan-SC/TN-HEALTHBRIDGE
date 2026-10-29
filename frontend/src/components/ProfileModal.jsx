import React, { useState } from 'react';
import { 
  X, 
  User, 
  ShieldCheck, 
  Key, 
  Building2, 
  Mail, 
  Phone, 
  Check, 
  Copy, 
  RefreshCw, 
  Save, 
  Lock,
  CheckCircle2
} from 'lucide-react';

export default function ProfileModal({ isOpen, onClose, userProfile, onUpdateProfile }) {
  const [activeTab, setActiveTab] = useState('account');
  const [formData, setFormData] = useState({ ...userProfile });
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKey, setApiKey] = useState(userProfile.apiKeys?.publicKey || 'tn_hb_live_8f3a9201bc678d91');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = () => {
    const newKey = `tn_hb_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    setApiKey(newKey);
    alert('A new cryptographic Interoperability API Key has been generated.');
  };

  const handleSave = (e) => {
    e.preventDefault();
    const initials = formData.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    onUpdateProfile({
      ...formData,
      initials,
      apiKeys: {
        ...formData.apiKeys,
        publicKey: apiKey
      }
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container profile-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="profile-modal-header-info">
            <div className="profile-large-avatar">
              <span>{userProfile.initials || 'MP'}</span>
            </div>
            <div>
              <h2 className="profile-modal-name">{userProfile.name}</h2>
              <span className="profile-modal-badge">{userProfile.accountType} &bull; {userProfile.role}</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close profile">
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="profile-modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            Account Details
          </button>
          <button
            className={`tab-btn ${activeTab === 'interop' ? 'active' : ''}`}
            onClick={() => setActiveTab('interop')}
          >
            API & Interoperability Keys
          </button>
          <button
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Security & MFA
          </button>
        </div>

        {/* Tab 1: Account Details Form */}
        {activeTab === 'account' && (
          <form onSubmit={handleSave}>
            <div className="modal-body profile-form-body">
              {saveSuccess && (
                <div className="profile-save-alert">
                  <CheckCircle2 size={16} />
                  <span>Profile updated dynamically across the application!</span>
                </div>
              )}

              <div className="profile-fields-grid">
                <div className="profile-form-group">
                  <label className="filter-label">Full Name</label>
                  <div className="filter-input-wrap">
                    <User size={15} className="filter-icon" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="profile-form-group">
                  <label className="filter-label">Role Designation</label>
                  <input
                    type="text"
                    className="modal-text-input"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  />
                </div>

                <div className="profile-form-group">
                  <label className="filter-label">Official Email</label>
                  <div className="filter-input-wrap">
                    <Mail size={15} className="filter-icon" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="profile-form-group">
                  <label className="filter-label">Phone Number</label>
                  <div className="filter-input-wrap">
                    <Phone size={15} className="filter-icon" />
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="profile-form-group">
                  <label className="filter-label">Assigned Facility / Organization</label>
                  <div className="filter-input-wrap">
                    <Building2 size={15} className="filter-icon" />
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    />
                  </div>
                </div>

                <div className="profile-form-group">
                  <label className="filter-label">Department / Unit</label>
                  <input
                    type="text"
                    className="modal-text-input"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="profile-info-banner">
                <ShieldCheck size={18} className="shield-green" />
                <div className="info-banner-text">
                  <strong>Tamil Nadu Health Data Interoperability Certified</strong>
                  <p>Authorized to initiate, supervise and inspect cross-enterprise FHIR payloads.</p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-modal-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-modal-primary btn-save-profile">
                <Save size={15} />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: API & Interoperability Keys */}
        {activeTab === 'interop' && (
          <div className="modal-body profile-api-body">
            <div className="api-key-box">
              <div className="api-key-header">
                <div>
                  <span className="api-key-label">Active Public API Key (Production Node)</span>
                  <p className="api-key-sub">Used to authenticate FHIR R4 exchange endpoints via TLS 1.3</p>
                </div>
                <div className="api-key-actions">
                  <button className="btn-copy-key" onClick={handleCopyKey}>
                    {copiedKey ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy Key</>}
                  </button>
                  <button className="btn-regen-key" onClick={handleRegenerateKey} title="Regenerate API token">
                    <RefreshCw size={13} /> Roll Key
                  </button>
                </div>
              </div>
              <code className="api-key-code">{apiKey}</code>
            </div>

            <div className="fhir-scopes-card">
              <h4 className="scopes-title">Authorized FHIR Interop Scopes</h4>
              <ul className="scopes-list">
                <li><Check size={14} className="check-green" /> <code>patient/*.read</code> &mdash; Full clinical demographic retrieval</li>
                <li><Check size={14} className="check-green" /> <code>observation/*.readwrite</code> &mdash; Vitals and diagnostic measurements</li>
                <li><Check size={14} className="check-green" /> <code>diagnosticreport/*.readwrite</code> &mdash; Radiology & pathology telemetry</li>
                <li><Check size={14} className="check-green" /> <code>transfer/*.dispatch</code> &mdash; Bridge broker data dispatch privilege</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: Security & MFA */}
        {activeTab === 'security' && (
          <div className="modal-body profile-sec-body">
            <div className="security-status-card">
              <div className="sec-status-row">
                <div className="sec-status-info">
                  <Lock size={18} className="lock-icon" />
                  <div>
                    <strong>Two-Factor Authentication (MFA)</strong>
                    <p>FIDO2 / TOTP Hardware Key Protected</p>
                  </div>
                </div>
                <span className="status-pill status-pill-success">Active</span>
              </div>
              <div className="sec-status-row">
                <div className="sec-status-info">
                  <Key size={18} className="lock-icon" />
                  <div>
                    <strong>Last Security Audit Signature</strong>
                    <p>Passed automated posture compliance check</p>
                  </div>
                </div>
                <span className="status-pill status-pill-success">Verified</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
