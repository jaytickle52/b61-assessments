// Builds src/render/template.html from a saved copy of the approved New Hope report.
// Usage: node scripts/build-template.cjs <new-hope.html>
// Patches: data placeholder, locked items, unassessed items, AI-assisted label, scores from graded items only.
const fs=require('fs'); let h=fs.readFileSync(process.argv[2],'utf8');
const must=(a,b)=>{ if(!h.includes(a)) throw new Error('missing: '+a.slice(0,80)); h=h.replace(a,b); };
const s=h.indexOf('<script type="application/json" id="report-data">'), e=h.indexOf('</script>',s);
h=h.slice(0,s)+'<script type="application/json" id="report-data">__REPORT_DATA__'+h.slice(e);
must('<title>New Hope Website Report Card</title>','<title>__TITLE__</title>');
must('Learn the exact problems and opportunities with your website, and solve them to 2X your leads and revenue.','Discover problems and opportunities with your website. Solve them to increase mission-fit family leads.');
must('<p>Every item gets a letter grade. Category scores average those grades, and the overall score averages the six categories. Each square below is one graded item.</p>',
     '<p id="scores-note">Every item gets a letter grade. Category scores average those grades, and the overall score averages the categories. Each square below is one item.</p>');
must(`  D.categories.forEach(function(c){
    var s=c.items.reduce(function(a,it){return a+PTS[it.g]},0)/c.items.length;
    c.score=Math.round(s);
  });
  var overall=Math.round(D.categories.reduce(function(a,c){return a+c.score},0)/D.categories.length);`,
`  function graded(it){return it.g && !it.locked && !it.unassessed}
  D.categories.forEach(function(c){
    var gi=c.items.filter(graded);
    c.score=gi.length?Math.floor(gi.reduce(function(a,it){return a+PTS[it.g]},0)/gi.length+0.5):null;
  });
  var scored=D.categories.filter(function(c){return c.score!==null});
  var overall=Math.floor(scored.reduce(function(a,c){return a+c.score},0)/scored.length+0.5);
  var nLocked=D.categories.reduce(function(a,c){return a+c.items.filter(function(i){return i.locked}).length},0);
  var nAi=D.categories.reduce(function(a,c){return a+c.items.filter(function(i){return i.source==='ai'&&graded(i)}).length},0);
  if(D.tier==='free'){document.getElementById('scores-note').textContent='Every graded item gets a letter grade. Category scores average those grades, and the overall score averages the categories. '+nAi+' grades are AI-assisted. '+nLocked+' items need human judgment, so they are locked in this free report and not scored.'}
  function pctText(s){return s===null?'Locked':s+'%'}
  function pctColor(s){return s===null?'var(--muted)':scoreColor(s)}`);
must(`var IMPACT = {H:['High',3],M:['Medium',2],L:['Low',1]};`,`var IMPACT = {H:['High',3],M:['Medium',2],L:['Low',1]};
  var LOCK='<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><path fill="currentColor" d="M4 7V5a4 4 0 1 1 8 0v2h1v8H3V7h1zm2 0h4V5a2 2 0 1 0-4 0v2z"/></svg>';`);
must(`function mix(c){return c.items.map(function(it){return '<b style="background:'+gv(it.g)+'" title="'+esc(it.t)+': '+it.g+'">'+it.g+'</b>'}).join('')}`,
`function sq(it){if(it.locked)return '<b class="sq-lock" title="'+esc(it.t)+': locked, needs human judgment">'+LOCK+'</b>';if(it.unassessed||!it.g)return '<b style="background:var(--line);color:var(--muted)" title="'+esc(it.t)+': not graded">–</b>';return '<b style="background:'+gv(it.g)+'" title="'+esc(it.t)+': '+it.g+(it.source==='ai'?' (AI-assisted)':'')+'">'+it.g+'</b>'}
  function mix(c){return c.items.map(sq).join('')}`);
