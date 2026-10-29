import React from 'react';
import { X, FileText } from 'lucide-react';

export default function LogDetailsPanel({ log, onClose }) {
  if (!log) return null;

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'Allowed':
      case 'Success':
        return <span className="outcome-pill pill-allowed">{outcome}</span>;
      case 'Denied':
        return <span className="outcome-pill pill-denied">{outcome}</span>;
      case 'Failed':
        return <span className="outcome-pill pill-failed">{outcome}</span>;
      default:
        return <span className="outcome-pill">{outcome}</span>;
    }
  };

  return (
    <div className="log-details-panel">
      {/* Header */}
      <div className="panel-header">
        <h3 className="panel-title">Log Details</h3>
        <button 
          className="panel-close-btn" 
          onClick={onClose} 
          aria-label="Close log details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="panel-content-scroll">
        {/* Banner with Icon & Event Name */}
        <div className="log-summary-banner">
          <div className="log-summary-left">
            <div className="log-badge-icon-box">
              <FileText size={20} className="log-badge-icon" />
            </div>
            <div className="log-summary-text">
              <h4 className="log-event-title">{log.eventType}</h4>
              <span className="log-event-timestamp">{log.fullTimestamp}</span>
            </div>
          </div>
          <div className="log-summary-right">
            {getOutcomeBadge(log.outcome)}
          </div>
        </div>

        {/* Section 1: Event Information */}
        <div className="log-detail-section">
          <h4 className="section-title">Event Information</h4>
          <div className="detail-rows-list">
            <div className="detail-row">
              <span className="detail-label">Event ID</span>
              <span className="detail-value">{log.eventInfo?.eventId}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Event Type</span>
              <span className="detail-value">{log.eventInfo?.eventType}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Outcome</span>
              <span className="detail-value">{getOutcomeBadge(log.eventInfo?.outcome)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Description</span>
              <span className="detail-value">{log.eventInfo?.description}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Timestamp</span>
              <span className="detail-value">{log.eventInfo?.timestamp}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">IP Address</span>
              <span className="detail-value">{log.eventInfo?.ipAddress}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Source</span>
              <span className="detail-value">{log.eventInfo?.source}</span>
            </div>
          </div>
        </div>

        {/* Section 2: User Information */}
        <div className="log-detail-section">
          <h4 className="section-title">User Information</h4>
          <div className="detail-rows-list">
            <div className="detail-row">
              <span className="detail-label">User ID</span>
              <span className="detail-value">{log.userInfo?.userId}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Name</span>
              <span className="detail-value">{log.userInfo?.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Role</span>
              <span className="detail-value">{log.userInfo?.role}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Department</span>
              <span className="detail-value">{log.userInfo?.department}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Organization</span>
              <span className="detail-value">{log.userInfo?.organization}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Account Status</span>
              <span className="detail-value">
                <span className="status-pill-small status-active">{log.userInfo?.accountStatus}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Patient Information */}
        <div className="log-detail-section">
          <h4 className="section-title">Patient Information</h4>
          <div className="detail-rows-list">
            <div className="detail-row">
              <span className="detail-label">Patient ID</span>
              <span className="detail-value">{log.patientInfo?.patientId}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Patient Name</span>
              <span className="detail-value">{log.patientInfo?.patientName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date of Birth</span>
              <span className="detail-value">{log.patientInfo?.dob}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Gender</span>
              <span className="detail-value">{log.patientInfo?.gender}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Related Information */}
        <div className="log-detail-section">
          <h4 className="section-title">Related Information</h4>
          <div className="detail-rows-list">
            <div className="detail-row">
              <span className="detail-label">Transaction ID</span>
              <span className="detail-value">{log.relatedInfo?.transactionId}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Resource Type</span>
              <span className="detail-value">{log.relatedInfo?.resourceType}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Record Category</span>
              <span className="detail-value">{log.relatedInfo?.recordCategory}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Access Method</span>
              <span className="detail-value">{log.relatedInfo?.accessMethod}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
