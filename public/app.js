/* ByteForge frontend logic */
const API = '';
let ALL_ITEMS = [];
let currentUser = null; // {name,email,enrolled:[...]}
let currentItem = null; // item currently being viewed/checked out/learned
let learnActiveWeekIdx = 0;
let courseVisibleCount = 12;
let internVisibleCount = 12;

function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }
function token(){ return localStorage.getItem('bf_token'); }
function setToken(t){ if(t) localStorage.setItem('bf_token', t); else localStorage.removeItem('bf_token'); }

async function api(path, opts={}){
  const headers = Object.assign({'Content-Type':'application/json'}, opts.headers||{});
  if (token()) headers['Authorization'] = 'Bearer ' + token();
  const res = await fetch(API + path, Object.assign({}, opts, {headers}));
  let data = null;
  try { data = await res.json(); } catch(e) { data = null; }
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Request failed');
    err.detail = data && data.detail;
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ---------- View routing ---------- */
function showView(name){
  $all('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + name);
  if (el) el.classList.add('active');
  $all('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
  window.scrollTo({top:0, behavior:'smooth'});
  document.getElementById('moreMenu').classList.remove('open');

  if (name === 'dashboard') renderDashboard();
  if (name === 'courses') renderCourseList();
  if (name === 'internships') renderInternshipList();
}

document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-view]');
  if (trigger) {
    e.preventDefault();
    const view = trigger.dataset.view;
    if ((view === 'dashboard') && !currentUser) { showView('login'); return; }
    showView(view);
  }
});

document.getElementById('moreBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('moreMenu').classList.toggle('open');
});
document.addEventListener('click', () => document.getElementById('moreMenu').classList.remove('open'));

/* ---------- Nav auth area ---------- */
function renderNavAuth(){
  const el = document.getElementById('navAuthArea');
  if (currentUser) {
    el.innerHTML = `<span class="user-chip">● ${currentUser.name.split(' ')[0]}</span><button class="tab-cta" data-view="dashboard">Dashboard</button>`;
  } else {
    el.innerHTML = `<button class="tab-ghost-cta" data-view="login">Log in</button><button class="tab-cta" data-view="signup">Sign up</button>`;
  }
}

/* ---------- Load catalog ---------- */
async function loadCatalog(){
  ALL_ITEMS = await api('/api/courses');
  document.getElementById('statCourses').textContent = ALL_ITEMS.filter(i=>i.type==='course').length;
  document.getElementById('statInternships').textContent = ALL_ITEMS.filter(i=>i.type==='internship').length;
  renderHomeGrids();
}

function cardHTML(item){
  const priceHTML = item.mrp > item.price
    ? `<small>₹${item.mrp}</small>₹${item.price}`
    : `₹${item.price}`;
  return `
  <div class="card" data-id="${item.id}">
    <div class="card-top">
      <span class="type-tag">${item.type}</span>
      <span class="level-tag">${item.level}</span>
    </div>
    <h3>${item.name}</h3>
    <p style="font-size:13px;">${item.duration}</p>
    <div class="badges">${item.tags.map(t=>`<span class="badge">${t}</span>`).join('')}</div>
    <div class="card-foot">
      <div class="price">${priceHTML}</div>
      <button class="btn-sm" data-open="${item.id}">View</button>
    </div>
  </div>`;
}

function renderHomeGrids(){
  const courses = ALL_ITEMS.filter(i=>i.type==='course').slice(0,6);
  const interns = ALL_ITEMS.filter(i=>i.type==='internship').slice(0,6);
  document.getElementById('homeCourseGrid').innerHTML = courses.map(cardHTML).join('');
  document.getElementById('homeInternshipGrid').innerHTML = interns.map(cardHTML).join('');
}