must(`<span class="track" aria-hidden="true"><i style="width:'+c.score+'%;background:'+scoreColor(c.score)+'"></i></span><span class="pct num">'+c.score+'%</span></a>'`,
`<span class="track" aria-hidden="true"><i style="width:'+(c.score||0)+'%;background:'+pctColor(c.score)+'"></i></span><span class="pct num" style="'+(c.score===null?'font-size:16px;color:var(--muted)':'')+'">'+pctText(c.score)+'</span></a>'`);
must(`[g]+'</span>'}).join('');`,`[g]+'</span>'}).join('')+(D.tier==='free'?'<span><b class="mini-badge sq-lock">'+LOCK+'</b> Needs human judgment</span><span><span class="ai-pill" style="margin-left:0">AI</span> AI-assisted grade</span>':'');`);
must(`'<a href="#'+c.id+'" style="border-left-color:'+scoreColor(c.score)+'"><span>'+esc(c.name)+'</span><b class="num">'+c.score+'%</b></a>'`,
`'<a href="#'+c.id+'" style="border-left-color:'+pctColor(c.score)+'"><span>'+esc(c.name)+'</span><b class="num">'+pctText(c.score)+'</b></a>'`);
must(`<div class="score num" style="color:'+scoreColor(c.score)+'">'+c.score+'%</div><div class="track" aria-hidden="true"><i style="width:'+c.score+'%;background:'+scoreColor(c.score)+'"></i></div>`,
`<div class="score num" style="color:'+pctColor(c.score)+(c.score===null?';font-size:32px':'')+'">'+pctText(c.score)+'</div><div class="track" aria-hidden="true"><i style="width:'+(c.score||0)+'%;background:'+pctColor(c.score)+'"></i></div>`);
must(`h+='<article class="item"><div class="badge" style="background:'+gv(it.g)+'" aria-label="Grade '+it.g+'">'+it.g+'</div><div style="min-width:0"><div class="item-head"><h3>'+esc(it.t)+'</h3>'+impact(it.i)+'</div>';`,
`if(it.locked){h+='<article class="item item-locked"><div class="badge sq-lock" aria-label="Locked: needs human judgment">'+LOCK.replace(/10/g,'22')+'</div><div style="min-width:0"><div class="item-head"><h3>'+esc(it.t)+'</h3>'+impact(it.i)+'</div>'+(it.why?'<p class="why">'+esc(it.why)+'</p>':'')+'<div class="lock-note"><span class="label">Requires human judgment</span><p>'+esc(it.found||'')+'</p></div></div></article>';return}
      var badge=(it.unassessed||!it.g)?'<div class="badge" style="background:var(--line);color:var(--muted)" aria-label="Not graded">–</div>':'<div class="badge" style="background:'+gv(it.g)+'" aria-label="Grade '+it.g+'">'+it.g+'</div>';
      h+='<article class="item">'+badge+'<div style="min-width:0"><div class="item-head"><h3>'+esc(it.t)+(it.source==='ai'&&!it.unassessed?' <span class="ai-pill" title="Scored by AI against the Banner 61 rubric, using only content from your site">AI-assisted</span>':'')+'</h3>'+impact(it.i)+'</div>';`);
must(`'<tr><td><span class="mini-badge" style="background:'+gv(it.g)+'">'+it.g+'</span></td>`,
`'<tr><td><span class="mini-badge" style="background:'+(it.g?gv(it.g):'var(--line)')+'">'+(it.g||'–')+'</span></td>`);
must(`'</tbody></table></div><div class="absent"><span class="pill" style="background:var(--bad)">Not found</span>'+esc(v.absent)+'</div>';`,
`'</tbody></table></div>'+(v.absent?'<div class="absent"><span class="pill" style="background:var(--bad)">Not found</span>'+esc(v.absent)+'</div>':'');`);
must(`return '<tr><td class="mono num">'+(i+1)+'</td>`,`return '<tr'+(r[2]==='School site'&&v.rank===i+1?' class="hl"':'')+'><td class="mono num">'+(i+1)+'</td>`);
must(`<style>.bad-text{`,`<style>.sq-lock{background:var(--slate)!important;color:var(--on-slate)!important;display:inline-flex;align-items:center;justify-content:center}
.ai-pill{display:inline-block;vertical-align:middle;margin-left:8px;font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:500;padding:2px 7px;border-radius:999px;border:1px solid var(--line);color:var(--muted);background:var(--surface)}
.item-locked h3{color:var(--muted)}
.lock-note{margin-top:14px;max-width:66ch;border:1px dashed var(--line);border-radius:8px;padding:12px 16px;display:grid;gap:4px;color:var(--muted)}
.bad-text{`);
must(`var cs=document.getElementById('cover-shot');cs.src=D.coverShot;cs.alt=D.school+' homepage as it appears today';`,
`var cs=document.getElementById('cover-shot');if(D.coverShot){cs.src=D.coverShot;cs.alt=D.school+' homepage as it appears today'}else{cs.closest('.browser').hidden=true}
  if(!D.displayUrl){document.getElementById('browser-url').closest('.browser').hidden=true}`);
fs.writeFileSync('src/render/template.html',h);
console.log('template written', h.length);
