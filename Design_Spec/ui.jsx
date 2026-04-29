// Shared UI bits
const { useState, useEffect, useRef, useMemo, useCallback } = React;

function Btn({ variant = 'secondary', size, icon, children, onClick, disabled, type, title, className = '' }) {
  const cls = `btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${!children ? 'btn-icon' : ''} ${className}`.trim();
  return (
    <button className={cls} onClick={onClick} disabled={disabled} type={type || 'button'} title={title}>
      {icon}
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const map = {
    healthy:    { c: 'status-healthy',   label: 'Healthy',    Ic: Icons.CheckCircle },
    warning:    { c: 'status-warning',   label: 'Warning',    Ic: Icons.AlertTriangle },
    critical:   { c: 'status-critical',  label: 'Critical',   Ic: Icons.XCircle },
    deprecated: { c: 'status-deprecated',label: 'Deprecated', Ic: Icons.Clock },
    unknown:    { c: 'status-unknown',   label: 'Unknown',    Ic: Icons.HelpCircle },
    info:       { c: 'status-info',      label: 'Cleanup',    Ic: Icons.Archive },
  };
  const m = map[status] || map.unknown;
  const Ic = m.Ic;
  return (
    <span className={`badge ${m.c}`}>
      <Ic size={12} strokeWidth={2} />
      {m.label}
    </span>
  );
}

function StatusDot({ status }) {
  const colors = {
    healthy: 'var(--color-success)',
    warning: 'var(--color-warning)',
    critical: 'var(--color-danger)',
    deprecated: 'var(--color-deprecated)',
    unknown: 'var(--color-neutral)',
    info: 'var(--color-info)',
  };
  return <span className="status-dot" style={{ background: colors[status] || colors.unknown }} />;
}

function SeverityBadge({ sev }) {
  return <span className={`sev-badge sev-${sev}`}>{sev}</span>;
}

function ScoreBadge({ score }) {
  let cls = 'sev-low';
  let label = 'Low risk';
  if (score >= 80) { cls = 'sev-critical'; label = 'Critical risk'; }
  else if (score >= 60) { cls = 'sev-high'; label = 'High risk'; }
  else if (score >= 30) { cls = 'sev-medium'; label = 'Medium risk'; }
  return <span className={`score ${cls}`} title={label}>{score}</span>;
}

function TaskStatusBadge({ status }) {
  const map = {
    open:        { c: 'status-warning', label: 'Open',        Ic: Icons.Circle },
    in_progress: { c: 'status-accent',  label: 'In Progress', Ic: Icons.Loader },
    resolved:    { c: 'status-healthy', label: 'Resolved',    Ic: Icons.CheckCircle },
    won_t_fix:   { c: 'status-unknown', label: "Won't Fix",   Ic: Icons.MinusCircle },
  };
  const m = map[status] || map.open;
  const Ic = m.Ic;
  return (
    <span className={`badge ${m.c}`}>
      <Ic size={12} strokeWidth={2} />
      {m.label}
    </span>
  );
}

function Toggle({ on, onChange }) {
  return <button type="button" className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on} />;
}

function Empty({ icon, heading, support, cta }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <p className="empty-h">{heading}</p>
      <p className="empty-p">{support}</p>
      {cta && <div style={{ marginTop: 8 }}>{cta}</div>}
    </div>
  );
}

Object.assign(window, { Btn, StatusBadge, StatusDot, SeverityBadge, ScoreBadge, TaskStatusBadge, Toggle, Empty });
