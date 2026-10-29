import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import TransferDetailsPanel from './TransferDetailsPanel';
import NewTransferModal from './NewTransferModal';
import TransactionModal from './TransactionModal';
import { listTransfers } from '../services/apiClient';

export default function TransfersView() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);
  const [selectedPayloadTxn, setSelectedPayloadTxn] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange] = useState('All Time');
  const [sourceOrg, setSourceOrg] = useState('All Organizations');
  const [destOrg, setDestOrg] = useState('All Organizations');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState('10');
  const [totalCount, setTotalCount] = useState(0);

  const fetchLiveTransfers = async () => {
    setLoading(true);
    try {
      const res = await listTransfers({
        sourceOrg,
        destOrg,
        status: statusFilter,
        search: searchQuery,
        page: currentPage,
        pageSize: parseInt(pageSize)
      });
      const rawJobs = res.jobs || res.transfers || [];
      const mapped = rawJobs.map(item => ({
        txnId: item.job_id || item.txnId,
        source: item.source_provider_id || item.source_provider || item.source,
        sourceOrgCode: item.source_provider_id || item.source_provider || item.source,
        sourceType: 'Healthcare Provider',
        destination: item.recipient_hiu_id || item.dest_provider || item.destination,
        destinationFull: item.recipient_hiu_id || item.dest_provider || item.destination,
        destOrgCode: item.recipient_hiu_id || item.dest_provider || item.destination,
        destType: 'Healthcare Provider',
        dataType: 'FHIR R4 Bundle',
        fullDataType: 'HL7 FHIR R4 Clinical Document',
        patientId: item.patient_reference || item.patient_ref || item.patientId,
        dateTime: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
        fullDateTime: item.created_at ? new Date(item.created_at).toLocaleString() : '—',
        status: (item.status === 'completed' || item.status === 'DELIVERED' || item.status === 'Success') ? 'Success' : item.status === 'failed' || item.status === 'FAILED' ? 'Failed' : 'Pending',
        referenceId: item.idempotency_key || item.delivery_id || item.job_id,
        description: `Federated exchange job with consent: ${item.consent_id || 'N/A'}`,
        format: 'FHIR R4 JSON',
        jobId: item.job_id,
        rawJob: item,
        module_results: item.module_results,
        delivered_records: item.delivered_records,
        fhir_bundle: item.fhir_bundle,
      }));
      setTransfers(mapped);
      setTotalCount(res.total_count ?? res.total ?? mapped.length);
      if (mapped.length > 0) {
        setSelectedTransfer(mapped[0]);
        setIsDetailsOpen(true);
      } else {
        setSelectedTransfer(null);
        setIsDetailsOpen(false);
      }
    } catch (err) {
      console.warn('Backend listTransfers failed:', err.message);
      setTransfers([]);
      setTotalCount(0);
      setSelectedTransfer(null);
      setIsDetailsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTransfers();
  }, [sourceOrg, destOrg, statusFilter, searchQuery, currentPage]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSourceOrg('All Organizations');
    setDestOrg('All Organizations');
    setStatusFilter('All Statuses');
    setCurrentPage(1);
  };

  const handleSelectRow = (transfer) => {
    setSelectedTransfer(transfer);
    setIsDetailsOpen(true);
  };

  const handleAddTransfer = (newTxn) => {
    setTransfers([newTxn, ...transfers]);
    setSelectedTransfer(newTxn);
    setIsDetailsOpen(true);
  };

  const handleViewPayload = (txn) => {
    setSelectedPayloadTxn({
      txnId: txn.txnId,
      source: txn.source,
      destination: txn.destinationFull || txn.destination,
      dataType: txn.dataType,
      dateTime: txn.fullDateTime || txn.dateTime,
      status: txn.status,
      details: {
        hl7Version: txn.format || "FHIR R4 JSON",
        protocol: "HTTPS / REST FHIR Endpoint",
        hash: "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        summary: txn.description,
        duration: "240ms"
      }
    });
  };

  // Local filter logic
  const filteredTransfers = transfers.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        t.txnId.toLowerCase().includes(q) ||
        t.patientId.toLowerCase().includes(q) ||
        t.source.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        t.dataType.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (sourceOrg !== 'All Organizations' && !t.source.includes(sourceOrg)) return false;
    if (destOrg !== 'All Organizations' && !t.destination.includes(destOrg)) return false;
    if (statusFilter !== 'All Statuses' && t.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Success':
      case 'Completed':
        return <span className="status-pill status-pill-success">Success</span>;
      case 'Pending':
        return <span className="status-pill status-pill-pending">Pending</span>;
      case 'Failed':
        return <span className="status-pill status-pill-failed">Failed</span>;
      default:
        return <span className="status-pill">{status}</span>;
    }
  };

  return (
    <div className="page-wrapper transfers-page">
      {/* Top Header Row */}
      <div className="transfers-title-banner">
        <div className="title-text-wrap">
          <h1 className="page-main-heading">Transfers</h1>
          <p className="page-subheading">
            Monitor and manage healthcare data transfers between connected organizations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-action-outline"
            onClick={fetchLiveTransfers}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff' }}
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>Sync</span>
          </button>
          <button 
            className="btn-new-transfer" 
            onClick={() => setIsNewTransferOpen(true)}
          >
            <Plus size={18} />
            <span>New Transfer</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="transfers-filters-card">
        <div className="transfers-filters-grid">
          {/* Search Input */}
          <div className="filter-item flex-search">
            <div className="filter-input-wrap">
              <Search size={15} className="filter-icon" />
              <input
                type="text"
                placeholder="Search by transaction ID, patient ID, source or destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="filter-item">
            <label className="filter-label">Date Range</label>
            <div className="filter-input-wrap">
              <Calendar size={15} className="filter-icon" />
              <input
                type="text"
                value={dateRange}
                readOnly
              />
            </div>
          </div>

          {/* Source Organization */}
          <div className="filter-item">
            <label className="filter-label">Source Organization</label>
            <div className="filter-select-wrap">
              <select 
                value={sourceOrg} 
                onChange={(e) => setSourceOrg(e.target.value)}
              >
                <option value="All Organizations">All Organizations</option>
                <option value="HOSPITAL_A">City Hospital 1 (HOSPITAL_A)</option>
                <option value="LAB_C">Central Laboratory (LAB_C)</option>
                <option value="HOSPITAL_B">Metro Hospital (HOSPITAL_B)</option>
                <option value="HOSPITAL_D">Sunrise Hospital (HOSPITAL_D)</option>
                <option value="LAB_E">Elite Diagnostics (LAB_E)</option>
                <option value="CLINIC_F">Green Valley Clinic (CLINIC_F)</option>
              </select>
              <ChevronDown size={14} className="filter-arrow" />
            </div>
          </div>

          {/* Destination Organization */}
          <div className="filter-item">
            <label className="filter-label">Destination Organization</label>
            <div className="filter-select-wrap">
              <select 
                value={destOrg} 
                onChange={(e) => setDestOrg(e.target.value)}
              >
                <option value="All Organizations">All Organizations</option>
                <option value="HOSPITAL_B">Metro Hospital (HOSPITAL_B)</option>
                <option value="HOSPITAL_A">City Hospital 1 (HOSPITAL_A)</option>
                <option value="LAB_C">Central Laboratory (LAB_C)</option>
                <option value="HOSPITAL_D">Sunrise Hospital (HOSPITAL_D)</option>
                <option value="LAB_E">Elite Diagnostics (LAB_E)</option>
                <option value="CLINIC_F">Green Valley Clinic (CLINIC_F)</option>
              </select>
              <ChevronDown size={14} className="filter-arrow" />
            </div>
          </div>

          {/* Status */}
          <div className="filter-item">
            <label className="filter-label">Status</label>
            <div className="filter-select-wrap">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
              <ChevronDown size={14} className="filter-arrow" />
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="filter-item filter-btn-col">
            <button className="btn-clear-filters" onClick={handleClearFilters}>
              <RotateCcw size={14} />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Transfers Table + Transfer Details Panel */}
      <div className={`transfers-layout-grid ${isDetailsOpen ? 'has-details' : 'full-width'}`}>
        {/* Table Card */}
        <div className="transfers-table-card">
          <div className="transfers-table-header">
            <h2 className="transfers-table-title">
              Transfers <span className="transfers-count">({filteredTransfers.length})</span>
            </h2>
          </div>

          <div className="table-responsive">
            <table className="transfers-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>#</th>
                  <th style={{ width: '13%' }}>Transaction ID</th>
                  <th style={{ width: '28%' }}>Source &rarr; Destination</th>
                  <th style={{ width: '16%' }}>Data Type</th>
                  <th style={{ width: '12%' }}>Patient ID</th>
                  <th style={{ width: '15%' }}>Date & Time</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '2%' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((item, idx) => {
                  const isSelected = selectedTransfer?.txnId === item.txnId && isDetailsOpen;
                  return (
                    <tr
                      key={item.txnId || idx}
                      className={`transfer-row ${isSelected ? 'row-selected' : ''}`}
                      onClick={() => handleSelectRow(item)}
                    >
                      <td className="col-idx">{idx + 1}</td>
                      <td className="col-txnid">
                        <button 
                          className="txn-link" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPayload(item);
                          }}
                        >
                          {item.txnId}
                        </button>
                      </td>
                      <td className="col-route">
                        <span className="route-source">{item.source}</span>
                        <span className="route-arrow">&rarr;</span>
                        <span className="route-destination">{item.destination}</span>
                      </td>
                      <td className="col-datatype">{item.dataType}</td>
                      <td className="col-patientid">{item.patientId}</td>
                      <td className="col-datetime">{item.dateTime}</td>
                      <td className="col-status">{getStatusBadge(item.status)}</td>
                      <td className="col-chevron">
                        <ChevronRight size={16} className="table-chevron-icon" />
                      </td>
                    </tr>
                  );
                })}

                {filteredTransfers.length === 0 && (
                  <tr>
                    <td colSpan="8" className="table-empty-row">
                      No transfers found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="transfers-pagination-footer">
            <span className="pagination-info">Showing 1-{filteredTransfers.length} of {totalCount} transfers</span>

            <div className="pagination-pages-group">
              <button 
                className="page-nav-btn" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>

              <button 
                className={`page-num-btn ${currentPage === 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(1)}
              >
                1
              </button>
              <button 
                className={`page-num-btn ${currentPage === 2 ? 'active' : ''}`}
                onClick={() => setCurrentPage(2)}
              >
                2
              </button>
              <button 
                className="page-nav-btn"
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Transfer Details Panel */}
        {isDetailsOpen && selectedTransfer && (
          <TransferDetailsPanel
            transfer={selectedTransfer}
            onClose={() => setIsDetailsOpen(false)}
            onViewPayload={handleViewPayload}
          />
        )}
      </div>

      {/* New Transfer Creation Modal */}
      <NewTransferModal
        isOpen={isNewTransferOpen}
        onClose={() => setIsNewTransferOpen(false)}
        onSubmit={handleAddTransfer}
      />

      {/* Transaction Details Inspector Modal */}
      {selectedPayloadTxn && (
        <TransactionModal
          transaction={selectedPayloadTxn}
          patient={{ name: selectedPayloadTxn.patientId, id: selectedPayloadTxn.patientId }}
          onClose={() => setSelectedPayloadTxn(null)}
        />
      )}
    </div>
  );
}
