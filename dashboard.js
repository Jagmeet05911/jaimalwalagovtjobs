(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const clean = node => (node?.textContent || "").replace(/\\s+/g," ").trim();
  const safe = value => String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  function visibleJobs(){
    return [...document.querySelectorAll("#jobsDirectory .job-card,#jobsList .job-card")].filter(card=>!card.hidden && card.offsetParent!==null);
  }
  function linkFor(card){
    const link=[...card.querySelectorAll(".job-actions a")].find(a=>a.href && /^https?:$/.test(new URL(a.href).protocol));
    return link?.href || "#jobsView";
  }
  function update(){
    const cards=visibleJobs();
    const latest=$("portalLatestList"), closing=$("portalClosingList"), tiles=$("portalNewJobs");
    if(!latest||!closing||!tiles)return;
    const unique=[...new Map(cards.map(c=>[clean(c.querySelector("h3"))||clean(c),c])).values()];
    const top=unique.slice(0,5);
    latest.innerHTML=top.length?top.map(c=>'<a class="portal-mini-item" href="'+safe(linkFor(c))+'" target="_blank" rel="noopener noreferrer"><span class="portal-mini-dot">•</span><span>'+safe(clean(c.querySelector("h3"))||"Job update")+'</span></a>').join(""):'<p class="portal-loading">No published jobs are available yet.</p>';
    const withDeadline=unique.filter(c=>/last date|deadline|closing|apply till|before/i.test(clean(c)));
    const deadlineList=(withDeadline.length?withDeadline:unique).slice(0,4);
    closing.innerHTML=deadlineList.length?deadlineList.map(c=>'<a class="portal-mini-item" href="'+safe(linkFor(c))+'" target="_blank" rel="noopener noreferrer"><span class="portal-mini-dot">•</span><span>'+safe(clean(c.querySelector("h3"))||"Vacancy")+'</span>'+(withDeadline.length?'<span class="portal-deadline">CHECK DATE</span>':'')).join("")+'</a>':'<p class="portal-loading">No deadline-listed vacancies yet.</p>';
    tiles.innerHTML=top.length?top.slice(0,6).map(c=>'<a class="portal-job-tile" href="'+safe(linkFor(c))+'" target="_blank" rel="noopener noreferrer"><span>'+safe(clean(c.querySelector("h3"))||"New vacancy")+'</span><small>View official details ↗</small></a>').join(""):'<p class="portal-loading">Published jobs will appear here after loading.</p>';
  }
  function showView(id){
    const tab=document.querySelector('.tabs .tab[data-view="'+id+'"]');
    if(tab)tab.click();
    const target=$(id);
    if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function bind(){
    const form=$("portalSearchForm"), input=$("portalSearchInput");
    if(form&&!form.dataset.bound){form.dataset.bound="1";form.addEventListener("submit",e=>{
      e.preventDefault();showView("jobsView");
      const filter=document.querySelector("#jobFilterPanel [data-filter-search],#privateJobFilterPanel [data-filter-search]");
      if(filter){filter.value=input.value;filter.dispatchEvent(new Event("input",{bubbles:true}));}
      else {const native=document.querySelector("#jobsView input[type=search],#jobsView input");if(native){native.value=input.value;native.dispatchEvent(new Event("input",{bubbles:true}));}}
    });}
    document.querySelectorAll("[data-portal-view]").forEach(btn=>{if(btn.dataset.bound)return;btn.dataset.bound="1";btn.addEventListener("click",()=>{
      const view=btn.dataset.portalView;showView(view);
      const query=btn.dataset.portalQuery||"";
      if(query){const filter=document.querySelector("#jobFilterPanel [data-filter-search]");if(filter){filter.value=query;filter.dispatchEvent(new Event("input",{bubbles:true}));}}
    });});
  }
  function init(){bind();update();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
  new MutationObserver(()=>{bind();update();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
  document.addEventListener("click",e=>{if(e.target.closest(".tabs .tab"))setTimeout(()=>{const active=document.querySelector(".tabs .tab.active");const dash=$("portalDashboard");if(dash)dash.hidden=!!active&&active.dataset.view!=="jobsView";},0);});
})();
