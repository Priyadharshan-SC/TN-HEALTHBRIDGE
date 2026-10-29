import React, { useState } from 'react';
import { 
  User, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeftRight, 
  Users, 
  FileText, 
  Layers
} from 'lucide-react';

export default function PatientDetailView({ 
  patient, 
  onViewTransaction,
  onNavigateSection 
}) {
  const [activeTab, setActiveTab] = useState('data-exchanges');
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(true);
  
  // Filter state
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('All Organizations');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All Data Types');
  const [sortOrder, setSortOrder] = useState('Newest First');

  if (!patient) return null;

  const exchangesList = patient.exchanges || [];

  // Filter logic
  const filteredExchanges = exchangesList.filter((item) => {
    if (selectedOrgFilter !== 'All Organizations') {
      if (!item.source.includes(selectedOrgFilter) && !item.destination.includes(selectedOrgFilter)) {
        return false;
      }
    }
    if (selectedTypeFilter !== 'All Data Types') {
      if (item.dataType !== selectedTypeFilter) return false;
    }
    return true;
  });

  return (
    <div className="patient-detail-container">
      {/* Patient Profile Summary Card */}
      <div className="patient-profile-card">
        <div className="profile-top-row">
          <div className="profile-identity">
            <div className="profile-avatar-large">
              <User size={38} className="profile-avatar-icon" />
            </div>
            <div className="profile-titles">
              <h2 className="patient-full-name">{patient.name}</h2>
              <span className="patient-id-badge">Patient ID: {patient.id}</span>
            </div>
          </div>

          <div className="records-found-badge">
            <span className="records-badge-label">Records found in</span>
            <strong className="records-badge-count">{patient.recordsCount} Organizations</strong>
          </div>
        </div>

        <div className="profile-demographics-grid">
          <div className="demo-field">
            <span className="demo-label">Gender</span>
            <span className="demo-value">{patient.gender}</span>
          </div>

          <div className="demo-field">
            <span className="demo-label">Date of Birth</span>
            <div className="demo-value-group">
              <span className="demo-value">{patient.dob}</span>
              <span className="demo-sub-value">(Age {patient.age})</span>
            </div>
          </div>

          <div className="demo-field">
            <span className="demo-label">Blood Group</span>
            <span className="demo-value">{patient.bloodGroup}</span>
          </div>

          <div className="demo-field">
            <span className="demo-label">Last Updated</span>
            <span className="demo-value">{patient.lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="detail-tabs-bar">
        <button
          className={`tab-btn ${activeTab === 'data-exchanges' ? 'active' : ''}`}
          onClick={() => setActiveTab('data-exchanges')}
        >
          Data Exchanges
        </button>
        <button
          className={`tab-btn ${activeTab === 'associated-orgs' ? 'active' : ''}`}
          onClick={() => setActiveTab('associated-orgs')}
        >
          Associated Organizations
        </button>
        <button
          className={`tab-btn ${activeTab === 'recent-activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent-activity')}
        >
          Recent Activity
        </button>
      </div>

      {/* Tab 1: Data Exchanges */}
      {activeTab === 'data-exchanges' && (
        <div className="data-exchanges-card">
          <div className="exchanges-header-bar">
            <h3 className="exchanges-title">
              Data Exchanges <span className="exchanges-count">({filteredExchanges.length})</span>
            </h3>

            <div className="exchanges-filters">
              <div className="select-wrapper">
                <select 
                  value={selectedOrgFilter} 
                  onChange={(e) => setSelectedOrgFilter(e.target.value)}
                >
                  <option value="All Organizations">All Organizations</option>
                  <option value="City Hospital">City Hospital</option>
                  <option value="Central Lab">Central Lab</option>
                  <option value="Metro Hospital">Metro Hospital</option>
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>

              <div className="select-wrapper">
                <select 
                  value={selectedTypeFilter} 
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                >
                  <option value="All Data Types">All Data Types</option>
                  <option value="Lab Report">Lab Report</option>
                  <option value="Diagnostic Report">Diagnostic Report</option>
                  <option value="Patient Info">Patient Info</option>
                  <option value="Observation">Observation</option>
                  <option value="Medication">Medication</option>
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>

              <div className="select-wrapper">
                <select 
                  value={sortOrder} 
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="Newest First">Newest First</option>
                  <option value="Oldest First">Oldest First</option>
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="exchanges-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>#</th>
                  <th style={{ width: '18%' }}>Date & Time</th>
                  <th style={{ width: '27%' }}>Source &rarr; Destination</th>
                  <th style={{ width: '17%' }}>Data Type</th>
                  <th style={{ width: '14%' }}>Transaction ID</th>
                  <th style={{ width: '11%' }}>Status</th>
                  <th style={{ width: '9%', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExchanges.map((item, idx) => {
                  const statusClass = 
                    item.status === 'Success' 
                      ? 'status-pill-success' 
                      : item.status === 'Pending' 
                      ? 'status-pill-pending' 
                      : 'status-pill-failed';

                  return (
                    <tr key={item.id}>
                      <td className="col-idx">{item.id || idx + 1}</td>
                      <td className="col-date">
                        {item.dateTime.split('\n').map((line, i) => (
                          <div key={i} className={i === 1 ? 'date-sub' : 'date-main'}>{line}</div>
                        ))}
                      </td>
                      <td className="col-route">
                        <span className="route-source">{item.source}</span>
                        <span className="route-arrow">&rarr;</span>
                        <span className="route-destination">{item.destination}</span>
                      </td>
                      <td className="col-datatype">{item.dataType}</td>
                      <td className="col-txnid">
                        <button 
                          className="txn-link" 
                          onClick={() => onViewTransaction(item)}
                          title="View interoperability transaction payload"
                        >
                          {item.txnId}
                        </button>
                      </td>
                      <td className="col-status">
                        <span className={`status-pill ${statusClass}`}>{item.status}</span>
                      </td>
                      <td className="col-action" style={{ textAlign: 'center' }}>
                        <button 
                          className="btn-view-action" 
                          onClick={() => onViewTransaction(item)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredExchanges.length === 0 && (
                  <tr>
                    <td colSpan="7" className="table-empty-row">
                      No data exchanges found matching the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Associated Organizations */}
      {activeTab === 'associated-orgs' && (
        <div className="associated-orgs-panel">
          <div className="orgs-panel-header">
            <h3>Connected Care Providers with Patient Records</h3>
            <p>Organizations granted clinical interoperability access to {patient.name}'s medical records</p>
          </div>
          <div className="orgs-card-grid">
            {(patient.associatedOrgsList || [
              { name: "City Hospital", role: "Primary Care / Origin", since: "Jan 2021", status: "Active" },
              { name: "Central Lab", role: "Pathology & Diagnostics", since: "Mar 2022", status: "Active" }
            ]).map((org, i) => (
              <div key={i} className="org-connected-card">
                <div className="org-card-header">
                  <div className="org-card-icon">
                    <Users size={20} />
                  </div>
                  <div className="org-card-titles">
                    <h4>{org.name}</h4>
                    <span>{org.role}</span>
                  </div>
                  <span className="org-status-badge">{org.status}</span>
                </div>
                <div className="org-card-details">
                  <div className="org-detail-row">
                    <span>Connected Since:</span>
                    <strong>{org.since}</strong>
                  </div>
                  <div className="org-detail-row">
                    <span>Consent Directives:</span>
                    <strong style={{ color: '#16a34a' }}>Explicit Consent Active</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Recent Activity */}
      {activeTab === 'recent-activity' && (
        <div className="activity-panel">
          <div className="activity-panel-header">
            <h3>Audit Trail & Recent Access Events</h3>
            <p>Immutable ledger of read, query, and transmit operations for this patient</p>
          </div>
          <div className="activity-timeline">
            {(patient.activityLog || [
              { action: "FHIR Resource Read", agent: "Dr. N. Ramanathan (City Hospital)", timestamp: "Oct 27, 2024, 10:48 AM" },
              { action: "Lab Results Dispatched", agent: "Automated Gateway (Central Lab)", timestamp: "Oct 27, 2024, 10:46 AM" },
              { action: "Consent Record Verified", agent: "TN HealthBridge Interop Guard", timestamp: "Oct 26, 2024, 03:20 PM" }
            ]).map((log, idx) => (
              <div key={idx} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <div className="timeline-title-row">
                    <strong>{log.action}</strong>
                    <span className="timeline-time">{log.timestamp}</span>
                  </div>
                  <span className="timeline-agent">{log.agent}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions Card */}
      <div className="quick-actions-card">
        <div 
          className="quick-actions-header" 
          onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
        >
          <div className="quick-actions-title-wrap">
            <div className="quick-action-badge-icon">
              <Layers size={18} />
            </div>
            <div>
              <h4 className="quick-actions-heading">Quick Actions</h4>
              <p className="quick-actions-subheading">
                Find related transfers or check organization details
              </p>
            </div>
          </div>
          <button 
            className="quick-actions-toggle-btn" 
            aria-label={isQuickActionsOpen ? "Collapse quick actions" : "Expand quick actions"}
          >
            {isQuickActionsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {isQuickActionsOpen && (
          <div className="quick-actions-grid">
            <button 
              className="quick-action-btn"
              onClick={() => onNavigateSection?.('transfers')}
            >
              <div className="action-btn-icon-box">
                <ArrowLeftRight size={19} />
              </div>
              <div className="action-btn-text">
                <span className="action-btn-title">View All Transfers</span>
                <span className="action-btn-desc">Related to this patient</span>
              </div>
            </button>

            <button 
              className="quick-action-btn"
              onClick={() => onNavigateSection?.('org-access')}
            >
              <div className="action-btn-icon-box">
                <Users size={19} />
              </div>
              <div className="action-btn-text">
                <span className="action-btn-title">View Organizations</span>
                <span className="action-btn-desc">Storing this patient's data</span>
              </div>
            </button>

            <button 
              className="quick-action-btn"
              onClick={() => onNavigateSection?.('audit-logs')}
            >
              <div className="action-btn-icon-box">
                <FileText size={19} />
              </div>
              <div className="action-btn-text">
                <span className="action-btn-title">View Audit Logs</span>
                <span className="action-btn-desc">Access history for this patient</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