function renderCourseList(){
  const textF = document.getElementById('courseFilterText').value.toLowerCase();
  const levelF = document.getElementById('courseFilterLevel').value;
  let items = ALL_ITEMS.filter(i=>i.type==='course');
  if (textF) items = items.filter(i => i.name.toLowerCase().includes(textF) || i.tags.some(t=>t.toLowerCase().includes(textF)));
  if (levelF) items = items.filter(i => i.level === levelF);
  document.getElementById('allCourseGrid').innerHTML = items.slice(0, courseVisibleCount).map(cardHTML).join('') || `<div class="empty">No courses match that filter.</div>`;
  document.getElementById('courseLoadMoreBtn').style.display = items.length > courseVisibleCount ? 'inline-flex' : 'none';
}
function renderInternshipList(){
  const textF = document.getElementById('internFilterText').value.toLowerCase();
  const durF = document.getElementById('internFilterDuration').value;
  let items = ALL_ITEMS.filter(i=>i.type==='internship');
  if (textF) items = items.filter(i => i.name.toLowerCase().includes(textF) || i.tags.some(t=>t.toLowerCase().includes(textF)));
  if (durF) items = items.filter(i => i.duration === durF);
  document.getElementById('allInternshipGrid').innerHTML = items.slice(0, internVisibleCount).map(cardHTML).join('') || `<div class="empty">No internships match that filter.</div>`;
  document.getElementById('internLoadMoreBtn').style.display = items.length > internVisibleCount ? 'inline-flex' : 'none';
}
document.getElementById('courseFilterText').addEventListener('input', renderCourseList);
document.getElementById('courseFilterLevel').addEventListener('change', renderCourseList);
document.getElementById('internFilterText').addEventListener('input', renderInternshipList);
document.getElementById('internFilterDuration').addEventListener('change', renderInternshipList);
document.getElementById('courseLoadMoreBtn').addEventListener('click', () => { courseVisibleCount += 12; renderCourseList(); });
document.getElementById('internLoadMoreBtn').addEventListener('click', () => { internVisibleCount += 12; renderInternshipList(); });

document.getElementById('navSearchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = e.target.value.trim();
    if (!q) return;
    document.getElementById('courseFilterText').value = q;
    document.getElementById('internFilterText').value = q;
    const hasCourseMatch = ALL_ITEMS.some(i=>i.type==='course' && i.name.toLowerCase().includes(q.toLowerCase()));
    showView(hasCourseMatch ? 'courses' : 'internships');
  }
});

/* ---------- Item detail ---------- */
document.addEventListener('click', (e) => {
  const openBtn = e.target.closest('[data-open]');
  const card = e.target.closest('.card');
  const id = (openBtn && openBtn.dataset.open) || (card && !openBtn && card.dataset.id);
  if (id) openItem(id);
});

function openItem(id){
  const item = ALL_ITEMS.find(i => i.id === id);
  if (!item) return;
  currentItem = item;
  document.getElementById('itemType').textContent = item.type;
  document.getElementById('itemName').textContent = item.name;
  document.getElementById('itemTags').innerHTML = item.tags.map(t=>`<span class="badge">${t}</span>`).join('') + `<span class="badge">${item.duration}</span><span class="badge">${item.level}</span>`;
  document.getElementById('itemMrp').textContent = item.mrp > item.price ? `₹${item.mrp}` : '';
  document.getElementById('itemPrice').textContent = ` ₹${item.price}`;

  const enrollment = getMyEnrollment(item.id);
  const btn = document.getElementById('itemEnrollBtn');
  if (enrollment) {
    btn.textContent = 'Go to dashboard';
    btn.onclick = () => showView('dashboard');
  } else {
    btn.textContent = 'Enroll now';
    btn.onclick = () => { if (!currentUser) { showView('login'); return; } openCheckout(item); };
  }

  const curEl = document.getElementById('itemCurriculum');
  if (item.weeks && item.weeks.length) {
    curEl.innerHTML = item.weeks.map((w, idx) => `
      <details class="curriculum-week" ${idx===0 ? 'open' : ''}>
        <summary>${w.title}</summary>
        <ul>${w.lessons.map(l => `<li>${l}</li>`).join('')}</ul>
      </details>`).join('');
  } else {
    curEl.innerHTML = `<div class="empty">Curriculum details coming soon.</div>`;
  }
  showView('item');
}

