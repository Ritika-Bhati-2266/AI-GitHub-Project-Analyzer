import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import './App.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const MODES = [
  { key: 'overview',      label: '🔍 Overview' },
  { key: 'readme',        label: '📄 README' },
  { key: 'structure',     label: '🏗️ Structure' },
  { key: 'improvements',  label: '💡 Improvements' },
  { key: 'tech',          label: '⚙️ Tech Stack' },
  { key: 'commits',       label: '📊 Commit Activity' },
  { key: 'compare',       label: '⚖️ Compare Repos' },
];

// ── GitHub helpers ────────────────────────────────────────────────────────────
function parseRepoUrl(url) {
  const m = url.trim().replace(/\/$/, '').match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

async function fetchGitHubData(owner, repo) {
  const h = { Accept: 'application/vnd.github.v3+json' };
  const [rRes, lRes, cRes, commitRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: h }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers: h }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=8`, { headers: h }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`, { headers: h }),
  ]);
  if (!rRes.ok) throw new Error('Repository not found or is private.');
  const rd = await rRes.json();
  const ld = lRes.ok ? await lRes.json() : {};
  const cd = cRes.ok ? await cRes.json() : [];
  const commitActivity = commitRes.ok ? await commitRes.json() : [];
  let readme = '';
  try {
    const rmRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers: h });
    if (rmRes.ok) {
      const rm = await rmRes.json();
      readme = atob(rm.content.replace(/\n/g, '')).substring(0, 4000);
    }
  } catch (e) {}
  return { rd, ld, cd, readme, commitActivity };
}

// ── Local analysis functions ──────────────────────────────────────────────────
function analyzeOverview(rd, ld, cd) {
  const langs = Object.keys(ld);
  const total = Object.values(ld).reduce((a, b) => a + b, 0);
  const breakdown = langs.slice(0, 5).map(l => `${l} (${total ? Math.round(ld[l]/total*100) : 0}%)`).join(', ');
  const age = Math.floor((Date.now() - new Date(rd.created_at)) / (1000*60*60*24*365));
  const s = rd.stargazers_count || 0;
  const maturity = s>10000?'Very mature / widely adopted':s>1000?'Established project':s>100?'Growing project':s>10?'Early-stage':'New / experimental';
  return `1. Summary\n   ${rd.full_name} — ${rd.description||'No description.'}\n   Created ${age} year(s) ago, last updated ${new Date(rd.updated_at).toDateString()}.\n\n2. Languages\n   ${breakdown||'No data'}\n\n3. License\n   ${rd.license?.name||'No license'}\n\n4. Top Contributors\n   ${cd.slice(0,5).map(c=>c.login).join(', ')||'Unknown'}\n\n5. Maturity\n   ${maturity} — ${s.toLocaleString()} ⭐, ${(rd.forks_count||0).toLocaleString()} forks`;
}

