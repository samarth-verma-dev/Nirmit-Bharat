// State
const state = { 
  step: 1, 
  totalSteps: 5,
  authMode: 'login', // 'login' or 'signup'
  isLoading: false
};

const navLabels = [
  { num: 1, label: 'App Identification' },
  { num: 2, label: 'App Integration' },
  { num: 3, label: 'Social Sources' },
  { num: 4, label: 'Configuration' },
  { num: 5, label: 'Confirmation' },
];

function switchAuthMode(mode) {
  state.authMode = mode;
  const isLogin = mode === 'login';
  
  // Update Title & Sub
  document.getElementById('auth-title').textContent = isLogin ? 'Welcome back' : 'Create account';
  document.getElementById('auth-sub').textContent = isLogin ? 'Sign in to your admin portal' : 'Get started with ReviewAI today';
  
  // Toggle Confirm Password Field
  const confirmGroup = document.getElementById('confirm-pass-group');
  if (isLogin) {
    confirmGroup.style.opacity = '0';
    confirmGroup.style.transform = 'translateY(-10px)';
    setTimeout(() => confirmGroup.style.display = 'none', 300);
  } else {
    confirmGroup.style.display = 'block';
    setTimeout(() => {
      confirmGroup.style.opacity = '1';
      confirmGroup.style.transform = 'translateY(0)';
    }, 10);
  }

  // Update Button Text
  document.getElementById('btn-auth-text').textContent = isLogin ? 'Login' : 'Sign Up';
  
  // Update Tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.toggle('active', tab.textContent.toLowerCase().replace(' ', '') === mode);
  });

  // Update Hint & Forgot Password Link
  document.getElementById('auth-hint').innerHTML = isLogin 
    ? "Don't have an account? <a href='#' onclick=\"switchAuthMode('signup')\">Sign up</a>"
    : "Already have an account? <a href='#' onclick=\"switchAuthMode('login')\">Login</a>";
  
  document.getElementById('forgot-link').style.display = isLogin ? 'block' : 'none';

  // Clear errors and re-validate
  clearAuthError();
  validateAuth();
}

function validateAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const confirmPass = document.getElementById('auth-confirm-pass').value;
  const btn = document.getElementById('btn-auth');

  let isValid = email.includes('@') && pass.length >= 6;

  if (state.authMode === 'signup') {
    isValid = isValid && pass === confirmPass;
  }

  btn.disabled = !isValid || state.isLoading;
}

function showAuthError(msg) {
  const err = document.getElementById('auth-error');
  err.textContent = msg;
  err.style.display = 'block';
}

function clearAuthError() {
  document.getElementById('auth-error').style.display = 'none';
}

function handleAuthSubmit() {
  if (state.isLoading) return;
  
  state.isLoading = true;
  const btn = document.getElementById('btn-auth');
  const loader = document.getElementById('btn-auth-loader');
  const btnText = document.getElementById('btn-auth-text');

  btn.disabled = true;
  loader.style.display = 'inline-block';
  btnText.style.display = 'none';
  clearAuthError();

  // Simulate API call
  setTimeout(() => {
    state.isLoading = false;
    loader.style.display = 'none';
    btnText.style.display = 'inline-block';
    
    // For demo, always succeed
    goToWizard();
  }, 1500);
}

// Init nav
function initNav() {
  const nav = document.getElementById('step-nav');
  nav.innerHTML = navLabels.map(s => `
    <div class="nav-item ${s.num === 1 ? 'active' : ''}" id="nav-${s.num}">
      <div class="nav-num">${s.num}</div>
      <div class="nav-label">${s.label}</div>
    </div>
  `).join('');
}

function goToWizard() {
  document.getElementById('screen-login').classList.remove('active');
  const w = document.getElementById('screen-wizard');
  w.style.display = 'flex';
  w.classList.add('active');
  initNav();
  updateProgress();
}

function updateProgress() {
  const pct = ((state.step - 1) / (state.totalSteps - 1)) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('step-label').textContent = `Step ${state.step} of ${state.totalSteps}`;

  navLabels.forEach(s => {
    const el = document.getElementById('nav-' + s.num);
    el.className = 'nav-item';
    if (s.num < state.step) el.classList.add('done');
    else if (s.num === state.step) el.classList.add('active');
  });
}