/* ---------- Auth ---------- */
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('signupAlert');
  alertEl.innerHTML = '';
  try {
    const data = await api('/api/signup', { method:'POST', body: JSON.stringify({
      name: document.getElementById('suName').value,
      email: document.getElementById('suEmail').value,
      password: document.getElementById('suPass').value,
    })});
    setToken(data.token);
    await loadMe();
    showView('dashboard');
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('loginAlert');
  alertEl.innerHTML = '';
  try {
    const data = await api('/api/login', { method:'POST', body: JSON.stringify({
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPass').value,
    })});
    setToken(data.token);
    await loadMe();
    showView('dashboard');
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  setToken(null);
  currentUser = null;
  renderNavAuth();
  showView('home');
});

async function loadMe(){
  if (!token()) { currentUser = null; renderNavAuth(); return; }
  try {
    currentUser = await api('/api/me');
  } catch (e) {
    currentUser = null; setToken(null);
  }
  renderNavAuth();
}

function getMyEnrollment(courseId){
  if (!currentUser || !currentUser.enrolled) return null;
  return currentUser.enrolled.find(e => e.courseId === courseId) || null;
}

/* ---------- Checkout ---------- */
function openCheckout(item){
  currentItem = item;
  document.getElementById('checkoutFormWrap').style.display = 'block';
  document.getElementById('checkoutSuccess').style.display = 'none';
  document.getElementById('checkoutAlert').innerHTML = '';
  document.getElementById('orderSummary').innerHTML = `
    <h3 style="margin-bottom:16px;">Order summary</h3>
    <div class="order-row"><span>${item.name}</span><span>₹${item.price}</span></div>
    <div class="order-row"><span>Platform fee</span><span>₹0</span></div>
    <div class="order-row total"><span>Total</span><span>₹${item.price}</span></div>
  `;
  showView('checkout');
}

document.getElementById('payButton').addEventListener('click', async () => {
  const btn = document.getElementById('payButton');
  const alertEl = document.getElementById('checkoutAlert');
  alertEl.innerHTML = '';
  btn.disabled = true; btn.textContent = 'Processing...';
  try {
    const order = await api('/api/checkout/create-order', { method:'POST', body: JSON.stringify({ courseId: currentItem.id }) });
    const rzp = new Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'ByteForge',
      description: currentItem.name,
      handler: async function(response){
        try {
          await api('/api/checkout/verify', { method:'POST', body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            courseId: currentItem.id,
          })});
          await loadMe();
          document.getElementById('checkoutFormWrap').style.display = 'none';
          document.getElementById('checkoutSuccess').style.display = 'block';
        } catch (err) {
          alertEl.innerHTML = `<div class="alert alert-error">Payment succeeded but enrollment failed: ${err.message}</div>`;
        }
      },
      theme: { color: '#F5A623' },
    });
    rzp.on('payment.failed', function(resp){
      alertEl.innerHTML = `<div class="alert alert-error">Payment failed: ${resp.error.description}</div>`;
    });
    rzp.open();
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}${err.detail ? ' — ' + err.detail : ''}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Pay & Enroll';
  }
});