function analyzeReadme(readmeText) {
  if (!readmeText) return 'No README found.\n\nRecommendation: Add a README.md with description, installation steps, usage examples, and contribution guide.';
  const headings = readmeText.split('\n').filter(l=>l.startsWith('#')).slice(0,8).map(h=>h.replace(/^#+\s*/,''));
  const hasInstall = /install|setup|getting started/i.test(readmeText);
  const hasUsage   = /usage|example|how to use/i.test(readmeText);
  const hasContrib = /contribut|pull request/i.test(readmeText);
  const hasBadges  = /!\[.*?\]\(.*?\)/i.test(readmeText);
  const hasLicense = /license/i.test(readmeText);
  const score = [hasInstall,hasUsage,hasContrib,hasBadges,hasLicense,headings.length>3].filter(Boolean).length;
  const quality = score>=5?'Excellent':score>=3?'Good':score>=2?'Fair':'Poor';
  // Strip markdown for preview
  const preview = readmeText.substring(0,300).replace(/[#*`_>\[\]]/g,'').replace(/\n+/g,' ').trim();
  return `1. Sections Found\n   ${headings.join(', ')||'None detected'}\n\n2. Content Check\n   Installation:       ${hasInstall?'✅':'❌'}\n   Usage / Examples:   ${hasUsage?'✅':'❌'}\n   Contribution Guide: ${hasContrib?'✅':'❌'}\n   Badges / Shields:   ${hasBadges?'✅':'❌'}\n   License mention:    ${hasLicense?'✅':'❌'}\n\n3. Quality Rating: ${quality} (${score}/6 criteria met)\n\n4. Preview\n   ${preview}...`;
}

function analyzeStructure(rd, ld) {
  const langs = Object.keys(ld);
  const total = Object.values(ld).reduce((a,b)=>a+b,0);
  let arch='Unknown';
  if(langs.includes('Python')) arch=langs.includes('HTML')?'Full-stack (Python + Web)':'Python Application';
  if(langs.includes('JavaScript')||langs.includes('TypeScript')) arch='JavaScript / Node.js Application';
  if(langs.includes('HTML')||langs.includes('CSS')) arch='Web Frontend';
  if(langs.includes('Java')||langs.includes('Kotlin')) arch='JVM Application';
  if(langs.includes('Swift')) arch='iOS / macOS App';
  if(langs.includes('Dart')) arch='Flutter Application';
  if(langs.includes('Rust')) arch='Rust Systems';
  if(langs.includes('Go')) arch='Go / Microservice';
  const details = langs.slice(0,6).map(l=>`   • ${l}: ${total?Math.round(ld[l]/total*100):0}% (${(ld[l]/1024).toFixed(1)} KB)`).join('\n');
  return `1. Detected Architecture\n   ${arch}\n\n2. Language Breakdown\n${details||'   No data'}\n\n3. Repository Features\n   Wiki: ${rd.has_wiki?'✅':'❌'}  Projects: ${rd.has_projects?'✅':'❌'}  Discussions: ${rd.has_discussions?'✅':'❌'}  Pages: ${rd.has_pages?'✅':'❌'}\n\n4. Default Branch: ${rd.default_branch||'main'}`;
}

function analyzeImprovements(rd, readme) {
  const issues=[];
  if(!rd.description) issues.push('Add a repository description');
  if(!rd.license) issues.push('Add an open-source license (MIT, Apache 2.0…)');
  if(!readme) issues.push('Create a README.md');
  else {
    if(!/install/i.test(readme)) issues.push('README: Add installation instructions');
    if(!/usage|example/i.test(readme)) issues.push('README: Add usage examples');
    if(!/contribut/i.test(readme)) issues.push('README: Add contribution guidelines');
  }
  if(!rd.homepage) issues.push('Add a homepage / demo URL');
  if((rd.topics||[]).length===0) issues.push('Add topics/tags for discoverability');
  if(rd.open_issues_count>50) issues.push(`Triage open issues (${rd.open_issues_count} open)`);
  const score=issues.length===0?'🟢 Excellent':issues.length<=2?'🟡 Good':issues.length<=4?'🟠 Fair':'🔴 Needs Work';
  return `1. Top Issues\n${issues.slice(0,3).map((i,n)=>`   ${n+1}. ${i}`).join('\n')||'   No critical issues — great!'}\n\n2. More Suggestions\n${issues.slice(3).map(i=>`   • ${i}`).join('\n')||'   Repository looks well-maintained!'}\n\n3. Health: ${score} — ${issues.length} improvement(s) found\n\n4. Quick Wins\n   • Pin repo to your GitHub profile\n   • Add CHANGELOG.md\n   • Set up GitHub Actions CI/CD`;
}

function analyzeTech(rd, ld) {
  const langs=Object.keys(ld);
  const total=Object.values(ld).reduce((a,b)=>a+b,0);
  const map={JavaScript:'Dynamic web / Node.js',TypeScript:'Typed JS — scalable',Python:'Data science / web / scripting',Java:'Enterprise JVM',Kotlin:'Modern JVM / Android',Swift:'Apple ecosystem',Dart:'Flutter cross-platform',Rust:'Memory-safe systems',Go:'Fast microservices','C++':'High-performance systems',Ruby:'Web (Rails)',PHP:'Server-side web','C#':'.NET / Unity',HTML:'Web markup',CSS:'Styling',Shell:'DevOps scripting'};
  const details=langs.slice(0,6).map(l=>`   • ${l} (${total?Math.round(ld[l]/total*100):0}%) — ${map[l]||'General purpose'}`).join('\n');
  const topics=(rd.topics||[]).join(', ')||'None';
  return `1. Technologies\n${details||'   No data'}\n\n2. Topics / Tags\n   ${topics}\n\n3. Stack Summary\n   Primary: ${rd.language||'Unknown'} | Total: ${langs.length} language(s)\n   ${langs.length>5?'Multi-language (complex)':langs.length>2?'Mixed-language':'Focused single-language'}\n\n4. Infrastructure\n   GitHub Pages: ${rd.has_pages?'✅':'❌'}   Containerization: ${langs.includes('Dockerfile')||langs.includes('Shell')?'✅ Detected':'❌ Not detected'}`;
}

function localAnalyze(mode, rd, ld, cd, readme) {
  switch(mode) {
    case 'overview':     return analyzeOverview(rd,ld,cd);
    case 'readme':       return analyzeReadme(readme);
    case 'structure':    return analyzeStructure(rd,ld);
    case 'improvements': return analyzeImprovements(rd,readme);
    case 'tech':         return analyzeTech(rd,ld);
    default:             return '';
  }
}

function localAsk(q, rd, ld, cd, readme) {
  const ql=q.toLowerCase();
  if(/star|popular/.test(ql)) return `${(rd.stargazers_count||0).toLocaleString()} stars.`;
  if(/fork/.test(ql)) return `Forked ${(rd.forks_count||0).toLocaleString()} times.`;
  if(/language|tech|stack/.test(ql)) return `Languages: ${Object.keys(ld).join(', ')||'Unknown'}.`;
  if(/issue|bug/.test(ql)) return `${(rd.open_issues_count||0).toLocaleString()} open issues.`;
  if(/license/.test(ql)) return `License: ${rd.license?.name||'None'}.`;
  if(/description|about|what/.test(ql)) return `${rd.full_name}: ${rd.description||'No description.'}`;
  if(/contribut|author|who/.test(ql)) return `Top contributors: ${cd.slice(0,5).map(c=>c.login).join(', ')||'Unknown'}.`;
  if(/topic|tag/.test(ql)) return `Topics: ${(rd.topics||[]).join(', ')||'None set'}.`;
  if(/update|recent|last/.test(ql)) return `Last updated: ${new Date(rd.updated_at).toDateString()}.`;
  if(/creat|old|age|when/.test(ql)) return `Created: ${new Date(rd.created_at).toDateString()}.`;
  if(/home|website|url|link/.test(ql)) return `Homepage: ${rd.homepage||'None set'}.`;
  if(/readme/.test(ql)) return readme?`README found (${readme.length} chars). Preview: ${readme.substring(0,200).replace(/[#*`]/g,'')}...`:'No README found.';
  return `${rd.full_name}\n• Stars: ${rd.stargazers_count} | Forks: ${rd.forks_count}\n• Language: ${rd.language||'Unknown'}\n• Updated: ${new Date(rd.updated_at).toDateString()}\n• Description: ${rd.description||'N/A'}`;
}

// ── Compare helper ────────────────────────────────────────────────────────────
function compareRepos(r1, l1, r2, l2) {
  const winner = (a,b,higher=true) => {
    if(a===b) return ['–','–'];
    return higher ? (a>b?['🏆',''] : ['','🏆']) : (a<b?['🏆',''] : ['','🏆']);
  };
  const rows = [
    { label:'⭐ Stars',      v1:r1.stargazers_count||0, v2:r2.stargazers_count||0 },
    { label:'🍴 Forks',      v1:r1.forks_count||0,      v2:r2.forks_count||0 },
    { label:'🐛 Open Issues',v1:r1.open_issues_count||0,v2:r2.open_issues_count||0, lower:true },
    { label:'👁️ Watchers',   v1:r1.subscribers_count||0,v2:r2.subscribers_count||0 },
  ];
  return rows.map(row=>{
    const [w1,w2]=winner(row.v1,row.v2,!row.lower);
    return { label:row.label, v1:`${w1} ${row.v1.toLocaleString()}`, v2:`${w2} ${row.v2.toLocaleString()}` };
  });
}

// ── Commit chart data ─────────────────────────────────────────────────────────
function buildCommitChartData(activity) {
  if(!activity||!activity.length) return [];
  return activity.slice(-16).map((week,i)=>{
    const date=new Date(week.week*1000);
    return {
      week: `${date.toLocaleString('default',{month:'short'})} ${date.getDate()}`,
      commits: week.total||0,
    };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────
function MetricCard({icon,label,value}) {
  return (
    <div className="metric-card">
      <div className="metric-label">{icon} {label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function ResultCard({icon,title,badge,badgeClass,content,topics}) {
  return (
    <div className="result-card">
      <h3 className="result-title">
        <span>{icon}</span> {title}
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </h3>
      <pre className="result-content">{content}</pre>
      {topics&&topics.length>0&&(
        <div className="topics">
          {topics.map(t=><span key={t} className="topic-tag">{t}</span>)}
        </div>
      )}
    </div>
  );
}

function CommitChart({data, repoName}) {
  if(!data||data.length===0) return (
    <div className="result-card">
      <h3 className="result-title">📊 Commit Activity — {repoName}</h3>
      <p className="no-data">No commit activity data available (GitHub may still be computing stats — try again in a moment).</p>
    </div>
  );
  const maxCommits=Math.max(...data.map(d=>d.commits));
  const totalCommits=data.reduce((a,d)=>a+d.commits,0);
  const avgCommits=(totalCommits/data.length).toFixed(1);
  return (
    <div className="result-card">
      <h3 className="result-title">📊 Commit Activity (Last 16 Weeks) <span className="badge badge-info">Live</span></h3>
      <div className="commit-stats">
        <div className="cstat"><span className="cstat-val">{totalCommits}</span><span className="cstat-label">Total Commits</span></div>
        <div className="cstat"><span className="cstat-val">{avgCommits}</span><span className="cstat-label">Avg / Week</span></div>
        <div className="cstat"><span className="cstat-val">{maxCommits}</span><span className="cstat-label">Peak Week</span></div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{top:10,right:10,left:-20,bottom:40}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
          <XAxis dataKey="week" tick={{fontSize:11}} angle={-40} textAnchor="end" interval={1}/>
          <YAxis tick={{fontSize:11}}/>
          <Tooltip formatter={(v)=>[`${v} commits`,'Commits']}/>
          <Bar dataKey="commits" fill="url(#barGrad)" radius={[4,4,0,0]}/>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1"/>
              <stop offset="100%" stopColor="#8b5cf6"/>
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComparePanel() {
  const [url1,setUrl1]=useState('');
  const [url2,setUrl2]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [cmp,setCmp]=useState(null);

  const doCompare=async()=>{
    const p1=parseRepoUrl(url1), p2=parseRepoUrl(url2);
    if(!p1||!p2){setError('Please enter two valid GitHub repo URLs.');return;}
    setLoading(true);setError('');setCmp(null);
    try{
      const [d1,d2]=await Promise.all([fetchGitHubData(p1.owner,p1.repo),fetchGitHubData(p2.owner,p2.repo)]);
      const rows=compareRepos(d1.rd,d1.ld,d2.rd,d2.ld);
      const l1=Object.keys(d1.ld), l2=Object.keys(d2.ld);
      const total1=Object.values(d1.ld).reduce((a,b)=>a+b,0);
      const total2=Object.values(d2.ld).reduce((a,b)=>a+b,0);
      setCmp({r1:d1.rd,r2:d2.rd,l1,l2,total1,total2,ld1:d1.ld,ld2:d2.ld,rows,cd1:d1.cd,cd2:d2.cd,ca1:d1.commitActivity,ca2:d2.commitActivity});
    }catch(e){setError(e.message||'Failed to fetch one or both repos.');}
    finally{setLoading(false);}
  };

  return (
    <div className="compare-panel">
      <h3 className="compare-heading">⚖️ Compare Two Repositories</h3>
      <div className="compare-inputs">
        <input className="repo-input" placeholder="https://github.com/owner/repo-1" value={url1} onChange={e=>setUrl1(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doCompare()}/>
        <div className="vs-badge">VS</div>
        <input className="repo-input" placeholder="https://github.com/owner/repo-2" value={url2} onChange={e=>setUrl2(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doCompare()}/>
      </div>
      <button className="btn-primary" onClick={doCompare} disabled={loading} style={{width:'100%',marginTop:'10px'}}>
        {loading?'⏳ Comparing...':'⚖️ Compare Now'}
      </button>
      {error&&<div className="error-box" style={{marginTop:'12px'}}>{error}</div>}

      {cmp&&(
        <div className="compare-results">
          {/* Header */}
          <div className="cmp-header">
            <div className="cmp-repo-name">🔵 {cmp.r1.full_name}</div>
            <div className="cmp-repo-name">🟣 {cmp.r2.full_name}</div>
          </div>

          {/* Description */}
          <div className="cmp-desc-row">
            <div className="cmp-desc">{cmp.r1.description||'No description'}</div>
            <div className="cmp-desc">{cmp.r2.description||'No description'}</div>
          </div>

          {/* Metric rows */}
          {cmp.rows.map(row=>(
            <div className="cmp-row" key={row.label}>
              <div className="cmp-cell">{row.v1}</div>
              <div className="cmp-label">{row.label}</div>
              <div className="cmp-cell">{row.v2}</div>
            </div>
          ))}

          {/* Extra info rows */}
          <div className="cmp-row">
            <div className="cmp-cell" style={{fontSize:'12px'}}>{cmp.r1.license?.name||'No license'}</div>
            <div className="cmp-label">📜 License</div>
            <div className="cmp-cell" style={{fontSize:'12px'}}>{cmp.r2.license?.name||'No license'}</div>
          </div>
          <div className="cmp-row">
            <div className="cmp-cell" style={{fontSize:'12px'}}>{cmp.r1.language||'Unknown'}</div>
            <div className="cmp-label">💻 Primary Lang</div>
            <div className="cmp-cell" style={{fontSize:'12px'}}>{cmp.r2.language||'Unknown'}</div>
          </div>
          <div className="cmp-row">
            <div className="cmp-cell" style={{fontSize:'11px'}}>{new Date(cmp.r1.updated_at).toLocaleDateString()}</div>
            <div className="cmp-label">📅 Last Updated</div>
            <div className="cmp-cell" style={{fontSize:'11px'}}>{new Date(cmp.r2.updated_at).toLocaleDateString()}</div>
          </div>

          {/* Language bars */}
          <div className="cmp-lang-section">
            <div className="cmp-lang-col">
              <div className="cmp-lang-title">Language Mix</div>
              {cmp.l1.slice(0,5).map(l=>(
                <div key={l} className="lang-bar-row">
                  <span className="lang-name">{l}</span>
                  <div className="lang-bar-bg">
                    <div className="lang-bar-fill blue" style={{width:`${cmp.total1?Math.round(cmp.ld1[l]/cmp.total1*100):0}%`}}/>
                  </div>
                  <span className="lang-pct">{cmp.total1?Math.round(cmp.ld1[l]/cmp.total1*100):0}%</span>
                </div>
              ))}
            </div>
            <div className="cmp-lang-col">
              <div className="cmp-lang-title">Language Mix</div>
              {cmp.l2.slice(0,5).map(l=>(
                <div key={l} className="lang-bar-row">
                  <span className="lang-name">{l}</span>
                  <div className="lang-bar-bg">
                    <div className="lang-bar-fill purple" style={{width:`${cmp.total2?Math.round(cmp.ld2[l]/cmp.total2*100):0}%`}}/>
                  </div>
                  <span className="lang-pct">{cmp.total2?Math.round(cmp.ld2[l]/cmp.total2*100):0}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Commit charts side by side */}
          <div className="cmp-charts">
            <div className="cmp-chart-col">
              <div className="cmp-chart-title">📊 {cmp.r1.name} Commits</div>
              <CommitChart data={buildCommitChartData(cmp.ca1)} repoName={cmp.r1.name}/>
            </div>
            <div className="cmp-chart-col">
              <div className="cmp-chart-title">📊 {cmp.r2.name} Commits</div>
              <CommitChart data={buildCommitChartData(cmp.ca2)} repoName={cmp.r2.name}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [url,setUrl]=useState('');
  const [mode,setMode]=useState('overview');
  const [loading,setLoading]=useState(false);
  const [loadingText,setLoadingText]=useState('');
  const [error,setError]=useState('');
  const [repoData,setRepoData]=useState(null);
  const [langData,setLangData]=useState({});
  const [contribData,setContribData]=useState([]);
  const [readmeText,setReadmeText]=useState('');
  const [commitActivity,setCommitActivity]=useState([]);
  const [results,setResults]=useState([]);
  const [askInput,setAskInput]=useState('');

  const handleAnalyze=async()=>{
    if(!url.trim()){setError('Please enter a GitHub repository URL.');return;}
    const parsed=parseRepoUrl(url);
    if(!parsed){setError('Invalid GitHub URL. Format: https://github.com/owner/repo');return;}
    setLoading(true);setLoadingText('Fetching repository data...');setError('');
    setResults([]);setRepoData(null);
    try{
      const {rd,ld,cd,readme,commitActivity:ca}=await fetchGitHubData(parsed.owner,parsed.repo);
      setRepoData(rd);setLangData(ld);setContribData(cd);setReadmeText(readme);setCommitActivity(ca||[]);
      const text=localAnalyze(mode,rd,ld,cd,readme);
      setResults([{id:Date.now(),mode,content:text,question:null}]);
    }catch(e){setError(e.message||'Failed to fetch repository.');}
    finally{setLoading(false);}
  };

  const handleModeChange=newMode=>{
    setMode(newMode);
    if(repoData){
      if(newMode==='commits'||newMode==='compare') {
        setResults([{id:Date.now(),mode:newMode,content:'',question:null}]);
        return;
      }
      const text=localAnalyze(newMode,repoData,langData,contribData,readmeText);
      setResults(prev=>{
        const qs=prev.filter(r=>r.question!==null);
        return [{id:Date.now(),mode:newMode,content:text,question:null},...qs];
      });
    }
  };

  const handleAsk=()=>{
    if(!askInput.trim()||!repoData) return;
    const ans=localAsk(askInput,repoData,langData,contribData,readmeText);
    setResults(prev=>[...prev,{id:Date.now(),question:askInput,content:ans}]);
    setAskInput('');
  };

  const topLang=Object.keys(langData)[0]||'Unknown';
  const chartData=buildCommitChartData(commitActivity);
  const modeLabelMap=Object.fromEntries(MODES.map(m=>[m.key,m.label]));

  return (
    <div className="app">
      <div className="container">
        {/* Header */}
        <div className="header">
          <h1>🐙 AI GitHub Project Analyzer</h1>
          <p>Analyze any public GitHub repo — commits, structure, comparisons & more</p>
        </div>

        {/* URL Input */}
        <div className="input-row">
          <input
            type="text" className="repo-input"
            placeholder="https://github.com/owner/repository"
            value={url} onChange={e=>setUrl(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleAnalyze()}
          />
          <button className="btn-primary" onClick={handleAnalyze} disabled={loading}>
            {loading?'⏳ Loading...':'🔍 Analyze'}
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="mode-row">
          {MODES.map(m=>(
            <button key={m.key} className={`mode-btn ${mode===m.key?'active':''}`} onClick={()=>handleModeChange(m.key)}>
              {m.label}
            </button>
          ))}
        </div>

        {loading&&<div className="loading"><div className="spinner"/><span>{loadingText}</span></div>}
        {error&&<div className="error-box">{error}</div>}

        {/* Metrics */}
        {repoData&&(
          <div className="metrics-grid">
            <MetricCard icon="⭐" label="Stars"       value={(repoData.stargazers_count||0).toLocaleString()}/>
            <MetricCard icon="🍴" label="Forks"       value={(repoData.forks_count||0).toLocaleString()}/>
            <MetricCard icon="🐛" label="Open Issues" value={(repoData.open_issues_count||0).toLocaleString()}/>
            <MetricCard icon="💻" label="Top Lang"    value={topLang}/>
            <MetricCard icon="👁️" label="Watchers"    value={(repoData.subscribers_count||0).toLocaleString()}/>
            <MetricCard icon="📅" label="Updated"     value={new Date(repoData.updated_at).toLocaleDateString()}/>
          </div>
        )}

        {/* Compare Panel */}
        {mode==='compare'&&<ComparePanel/>}

        {/* Commit Chart */}
        {mode==='commits'&&repoData&&<CommitChart data={chartData} repoName={repoData.name}/>}

        {/* Analysis Results */}
        {mode!=='compare'&&mode!=='commits'&&(
          <div className="results-area">
            {results.map(r=>
              r.question===null?(
                <ResultCard
                  key={r.id} icon="✨"
                  title={modeLabelMap[r.mode]||'Analysis'}
                  badge="No API Key" badgeClass="badge-local"
                  content={r.content}
                  topics={r.mode==='overview'?(repoData?.topics||[]):[]}
                />
              ):(
                <ResultCard
                  key={r.id} icon="💬"
                  title={`Q: ${r.question}`}
                  badge="Answer" badgeClass="badge-success"
                  content={r.content}
                />
              )
            )}
          </div>
        )}

        {/* Q&A */}
        {repoData&&mode!=='compare'&&(
          <div className="ask-row">
            <input
              type="text" className="ask-input"
              placeholder="Ask anything about this repo..."
              value={askInput} onChange={e=>setAskInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleAsk()}
            />
            <button className="btn-success" onClick={handleAsk}>💬 Ask</button>
          </div>
        )}
      </div>
    </div>
  );
}