function showStep(n) {
  document.querySelectorAll('.step-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('step-' + n).classList.add('active');
}

function nextStep() {
  if (state.step === 5) return;
  if (state.step === 5 - 1 || true) {
    state.step++;
    showStep(state.step);
    updateProgress();
    if (state.step === 5) buildSummary();
  }
}

// Step 1 validation
function checkStep1() {
  const name = document.getElementById('s1-name').value.trim();
  const android = document.getElementById('s1-android').value.trim();
  const ios = document.getElementById('s1-ios').value.trim();
  document.getElementById('btn-s1').disabled = !(name && android && ios);
}

// File upload
function handleFileUpload(input) {
  if (input.files && input.files[0]) {
    const area = document.getElementById('upload-area');
    area.classList.add('uploaded');
    document.getElementById('upload-label').textContent = '✓ ' + input.files[0].name;
  }
}

// Test connection
function testConnection() {
  const btn = document.querySelector('.btn-secondary');
  btn.textContent = 'Testing...';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = '✓ Connected';
    btn.style.color = '#22c55e';
    btn.style.borderColor = 'rgba(34,197,94,0.4)';
    setTimeout(() => { btn.textContent = 'Test Connection'; btn.disabled = false; btn.style.color = ''; btn.style.borderColor = ''; }, 2500);
  }, 1800);
}

// Add social field
let extraFields = 0;
function addSocialField() {
  extraFields++;
  const div = document.createElement('div');
  div.className = 'field-group';
  div.innerHTML = `<label>Custom Source ${extraFields}</label><input type="text" placeholder="URL or handle"/>`;
  document.getElementById('social-fields').appendChild(div);
}

// Summary
function buildSummary() {
  const name = document.getElementById('s1-name').value || '—';
  const android = document.getElementById('s1-android').value || '—';
  const ios = document.getElementById('s1-ios').value || '—';
  const timeframe = document.getElementById('s4-timeframe');
  const tf = timeframe.options[timeframe.selectedIndex]?.text || 'Not set';
  const region = document.getElementById('s4-region');
  const reg = region.value || 'All regions';
  const alerts = document.getElementById('s4-alerts').checked ? 'Enabled' : 'Disabled';

  const items = [
    { k: 'App Name', v: name },
    { k: 'Android Package', v: android },
    { k: 'iOS App ID', v: ios },
    { k: 'Timeframe', v: tf },
    { k: 'Region', v: reg },
    { k: 'Smart Alerts', v: alerts },
  ];

  document.getElementById('summary-grid').innerHTML = items.map(i => `
    <div class="summary-item">
      <div class="summary-key">${i.k}</div>
      <div class="summary-val ${i.v === '—' ? 'empty' : ''}">${i.v}</div>
    </div>
  `).join('');
}

// Start analysis
function startAnalysis() {
  document.getElementById('screen-wizard').style.display = 'none';
  document.getElementById('screen-wizard').classList.remove('active');
  const proc = document.getElementById('screen-processing');
  proc.style.display = 'flex';
  proc.classList.add('active');
  runProcessing();
}

const processingSteps = [
  'Fetching app store data...',
  'Scanning social media mentions...',
  'Running sentiment analysis...',
  'Clustering review topics...',
  'Building insights dashboard...',
];

function runProcessing() {
  const fill = document.getElementById('proc-fill');
  const stepText = document.getElementById('proc-step');
  const list = document.getElementById('proc-steps');

  list.innerHTML = processingSteps.map((s, i) => `
    <div class="proc-step-item" id="psi-${i}">
      <span id="psi-icon-${i}">○</span> ${s}
    </div>
  `).join('');

  let idx = 0;
  function advance() {
    if (idx > 0) {
      const prev = document.getElementById('psi-' + (idx - 1));
      prev.classList.remove('active'); prev.classList.add('done');
      document.getElementById('psi-icon-' + (idx - 1)).textContent = '✓';
    }
    if (idx >= processingSteps.length) {
      fill.style.width = '100%';
      setTimeout(showComplete, 600);
      return;
    }
    const cur = document.getElementById('psi-' + idx);
    cur.classList.add('active');
    document.getElementById('psi-icon-' + idx).textContent = '●';
    stepText.textContent = processingSteps[idx];
    fill.style.width = ((idx + 1) / processingSteps.length * 100) + '%';
    idx++;
    setTimeout(advance, 1100);
  }
  advance();
}

function showComplete() {
  document.getElementById('screen-processing').style.display = 'none';
  document.getElementById('screen-processing').classList.remove('active');

  const tf = document.getElementById('s4-timeframe');
  const days = tf.value || '30';
  document.getElementById('stat-days').textContent = days;

  const comp = document.getElementById('screen-complete');
  comp.style.display = 'flex';
  comp.classList.add('active');
}

function goDashboard() {
  alert('Redirecting to your Support Dashboard...');
}
