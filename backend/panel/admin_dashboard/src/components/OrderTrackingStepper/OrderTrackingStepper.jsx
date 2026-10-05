import React, { useState } from 'react';
import { 
  FiCheckCircle, 
  FiPackage, 
  FiTruck, 
  FiCheck, 
  FiCopy,
  FiCheck as FiCopiedCheck
} from 'react-icons/fi';
import './OrderTrackingStepper.css';

const STAGES = [
  { id: 'pending',          title: 'Order Placed',      icon: FiCheckCircle, desc: 'Received & Queued' },
  { id: 'confirmed',        title: 'Confirmed',         icon: FiPackage,     desc: 'Artisan Verified' },
  { id: 'packed',           title: 'Packed',            icon: FiPackage,     desc: 'Luxury Boxed' },
  { id: 'shipped',          title: 'In Transit',        icon: FiTruck,       desc: 'Courier Dispatched' },
  { id: 'out_for_delivery', title: 'Out for Delivery',  icon: FiTruck,       desc: 'Out for Delivery' },
  { id: 'delivered',        title: 'Delivered',         icon: FiCheck,       desc: 'Safely Delivered' }
];

export default function OrderTrackingStepper({ order = {}, trackingData = null }) {
  const [copied, setCopied] = useState(false);

  const rawStatus = String(order.orderStatus || order.status || 'Pending').trim();
  const courierName = trackingData?.courier || order.courierPartner || 'Courier Partner';
  const awbCode = trackingData?.trackingNumber || order.awb_code || 'N/A';

  const statusMap = {
    'Pending': 0,
    'Confirmed': 1,
    'Packed': 2,
    'Shipped': 3,
    'Out for Delivery': 4,
    'Delivered': 5
  };

  const activeStep = statusMap[rawStatus] ?? 0;

  const handleCopyAwb = () => {
    if (!awbCode || awbCode === 'N/A') return;
    navigator.clipboard.writeText(awbCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Headline Status Text
  const getHeadline = () => {
    if (rawStatus === 'Cancelled') return 'Order Cancelled';
    if (activeStep === 5) return 'Package Successfully Delivered';
    if (activeStep === 4) return 'Package is Out for Delivery';
    if (activeStep === 3) return `In Transit with ${courierName}`;
    if (activeStep === 2) return 'Order Packed & Luxury Boxed';
    if (activeStep === 1) return 'Order Confirmed by Artisan Atelier';
    return 'Order Placed & Queued';
  };

  return (
    <div className="ots-container">
      {/* 1. Header Banner */}
      <div className="ots-header">
        <div className="ots-header-info">
          <span className="ots-live-badge">
            <span className="ots-pulse-dot" /> LIVE STATUS
          </span>
          <h3 className="ots-headline">{getHeadline()}</h3>
          
          <div className="ots-meta-row">
            <span className="ots-meta-item">
              <strong>Partner:</strong> {courierName}
            </span>
            {awbCode && awbCode !== 'N/A' && (
              <span className="ots-meta-item ots-awb-box">
                <strong>AWB:</strong> {awbCode}
                <button type="button" className="ots-copy-btn" onClick={handleCopyAwb} title="Copy AWB Code">
                  {copied ? <FiCopiedCheck style={{ color: '#16a34a' }} /> : <FiCopy />}
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. 5-Stage Stepper Bar */}
      <div className="ots-stepper-bar">
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;
          const IconComp = stage.icon;

          return (
            <div
              key={stage.id}
              className={`ots-step ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`}
            >
              {/* Connector line */}
              {idx > 0 && <div className={`ots-connector ${idx <= activeStep ? 'is-filled' : ''}`} />}

              <div className="ots-step-node">
                <div className="ots-icon-circle">
                  {isDone ? <FiCheck /> : <IconComp />}
                </div>
                <div className="ots-step-label">{stage.title}</div>
                <div className="ots-step-sub">
                  {isCurrent ? (
                    <span className="ots-active-tag">Active</span>
                  ) : isDone ? (
                    <span className="ots-done-tag">Done</span>
                  ) : (
                    stage.desc
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