/* ---------- Dashboard ---------- */
function renderDashboard(){
  if (!currentUser) { showView('login'); return; }
  document.getElementById('dashGreeting').textContent = `Welcome back, ${currentUser.name.split(' ')[0]}`;
  const enrolled = currentUser.enrolled || [];
  document.getElementById('dashEnrolledCount').textContent = enrolled.length;
  document.getElementById('dashOfferCount').textContent = enrolled.filter(e=>e.offerLetter).length;
  document.getElementById('dashCertCount').textContent = enrolled.filter(e=>e.certificate).length;

  const listEl = document.getElementById('enrolledList');
  if (!enrolled.length) {
    listEl.innerHTML = `<div class="empty">You haven't enrolled in anything yet. <br><br><button class="btn btn-primary" data-view="courses">Browse courses</button></div>`;
    return;
  }
  listEl.innerHTML = enrolled.map(e => {
    const item = ALL_ITEMS.find(i => i.id === e.courseId);
    if (!item) return '';
    const totalLessons = (item.weeks||[]).reduce((n,w)=>n+w.lessons.length,0) || 1;
    const done = (e.progress && e.progress.completed) ? e.progress.completed.length : 0;
    const pct = Math.round((done/totalLessons)*100);
    return `
    <div class="enrolled-row" data-open-learn="${item.id}">
      <span class="type-tag">${item.type}</span>
      <div style="flex:1;">
        <h3 style="font-size:14.5px;">${item.name}</h3>
        <div class="progress-bar" style="margin-top:8px;"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="status-pills">
          <span class="pill ${pct===100?'done':''}">${pct}% complete</span>
          <span class="pill ${e.offerLetter?'done':''}">${e.offerLetter ? 'Offer letter ✓' : 'Offer letter pending'}</span>
          <span class="pill ${e.certificate?'done':''}">${e.certificate ? 'Certificate ✓' : 'Certificate pending'}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

document.addEventListener('click', (e) => {
  const row = e.target.closest('[data-open-learn]');
  if (row) openLearn(row.dataset.openLearn);
});

/* ---------- Learn viewer (payment-gated) ---------- */
function openLearn(courseId){
  const enrollment = getMyEnrollment(courseId);
  if (!enrollment) { alert('You need to enroll (and pay) before accessing this content.'); return; }
  const item = ALL_ITEMS.find(i => i.id === courseId);
  if (!item) return;
  currentItem = item;
  learnActiveWeekIdx = 0;
  document.getElementById('learnType').textContent = item.type;
  document.getElementById('learnTitle').textContent = item.name;
  renderLearnSidebar(item, enrollment);
  renderLearnWeek(item, enrollment, 0);
  showView('learn');
}

function completedSet(enrollment){
  return new Set((enrollment.progress && enrollment.progress.completed) || []);
}

function renderLearnSidebar(item, enrollment){
  const weeks = item.weeks || [];
  const totalLessons = weeks.reduce((n,w)=>n+w.lessons.length,0) || 1;
  const done = completedSet(enrollment).size;
  const pct = Math.round((done/totalLessons)*100);
  document.getElementById('learnProgressPct').textContent = pct + '%';
  document.getElementById('learnProgressBar').style.width = pct + '%';

  document.getElementById('learnWeekList').innerHTML = weeks.map((w, idx) => {
    const weekDone = w.lessons.every((_,li)=> completedSet(enrollment).has(idx+'-'+li));
    return `<div class="learn-week-item ${idx===learnActiveWeekIdx?'active':''}" data-week="${idx}">
      <span class="learn-check ${weekDone?'done':''}">${weekDone?'✓':''}</span> ${w.title.replace(/^Week \d+: /,'Week '+(idx+1)+': ')}
    </div>`;
  }).join('');

  $all('#learnWeekList .learn-week-item').forEach(el => {
    el.addEventListener('click', () => {
      learnActiveWeekIdx = parseInt(el.dataset.week, 10);
      renderLearnSidebar(item, enrollment);
      renderLearnWeek(item, enrollment, learnActiveWeekIdx);
    });
  });

  $all('.learn-milestone').forEach(el => {
    el.onclick = () => {
      if (el.dataset.milestone === 'offer') openOfferForm(item);
      if (el.dataset.milestone === 'certificate') openCertForm(item);
    };
  });
}

function renderLearnWeek(item, enrollment, weekIdx){
  const week = (item.weeks||[])[weekIdx];
  if (!week) return;
  document.getElementById('learnWeekTitle').textContent = week.title;
  document.getElementById('learnCurrentLesson').textContent = week.lessons[0] || 'Lesson';
  const done = completedSet(enrollment);
  document.getElementById('learnLessonList').innerHTML = week.lessons.map((lesson, li) => {
    const key = weekIdx + '-' + li;
    const isDone = done.has(key);
    return `<div class="lesson-item ${isDone?'done':''}">
      <span>${lesson}</span>
      <button class="lesson-mark-btn ${isDone?'done':''}" data-mark="${key}">${isDone ? '✓ Done' : 'Mark complete'}</button>
    </div>`;
  }).join('');

  $all('[data-mark]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.mark;
      try {
        await api('/api/progress', { method:'POST', body: JSON.stringify({ courseId: item.id, lessonKey: key }) });
        await loadMe();
        const freshEnrollment = getMyEnrollment(item.id);
        renderLearnSidebar(item, freshEnrollment);
        renderLearnWeek(item, freshEnrollment, weekIdx);
      } catch (err) { alert(err.message); }
    });
  });
}

/* ---------- Offer letter form (one-time, locked) ---------- */
function todayISO(){ const d = new Date(); return d.toISOString().slice(0,10); }

function openOfferForm(item){
  currentItem = item;
  const enrollment = getMyEnrollment(item.id);
  const area = document.getElementById('offerFormArea');
  if (enrollment && enrollment.offerLetter) {
    area.innerHTML = `<div class="locked-notice">
      <h3>Offer letter already generated</h3>
      <p style="margin-top:10px;">This can only be generated once and has already been sent to your email.</p>
      <div class="id-chip">${enrollment.offerLetter.id}</div>
      <br><button class="btn btn-primary" data-view="learn" id="backToLearnFromOffer">Back to course</button>
    </div>`;
    document.getElementById('backToLearnFromOffer').onclick = () => openLearn(item.id);
  } else {
    area.innerHTML = offerCertFormHTML('offer', item);
    wireFormSubmission('offer', item);
  }
  showView('offer');
}

function openCertForm(item){
  currentItem = item;
  const enrollment = getMyEnrollment(item.id);
  const area = document.getElementById('certFormArea');
  if (!enrollment || !enrollment.offerLetter) {
    area.innerHTML = `<div class="alert alert-info">You need to generate your offer letter first before claiming a completion certificate.</div>
      <button class="btn btn-primary" id="goOfferFirst">Generate offer letter</button>`;
    document.getElementById('goOfferFirst').onclick = () => openOfferForm(item);
  } else if (enrollment.certificate) {
    area.innerHTML = `<div class="locked-notice">
      <h3>Certificate already generated</h3>
      <p style="margin-top:10px;">This can only be generated once and has already been sent to your email.</p>
      <div class="id-chip">${enrollment.certificate.id}</div>
      <p style="margin-top:10px;">Verify it anytime on the <a data-view="verify" style="color:var(--teal);">Verify Certificate</a> page.</p>
    </div>`;
  } else {
    area.innerHTML = offerCertFormHTML('certificate', item);
    wireFormSubmission('certificate', item);
  }
  showView('certificate');
}

function offerCertFormHTML(kind, item){
  const prefillName = currentUser ? currentUser.name : '';
  const prefillEmail = currentUser ? currentUser.email : '';
  return `
  <div class="panel panel-wide" style="margin:0;">
    <div id="${kind}Alert"></div>
    <form id="${kind}Form">
      <div class="field"><label>Full name</label><input type="text" name="name" value="${prefillName}" required></div>
      <div class="field"><label>Email (letter/certificate will be sent here)</label><input type="email" name="email" value="${prefillEmail}" required></div>
      <div class="field-row">
        <div class="field"><label>Contact number</label><input type="tel" name="contact" required></div>
        <div class="field"><label>Register number</label><input type="text" name="regNo" required></div>
      </div>
      <div class="field"><label>College name</label><input type="text" name="college" required></div>
      <div class="field"><label>Internship / Course domain</label><input type="text" value="${item.name}" disabled></div>
      <div class="field-row">
        <div class="field"><label>Start date</label><input type="date" name="startDate" max="${todayISO()}" required></div>
        <div class="field"><label>End date</label><input type="date" name="endDate" max="${todayISO()}" required></div>
      </div>
      <small style="display:block; margin:-8px 0 16px; color:var(--muted);">Dates must not be in the future, and the gap between them must match this ${item.duration} program.</small>
      <div class="field">
        <label>Payment confirmation screenshot</label>
        <div class="file-drop" id="${kind}FileDrop">Click to upload an image (PNG/JPG)</div>
        <input type="file" name="paymentProof" id="${kind}FileInput" accept="image/*" style="display:none;">
      </div>
      <button class="btn btn-primary btn-block" type="submit" style="margin-top:8px;">Submit ${kind === 'offer' ? '& generate offer letter' : '& claim certificate'}</button>
    </form>
  </div>`;
}

function wireFormSubmission(kind, item){
  const fileDrop = document.getElementById(kind + 'FileDrop');
  const fileInput = document.getElementById(kind + 'FileInput');
  let paymentProofDataUrl = null;
  fileDrop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { alert('Please choose an image under 4MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      paymentProofDataUrl = reader.result;
      fileDrop.textContent = '✓ ' + file.name;
      fileDrop.classList.add('has-file');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById(kind + 'Form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById(kind + 'Alert');
    alertEl.innerHTML = '';
    const fd = new FormData(e.target);
    const payload = {
      courseId: item.id,
      name: fd.get('name'), email: fd.get('email'), contact: fd.get('contact'),
      college: fd.get('college'), regNo: fd.get('regNo'),
      startDate: fd.get('startDate'), endDate: fd.get('endDate'),
      paymentProof: paymentProofDataUrl,
    };
    const submitBtn = e.target.querySelector('button[type=submit]');
    submitBtn.disabled = true; submitBtn.textContent = 'Submitting...';
    try {
      const endpoint = kind === 'offer' ? '/api/offer-letter' : '/api/certificate';
      const result = await api(endpoint, { method:'POST', body: JSON.stringify(payload) });
      await loadMe();
      alertEl.innerHTML = `<div class="alert alert-ok">Success! ${kind === 'offer' ? 'Offer letter' : 'Certificate'} ID: ${result.offerId || result.certId}. Check your email.</div>`;
      setTimeout(() => { kind === 'offer' ? openOfferForm(item) : openCertForm(item); }, 1200);
    } catch (err) {
      alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
      submitBtn.disabled = false;
      submitBtn.textContent = kind === 'offer' ? 'Submit & generate offer letter' : 'Submit & claim certificate';
    }
  });
}

/* ---------- Verify certificate ---------- */
document.getElementById('verifyBtn').addEventListener('click', doVerify);
document.getElementById('verifyIdInput').addEventListener('keydown', (e) => { if (e.key==='Enter') doVerify(); });

async function doVerify(){
  const id = document.getElementById('verifyIdInput').value.trim();
  const area = document.getElementById('verifyResultArea');
  area.innerHTML = '';
  if (!id) return;
  try {
    const res = await fetch(`/api/verify/${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok || !data.valid) {
      area.innerHTML = `<div class="alert alert-error" style="margin-top:20px;">No certificate found with that ID. Double check and try again.</div>`;
      return;
    }
    area.innerHTML = `
    <div class="verify-result">
      <div class="verify-badge">✓ Certificate verified</div>
      <div class="verify-row"><span>Name</span><span>${data.name}</span></div>
      <div class="verify-row"><span>College</span><span>${data.college}</span></div>
      <div class="verify-row"><span>Register No.</span><span>${data.regNo}</span></div>
      <div class="verify-row"><span>Program</span><span>${data.courseName}</span></div>
      <div class="verify-row"><span>Duration</span><span>${data.startDate} to ${data.endDate}</span></div>
      <div class="verify-row"><span>Certificate ID</span><span>${data.certId}</span></div>
    </div>`;
  } catch (err) {
    area.innerHTML = `<div class="alert alert-error" style="margin-top:20px;">Something went wrong. Try again.</div>`;
  }
}

/* Auto-fill verify ID if arriving from a QR code link: /?verify=BF-CERT-... */
function checkVerifyDeepLink(){
  const params = new URLSearchParams(window.location.search);
  const vid = params.get('verify');
  if (vid) {
    document.getElementById('verifyIdInput').value = vid;
    showView('verify');
    doVerify();
  }
}

/* ---------- Init ---------- */
(async function init(){
  renderNavAuth();
  await loadCatalog();
  await loadMe();
  renderHomeGrids();
  checkVerifyDeepLink();
})();
