(() => {
  'use strict';
  const STATE_RE = [
    ['Jammu and Kashmir',/jammu\s*(and|&)\s*kashmir|jkssb/i],['Himachal Pradesh',/himachal\s*pradesh|hppsc/i],['Uttar Pradesh',/uttar\s*pradesh|upsssc|uppsc/i],['Madhya Pradesh',/madhya\s*pradesh|mpesb/i],['West Bengal',/west\s*bengal|wbpsc/i],['Andhra Pradesh',/andhra\s*pradesh/i],['Arunachal Pradesh',/arunachal\s*pradesh/i],['Punjab',/\bpunjab\b|ppsc|sssc\/pb/i],['Haryana',/\bharyana\b|hssc|sssc\/hr/i],['Rajasthan',/\brajasthan\b|rssb/i],['Uttarakhand',/uttarakhand|uksssc/i],['Chandigarh',/\bchandigarh\b|rrb chandigarh/i],['Delhi',/\bdelhi\b|dsssb/i],['Maharashtra',/maharashtra/i],['Gujarat',/gujarat|gpsc/i],['Bihar',/\bbihar\b|bpsc/i],['Odisha',/odisha|opsc/i],['Jharkhand',/jharkhand/i],['Chhattisgarh',/chhattisgarh/i],['Telangana',/telangana/i],['Karnataka',/karnataka/i],['Tamil Nadu',/tamil\s*nadu/i],['Kerala',/kerala/i],['Goa',/\bgoa\b/i],['Assam',/assam/i],['Sikkim',/sikkim/i],['Nagaland',/nagaland/i],['Manipur',/manipur/i],['Mizoram',/mizoram/i],['Tripura',/tripura/i],['Meghalaya',/meghalaya/i]
  ];
  function inferred(title, dept, explicit) {
    const e = String(explicit || '').trim();
    if (e && e !== 'All India') return e;
    const text = `${title || ''} ${dept || ''}`;
    for (const [state, re] of STATE_RE) if (re.test(text)) return state;
    return e || 'All India';
  }
  function fixCards() {
    document.querySelectorAll('#jobsDirectory .job-card, #privateJobsList .job-card, #savedList .job-card, #admitList .job-card').forEach(card => {
      const meta = [...card.querySelectorAll('.job-meta span')];
      const loc = meta.find(x => /⌖/.test(x.textContent));
      if (!loc) return;
      const title = card.querySelector('h3')?.textContent || '';
      const dept = card.querySelector('.job-dept')?.textContent || '';
      const current = loc.textContent.replace('⌖','').trim();
      const corrected = inferred(title, dept, current);
      if (corrected && current !== corrected) loc.textContent = '⌖ ' + corrected;
    });
  }
  function hideEmptyDirectories() {
    document.querySelectorAll('#jobsDirectory .directory-section').forEach(section => {
      const cards = section.querySelectorAll('.job-card').length;
      section.style.display = cards ? '' : 'none';
    });
    document.querySelectorAll('#jobsDirectory .directory-group').forEach(group => {
      const visible = [...group.querySelectorAll('.directory-section')].some(s => s.style.display !== 'none');
      group.style.display = visible ? '' : 'none';
    });
  }
  function addResults() {
    if (document.getElementById('resultsView')) return;
    const nav = document.querySelector('nav.tabs');
    const main = document.querySelector('main');
    const admit = document.getElementById('admitView');
    if (!nav || !main || !admit) return;
    const btn = document.createElement('button');
    btn.className = 'tab'; btn.id = 'resultsTab'; btn.dataset.view = 'resultsView'; btn.textContent = '📊 Results';
    const admin = document.getElementById('adminTab');
    nav.insertBefore(btn, admin || null);
    const sec = document.createElement('section'); sec.id = 'resultsView'; sec.className = 'view hidden';
    sec.innerHTML = '<div class="section-head"><div><span class="eyebrow">RESULT UPDATES</span><h2>Results / Merit Lists</h2><p class="muted">Official result and merit-list links will appear here after they are added and verified in the Admin Panel.</p></div></div><div class="empty-state"><div class="empty-symbol">📊</div><h3>No result links available yet</h3><p>When an official result link is added to a recruitment record, it will be shown here.</p></div>';
    main.appendChild(sec);
    btn.addEventListener('click', () => showResults());
    const bottom = document.getElementById('bottomNav');
    if (bottom && !bottom.querySelector('[data-bottom-results]')) {
      const copy = btn.cloneNode(true); copy.removeAttribute('id'); copy.dataset.bottomResults = '1'; copy.addEventListener('click', () => showResults()); bottom.appendChild(copy);
    }
    function showResults() {
      document.querySelectorAll('.view').forEach(v => v.classList.toggle('hidden', v.id !== 'resultsView'));
      document.querySelectorAll('.tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.view === 'resultsView'));
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  function addQualificationFilter() {
    if (document.getElementById('qualificationFilter')) return;
    const toolbar = document.querySelector('#jobsView .jobs-toolbar');
    if (!toolbar) return;
    const wrap = document.createElement('label');
    wrap.className = 'qualification-filter';
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:8px;margin:10px 0 0;flex-wrap:wrap;font-weight:600;';
    wrap.innerHTML = '<span>🎓 Qualification</span><select id="qualificationFilter" aria-label="Filter jobs by qualification" style="padding:8px 10px;border:1px solid #d5dbe5;border-radius:8px;background:#fff"><option value="all">Any Qualification</option><option value="10th">10ਵੀਂ ਪਾਸ</option><option value="12th">12ਵੀਂ / +2</option><option value="iti">ITI</option><option value="diploma">Diploma</option><option value="graduation">Graduation</option><option value="postgraduation">Post Graduation</option></select>';
    toolbar.parentNode.insertBefore(wrap, toolbar.nextSibling);
    wrap.querySelector('select').addEventListener('change', applyQualificationFilter);
  }
  function applyQualificationFilter() {
    const value = document.getElementById('qualificationFilter')?.value || 'all';
    document.querySelectorAll('#jobsDirectory .job-card, #jobsList .job-card').forEach(card => {
      const text = (card.textContent || '').toLowerCase();
      let show = true;
      if (value === '10th') show = /10th|10वीं|10ਵੀਂ|matric/.test(text);
      else if (value === '12th') show = /12th|12वीं|12ਵੀਂ|\+2|senior secondary|10\+2/.test(text);
      else if (value === 'iti') show = /\biti\b|industrial training institute/.test(text);
      else if (value === 'diploma') show = /\bdiploma\b/.test(text);
      else if (value === 'graduation') show = /graduation|graduate|b\.a\b|b\.sc|b\.com|btech|b\.tech|bachelor/.test(text) && !/post.?graduation|postgraduate|master|m\.a\b|m\.sc|m\.com/.test(text);
      else if (value === 'postgraduation') show = /post.?graduation|postgraduate|master|m\.a\b|m\.sc|m\.com|mtech|m\.tech|mba|phd/.test(text);
      card.style.display = show ? '' : 'none';
    });
  }
  function normalizeBrokenText() {
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length === 0 && el.textContent.includes('&#x')) el.textContent = el.textContent.replace(/&#x20;/g,' ').replace(/&#x79;/g,'y').replace(/&#x65;/g,'e');
    });
  }
  function run() { addResults(); addQualificationFilter(); fixCards(); hideEmptyDirectories(); normalizeBrokenText(); }
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  setTimeout(run, 250); setTimeout(run, 1200); setTimeout(run, 3000);
})();
