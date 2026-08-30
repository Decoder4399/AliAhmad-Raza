/* =============================================
   DR LAB — MAIN LOGIC
   ============================================= */
(function () {
  'use strict';

  /* =============================================
     DATA: COMPONENTS
     ============================================= */
  const COMPONENTS = [
    { name: 'RDS', status: 'healthy', icon: '\uf1c0', detail: 'Multi-AZ enabled, automated backups' },
    { name: 'S3', status: 'healthy', icon: '\uf187', detail: 'Versioning enabled, cross-region replication' },
    { name: 'ECS', status: 'healthy', icon: '\uf1b3', detail: 'Multi-AZ task placement, health checks' },
    { name: 'DNS', status: 'degraded', icon: '\uf0ac', detail: 'Health checks configured, TTL 60s' },
    { name: 'Secrets', status: 'failed', icon: '\uf084', detail: 'Not replicated to DR region' },
    { name: 'ALB', status: 'healthy', icon: '\uf074', detail: 'Cross-zone load balancing enabled' },
    { name: 'CloudFront', status: 'healthy', icon: '\uf0ed', detail: 'Global edge network, origin failover' },
    { name: 'NAT Gateway', status: 'healthy', icon: '\uf0ec', detail: 'Per-AZ deployment' },
  ];

  /* =============================================
     DATA: DR SCENARIOS
     ============================================= */
  const DR_SCENARIOS = [
    { id: 'region-failure', name: 'Region Failure', icon: '\uf0e7', impact: 'CRITICAL',
      readiness: 78, rto: 23, rpo: 4,
      affected: [
        { name: 'Primary Region', status: 'failed', icon: '\uf057', note: 'All resources down' },
        { name: 'CloudFront', status: 'healthy', icon: '\uf00c', note: 'Serves cached content' },
        { name: 'Route 53', status: 'degraded', icon: '\uf0e7', note: 'Failover in progress' },
        { name: 'DR Region ECS', status: 'degraded', icon: '\uf0e7', note: 'Scaling up' },
        { name: 'RDS Replica', status: 'healthy', icon: '\uf00c', note: 'Promoted to primary' },
      ],
      recovery: [
        'Detect region failure via Route 53 health checks',
        'Route 53 DNS failover to secondary region',
        'Cross-region RDS replica promoted to primary',
        'ECS services scaled up in DR region',
        'CloudFront origin switches to DR endpoint',
        'Secrets and configuration restored',
        'Application health validated',
        'Full recovery confirmed'
      ]
    },
    { id: 'az-failure', name: 'AZ Failure', icon: '\uf0e7', impact: 'HIGH',
      readiness: 85, rto: 8, rpo: 1,
      affected: [
        { name: 'ECS (AZ-A)', status: 'failed', icon: '\uf057', note: 'Tasks terminated' },
        { name: 'RDS Primary', status: 'failed', icon: '\uf057', note: 'If in failed AZ' },
        { name: 'ALB', status: 'degraded', icon: '\uf0e7', note: 'Rerouting traffic' },
        { name: 'ECS (AZ-B)', status: 'healthy', icon: '\uf00c', note: 'Absorbing traffic' },
        { name: 'RDS Standby', status: 'healthy', icon: '\uf00c', note: 'Auto-promoted' },
      ],
      recovery: [
        'Detect AZ degradation via EC2 health checks',
        'ALB marks AZ-A targets as unhealthy',
        'RDS Multi-AZ promotes standby (60-120s)',
        'ECS reschedules tasks to AZ-B',
        'ALB routes all traffic to healthy targets',
        'Pod disruption budgets ensure minimum availability',
        'Health checks pass — recovery complete'
      ]
    },
    { id: 'db-failure', name: 'Database Failure', icon: '\uf1c0', impact: 'CRITICAL',
      readiness: 72, rto: 5, rpo: 2,
      affected: [
        { name: 'RDS Primary', status: 'failed', icon: '\uf057', note: 'Instance failure' },
        { name: 'ECS Application', status: 'degraded', icon: '\uf0e7', note: '5xx errors' },
        { name: 'ALB', status: 'degraded', icon: '\uf0e7', note: 'Receiving errors' },
        { name: 'Users', status: 'failed', icon: '\uf057', note: 'App unavailable' },
      ],
      recovery: [
        'Detect RDS failure via CloudWatch alarm',
        'RDS Multi-AZ promotes standby automatically',
        'New primary endpoint available (60-120s)',
        'Application connection pool refreshes',
        'Retry logic reconnects to new endpoint',
        'Health checks pass — recovery complete'
      ]
    },
    { id: 'dns-failure', name: 'DNS Failure', icon: '\uf0ac', impact: 'CRITICAL',
      readiness: 65, rto: 15, rpo: 0,
      affected: [
        { name: 'Route 53', status: 'failed', icon: '\uf057', note: 'Resolution failure' },
        { name: 'All Services', status: 'healthy', icon: '\uf00c', note: 'Running but unreachable' },
        { name: 'Users', status: 'failed', icon: '\uf057', note: 'Cannot resolve domain' },
      ],
      recovery: [
        'Route 53 managed service redundancy activates',
        'Health checks trigger failover if configured',
        'DNS propagation across resolvers (TTL dependent)',
        'Users regain access via re-resolved IPs',
        'Verify full connectivity restored'
      ]
    },
    { id: 'k8s-failure', name: 'Kubernetes Cluster Failure', icon: '\uf0c2', impact: 'HIGH',
      readiness: 70, rto: 12, rpo: 0,
      affected: [
        { name: 'EKS Control Plane', status: 'failed', icon: '\uf057', note: 'API server unreachable' },
        { name: 'Running Pods', status: 'healthy', icon: '\uf00c', note: 'Continue running' },
        { name: 'New Deployments', status: 'failed', icon: '\uf057', note: 'Cannot schedule' },
        { name: 'Service Discovery', status: 'degraded', icon: '\uf0e7', note: 'DNS may fail' },
      ],
      recovery: [
        'EKS control plane recovery (AWS managed)',
        'Verify node connectivity to new control plane',
        'Restart any failed deployments',
        'Validate service endpoints and DNS',
        'Confirm application health'
      ]
    },
    { id: 'data-corruption', name: 'Data Corruption', icon: '\uf0ad', impact: 'HIGH',
      readiness: 68, rto: 20, rpo: 5,
      affected: [
        { name: 'RDS Data', status: 'degraded', icon: '\uf0e7', note: 'Corrupted records' },
        { name: 'S3 Objects', status: 'degraded', icon: '\uf0e7', note: 'Potentially affected' },
        { name: 'Application', status: 'degraded', icon: '\uf0e7', note: 'Inconsistent data' },
      ],
      recovery: [
        'Detect corruption via data integrity checks',
        'Stop writes to prevent further damage',
        'Identify corruption scope and timestamp',
        'Restore from most recent clean backup',
        'Apply point-in-time recovery (PITR)',
        'Validate data integrity post-restore',
        'Resume application operations'
      ]
    },
  ];

  /* =============================================
     RENDER: COMPONENTS
     ============================================= */
  function renderComponents() {
    const grid = document.getElementById('dr-components-grid');
    COMPONENTS.forEach(c => {
      grid.innerHTML += `
        <div class="dr-component">
          <div class="dr-component-icon ${c.status}">
            <i class="fa-solid" style="font-family:'Font Awesome 6 Free';font-weight:900;">${c.icon}</i>
          </div>
          <div>
            <div class="dr-component-name">${c.name}</div>
            <div class="dr-component-status ${c.status}">${c.status === 'healthy' ? 'Healthy' : c.status === 'degraded' ? 'Degraded' : 'At Risk'}</div>
          </div>
        </div>`;
    });
  }

  /* =============================================
     RENDER: SCENARIOS
     ============================================= */
  function renderScenarios() {
    const grid = document.getElementById('dr-scenario-grid');
    DR_SCENARIOS.forEach(s => {
      grid.innerHTML += `
        <div class="dr-scenario-card" data-scenario="${s.id}">
          <i class="fa-solid" style="font-family:'Font Awesome 6 Free';font-weight:900;">${s.icon}</i>
          <span>${s.name}</span>
        </div>`;
    });

    grid.querySelectorAll('.dr-scenario-card').forEach(card => {
      card.addEventListener('click', () => {
        grid.querySelectorAll('.dr-scenario-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const scenario = DR_SCENARIOS.find(s => s.id === card.dataset.scenario);
        renderScenarioResult(scenario);
      });
    });
  }

  function renderScenarioResult(scenario) {
    const panel = document.getElementById('dr-scenario-result');
    panel.style.display = 'block';
    document.getElementById('dr-result-title').textContent = scenario.name + ' — Recovery Analysis';
    const impactBadge = document.getElementById('dr-result-impact');
    impactBadge.textContent = scenario.impact;
    impactBadge.className = 'impact-badge ' + scenario.impact.toLowerCase();

    // Affected components
    const affected = document.getElementById('dr-affected');
    affected.innerHTML = '<h4>Affected Components</h4>';
    scenario.affected.forEach(a => {
      affected.innerHTML += `
        <div class="dr-affected-item">
          <span class="ai-icon" style="color:${a.status === 'failed' ? '#ef4444' : a.status === 'degraded' ? '#eab308' : '#10b981'}">${a.icon}</span>
          <span class="ai-name">${a.name}</span>
          <span class="ai-status">${a.note}</span>
        </div>`;
    });

    // Recovery sequence
    const recovery = document.getElementById('dr-recovery');
    recovery.innerHTML = '<h4>Recovery Sequence</h4>';
    scenario.recovery.forEach((step, i) => {
      const div = document.createElement('div');
      div.className = 'dr-recovery-step';
      div.style.animationDelay = `${i * 0.15}s`;
      div.innerHTML = `<div class="rs-num">${i + 1}</div><div class="rs-text">${step}</div>`;
      recovery.appendChild(div);
    });

    // Animate steps
    const steps = recovery.querySelectorAll('.dr-recovery-step');
    steps.forEach((step, i) => {
      setTimeout(() => {
        if (i > 0) { steps[i-1].classList.remove('active'); steps[i-1].classList.add('complete'); }
        step.classList.add('active');
        if (i === steps.length - 1) {
          setTimeout(() => { step.classList.remove('active'); step.classList.add('complete'); }, 400);
        }
      }, i * 500);
    });
  }

  /* =============================================
     RENDER: RTO/RPO CALCULATOR
     ============================================= */
  document.getElementById('calc-run').addEventListener('click', () => {
    const targetRTO = parseInt(document.getElementById('calc-rto').value) || 30;
    const targetRPO = parseInt(document.getElementById('calc-rpo').value) || 15;
    const backupFreq = parseInt(document.getElementById('calc-backup').value) || 5;
    const replication = document.getElementById('calc-replication').value;
    const strategy = document.getElementById('calc-strategy').value;

    // Calculate simulated RTO
    let simRTO = 0;
    simRTO += replication === 'cross-region' ? 2 : replication === 'cross-az' ? 1 : 5; // DNS/failover
    if (strategy === 'multi-site') simRTO += 0.5;
    else if (strategy === 'warm-standby') simRTO += 3;
    else if (strategy === 'pilot-light') simRTO += 8;
    else simRTO += 25; // backup-restore
    simRTO += replication === 'none' ? 5 : 1; // Compute startup
    simRTO += 1; // Health checks

    // Calculate simulated RPO
    let simRPO = backupFreq;
    if (replication === 'cross-region') simRPO = Math.min(simRPO, 1);
    else if (replication === 'cross-az') simRPO = Math.min(simRPO, 0.5);

    const rtoPass = simRTO <= targetRTO;
    const rpoPass = simRPO <= targetRPO;

    document.getElementById('calc-sim-rto').textContent = simRTO.toFixed(1) + ' min';
    document.getElementById('calc-sim-rto').className = 'calc-result-value ' + (rtoPass ? 'pass' : 'fail');

    document.getElementById('calc-sim-rpo').textContent = simRPO.toFixed(1) + ' min';
    document.getElementById('calc-sim-rpo').className = 'calc-result-value ' + (rpoPass ? 'pass' : 'fail');

    document.getElementById('calc-rto-status').textContent = rtoPass ? 'PASS' : 'FAIL';
    document.getElementById('calc-rto-status').className = 'calc-result-value ' + (rtoPass ? 'pass' : 'fail');

    document.getElementById('calc-rpo-status').textContent = rpoPass ? 'PASS' : 'FAIL';
    document.getElementById('calc-rpo-status').className = 'calc-result-value ' + (rpoPass ? 'pass' : 'fail');

    const explanation = document.getElementById('calc-explanation');
    let text = `<p><strong>Strategy: ${strategy.replace('-', ' ')}</strong> with <strong>${replication.replace('-', ' ')} replication</strong>.</p>`;
    text += `<p>`;
    if (strategy === 'multi-site') text += 'Active/Active provides near-instant failover. ';
    else if (strategy === 'warm-standby') text += 'Warm standby maintains a reduced-capacity environment ready to scale. ';
    else if (strategy === 'pilot-light') text += 'Pilot light keeps critical resources warm but requires scaling on failover. ';
    else text += 'Backup and restore is the most cost-effective but has the longest RTO. ';
    if (replication === 'cross-region') text += 'Cross-region replication minimizes data loss. ';
    else if (replication === 'cross-az') text += 'Cross-AZ replication provides AZ-level protection. ';
    else text += 'Without replication, recovery depends on backup frequency. ';
    text += `</p>`;
    text += `<p style="color:var(--text-muted);font-size:0.78rem;margin-top:0.5rem;">This is an architectural estimate based on typical AWS behavior. Actual recovery times depend on data volume, network conditions, and specific configuration.</p>`;
    explanation.innerHTML = text;
  });

  /* =============================================
     DR READINESS SCORE ANIMATION
     ============================================= */
  function animateDRScore() {
    const targetScore = 78;
    const circle = document.getElementById('dr-circle');
    const scoreEl = document.getElementById('dr-score');
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (targetScore / 100) * circumference;

    setTimeout(() => {
      circle.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.1,0.8,0.2,1)';
      circle.style.strokeDashoffset = offset;
    }, 500);

    let current = 0;
    const interval = setInterval(() => {
      current++;
      scoreEl.textContent = current;
      if (current >= targetScore) clearInterval(interval);
    }, 20);
  }

  /* =============================================
     INIT
     ============================================= */
  renderComponents();
  renderScenarios();
  animateDRScore();

})();
