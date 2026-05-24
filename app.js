// ── State ────────────────────────────────────────────────────────────────────
let currentMode = 'overview';
let repoContext = '';
let repoData = {};
let langData = {};
let contribData = [];
let readmeText = '';

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseRepoUrl(url) {
  url = url.trim().replace(/\/$/, '');
  const m = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showLoading(msg) {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('loadingText').textContent = msg;
  document.getElementById('errorBox').classList.add('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

function showError(msg) {
  hideLoading();
  const el = document.getElementById('errorBox');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ── Mode Toggle ───────────────────────────────────────────────────────────────
function setMode(btn) {
  document.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentMode = btn.dataset.mode;
  if (repoContext) renderAnalysis();
}

// ── GitHub Fetch ──────────────────────────────────────────────────────────────
async function fetchGitHubData(owner, repo) {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };

  const [rRes, lRes, cRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=5`, { headers })
  ]);

  if (!rRes.ok) throw new Error('Repository not found or is private.');

  const rd = await rRes.json();
  const ld = lRes.ok ? await lRes.json() : {};
  const cd = cRes.ok ? await cRes.json() : [];

  let readme = '';
  try {
    const rmRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
    if (rmRes.ok) {
      const rm = await rmRes.json();
      readme = atob(rm.content.replace(/\n/g,'')).substring(0, 4000);
    }
  } catch(e) {}

  return { rd, ld, cd, readme };
}

// ── Metrics UI ────────────────────────────────────────────────────────────────
function renderMetrics() {
  const grid = document.getElementById('metricsGrid');
  const topLang = Object.keys(langData)[0] || 'Unknown';
  const updated = new Date(repoData.updated_at).toLocaleDateString();
  grid.innerHTML = `
    <div class="metric"><div class="label"><i class="ti ti-star"></i> Stars</div><div class="value">${(repoData.stargazers_count||0).toLocaleString()}</div></div>
    <div class="metric"><div class="label"><i class="ti ti-git-fork"></i> Forks</div><div class="value">${(repoData.forks_count||0).toLocaleString()}</div></div>
    <div class="metric"><div class="label"><i class="ti ti-bug"></i> Open Issues</div><div class="value">${(repoData.open_issues_count||0).toLocaleString()}</div></div>
    <div class="metric"><div class="label"><i class="ti ti-code"></i> Top Language</div><div class="value" style="font-size:15px;">${topLang}</div></div>
    <div class="metric"><div class="label"><i class="ti ti-users"></i> Watchers</div><div class="value">${(repoData.subscribers_count||0).toLocaleString()}</div></div>
    <div class="metric"><div class="label"><i class="ti ti-calendar"></i> Updated</div><div class="value" style="font-size:13px;">${updated}</div></div>
  `;
  grid.classList.remove('hidden');
}

// ── Local AI Analysis (no API key needed) ─────────────────────────────────────
function analyzeOverview() {
  const langs = Object.keys(langData);
  const totalBytes = Object.values(langData).reduce((a,b)=>a+b,0);
  const langBreakdown = langs.slice(0,5).map(l => {
    const pct = totalBytes ? Math.round(langData[l]/totalBytes*100) : 0;
    return `${l} (${pct}%)`;
  }).join(', ');

  const created = new Date(repoData.created_at).toDateString();
  const updated = new Date(repoData.updated_at).toDateString();
  const age = Math.floor((Date.now() - new Date(repoData.created_at))/(1000*60*60*24*365));
  const topics = (repoData.topics||[]).join(', ') || 'None';
  const license = repoData.license?.name || 'No license specified';
  const contribs = contribData.slice(0,5).map(c=>c.login).join(', ') || 'Unknown';

  const stars = repoData.stargazers_count || 0;
  let maturity = stars > 10000 ? 'Very mature / widely adopted' :
                 stars > 1000  ? 'Established project' :
                 stars > 100   ? 'Growing project' :
                 stars > 10    ? 'Early-stage project' : 'New / experimental project';

  return `1. Project Summary
   ${repoData.full_name} — ${repoData.description || 'No description provided.'}
   Created ${age} year(s) ago (${created}), last updated ${updated}.

2. Purpose & Use Case
   ${repoData.description || 'Not specified in repository metadata.'}
   Homepage: ${repoData.homepage || 'None listed'}
   Topics: ${topics}

3. Language Breakdown
   ${langBreakdown || 'No language data available'}

4. License
   ${license}

5. Top Contributors
   ${contribs}

6. Maturity Assessment
   ${maturity} — ${stars.toLocaleString()} stars, ${(repoData.forks_count||0).toLocaleString()} forks`;
}

function analyzeReadme() {
  if (!readmeText) {
    return `No README found in this repository.\n\nRecommendation: Add a README.md with project description, installation steps, usage examples, and contribution guidelines.`;
  }

  const lines = readmeText.split('\n').filter(l => l.trim());
  const headings = lines.filter(l => l.startsWith('#')).slice(0, 10);
  const hasInstall = /install|setup|getting started/i.test(readmeText);
  const hasUsage = /usage|example|how to use/i.test(readmeText);
  const hasContrib = /contribut|pull request|pr/i.test(readmeText);
  const hasBadges = /!\[.*?\]\(.*?\)/i.test(readmeText);
  const hasLicense = /license/i.test(readmeText);

  let score = 0;
  if (hasInstall) score++;
  if (hasUsage) score++;
  if (hasContrib) score++;
  if (hasBadges) score++;
  if (hasLicense) score++;
  if (headings.length > 3) score++;

  const quality = score >= 5 ? 'Excellent' : score >= 3 ? 'Good' : score >= 2 ? 'Fair' : 'Poor';

  return `1. README Structure
   Sections found: ${headings.map(h=>h.replace(/^#+\s*/,'')).join(', ') || 'None detected'}

2. Content Check
   ✅ Installation section: ${hasInstall ? 'Yes' : 'Not found'}
   ✅ Usage / Examples: ${hasUsage ? 'Yes' : 'Not found'}
   ✅ Contribution guide: ${hasContrib ? 'Yes' : 'Not found'}
   ✅ Badges/shields: ${hasBadges ? 'Yes' : 'Not found'}
   ✅ License mentioned: ${hasLicense ? 'Yes' : 'Not found'}

3. Documentation Quality: ${quality} (${score}/6 criteria met)

4. README Preview (first 300 chars)
   ${readmeText.substring(0,300).replace(/\n/g,' ')}...`;
}

function analyzeStructure() {
  const langs = Object.keys(langData);
  const totalBytes = Object.values(langData).reduce((a,b)=>a+b,0);

  let arch = 'Unknown';
  if (langs.includes('HTML') || langs.includes('CSS')) arch = 'Web Frontend';
  if (langs.includes('Python')) arch = langs.includes('HTML') ? 'Full-stack (Python + Web)' : 'Python Application / Script';
  if (langs.includes('JavaScript') || langs.includes('TypeScript')) {
    arch = langs.includes('Python') ? 'Full-stack' : 'JavaScript/Node.js Application';
  }
  if (langs.includes('Java') || langs.includes('Kotlin')) arch = 'JVM Application';
  if (langs.includes('Swift') || langs.includes('Objective-C')) arch = 'iOS / macOS App';
  if (langs.includes('Dart')) arch = 'Flutter / Dart Application';
  if (langs.includes('C++') || langs.includes('C')) arch = 'Systems / Native Application';
  if (langs.includes('Rust')) arch = 'Rust Systems Application';
  if (langs.includes('Go')) arch = 'Go Application / Microservice';

  const langDetails = langs.map(l => {
    const pct = totalBytes ? Math.round(langData[l]/totalBytes*100) : 0;
    return `   • ${l}: ${pct}% (${(langData[l]/1024).toFixed(1)} KB)`;
  }).join('\n');

  return `1. Detected Architecture
   ${arch}

2. Language Distribution
${langDetails || '   No language data available'}

3. Repository Size Indicators
   Open issues: ${repoData.open_issues_count || 0}
   Forks (community interest): ${repoData.forks_count || 0}
   Default branch: ${repoData.default_branch || 'main'}

4. Code Organization Notes
   ${repoData.has_wiki ? '✅ Wiki enabled' : '❌ No wiki'}
   ${repoData.has_projects ? '✅ Projects enabled' : '❌ No GitHub Projects'}
   ${repoData.has_discussions ? '✅ Discussions enabled' : '❌ No Discussions'}
   ${repoData.has_pages ? '✅ GitHub Pages enabled' : '❌ No GitHub Pages'}`;
}

function analyzeImprovements() {
  const issues = [];

  if (!repoData.description) issues.push('Add a repository description (missing)');
  if (!repoData.license) issues.push('Add an open-source license (e.g. MIT, Apache 2.0)');
  if (!readmeText) issues.push('Create a README.md with project details');
  else {
    if (!/install/i.test(readmeText)) issues.push('README missing: Installation instructions');
    if (!/usage|example/i.test(readmeText)) issues.push('README missing: Usage examples');
    if (!/contribut/i.test(readmeText)) issues.push('README missing: Contribution guidelines');
  }
  if (!repoData.homepage) issues.push('Add a homepage URL (demo/docs link)');
  if ((repoData.topics||[]).length === 0) issues.push('Add topics/tags to improve discoverability');
  if (!repoData.has_wiki) issues.push('Consider enabling GitHub Wiki for documentation');
  if (!repoData.has_discussions) issues.push('Enable GitHub Discussions for community Q&A');
  if (repoData.open_issues_count > 50) issues.push(`High open issue count (${repoData.open_issues_count}) — triage and close stale issues`);

  const top3 = issues.slice(0,3);
  const rest = issues.slice(3);

  return `1. Top Improvements Needed
${top3.length ? top3.map((i,n)=>`   ${n+1}. ${i}`).join('\n') : '   No critical issues found — great job!'}

2. Additional Suggestions
${rest.length ? rest.map(i=>`   • ${i}`).join('\n') : '   Repository looks well-maintained!'}

3. Community Health Score
   ${issues.length === 0 ? '🟢 Excellent' : issues.length <= 2 ? '🟡 Good' : issues.length <= 4 ? '🟠 Fair' : '🔴 Needs Work'} — ${issues.length} improvement(s) identified

4. Quick Wins
   • Pin this repo to your GitHub profile for visibility
   • Add a CHANGELOG.md to track version history
   • Set up GitHub Actions for CI/CD automation`;
}

function analyzeTech() {
  const langs = Object.keys(langData);
  const totalBytes = Object.values(langData).reduce((a,b)=>a+b,0);

  const techMap = {
    'JavaScript': 'Dynamic web / Node.js ecosystem',
    'TypeScript': 'Typed JavaScript — modern, scalable',
    'Python': 'Versatile: data science, web, scripting',
    'Java': 'Enterprise-grade, JVM ecosystem',
    'Kotlin': 'Modern JVM / Android development',
    'Swift': 'Apple ecosystem (iOS/macOS)',
    'Dart': 'Cross-platform Flutter apps',
    'Rust': 'Memory-safe systems programming',
    'Go': 'Fast, concurrent microservices',
    'C++': 'High-performance systems/games',
    'C': 'Low-level systems programming',
    'Ruby': 'Web (Rails), scripting',
    'PHP': 'Server-side web development',
    'C#': '.NET / Unity ecosystem',
    'HTML': 'Web markup',
    'CSS': 'Web styling',
    'Shell': 'Automation / DevOps scripting',
    'Dockerfile': 'Containerization'
  };

  const techDetails = langs.slice(0,6).map(l => {
    const pct = totalBytes ? Math.round(langData[l]/totalBytes*100) : 0;
    const desc = techMap[l] || 'General purpose';
    return `   • ${l} (${pct}%) — ${desc}`;
  }).join('\n');

  const topics = (repoData.topics||[]);
  const topicStr = topics.length ? topics.join(', ') : 'None listed';

  return `1. Primary Technologies
${techDetails || '   No language data available'}

2. Repository Topics / Tags
   ${topicStr}

3. Tech Stack Assessment
   Primary language: ${repoData.language || 'Unknown'}
   Total languages detected: ${langs.length}
   ${langs.length > 5 ? 'Multi-language project — potentially complex stack' : langs.length > 2 ? 'Mixed-language project' : 'Focused, single-language project'}

4. Infrastructure Indicators
   ${repoData.has_pages ? '✅ GitHub Pages (static hosting)' : ''}
   ${langs.includes('Dockerfile') || langs.includes('Shell') ? '✅ DevOps / containerization present' : '❌ No containerization detected'}
   ${langs.includes('TypeScript') ? '✅ TypeScript — good for maintainability' : ''}
   Default branch: ${repoData.default_branch || 'main'}`;
}

// ── Render Analysis ───────────────────────────────────────────────────────────
function renderAnalysis() {
  const modeLabels = {
    overview: 'Project Overview', readme: 'README Analysis',
    structure: 'Code Structure', improvements: 'Suggested Improvements', tech: 'Tech Stack Analysis'
  };

  const analyzers = {
    overview: analyzeOverview,
    readme: analyzeReadme,
    structure: analyzeStructure,
    improvements: analyzeImprovements,
    tech: analyzeTech
  };

  const text = analyzers[currentMode]();
  const topics = repoData.topics || [];
  const topicsHtml = topics.length
    ? `<div class="topics">${topics.map(t=>`<span class="topic-tag">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  document.getElementById('resultsArea').innerHTML = `
    <div class="result-card">
      <h3>
        <i class="ti ti-sparkles" style="color:#2563eb"></i>
        ${modeLabels[currentMode]}
        <span class="badge badge-local">No API Key</span>
      </h3>
      <div class="content">${escapeHtml(text)}</div>
      ${currentMode === 'overview' ? topicsHtml : ''}
    </div>
  `;
}

// ── Main Analyze ──────────────────────────────────────────────────────────────
async function analyzeRepo() {
  const url = document.getElementById('repoUrl').value;
  if (!url.trim()) { showError('Please enter a GitHub repository URL.'); return; }
  const parsed = parseRepoUrl(url);
  if (!parsed) { showError('Invalid GitHub URL. Use format: https://github.com/owner/repo'); return; }

  showLoading('Fetching repository data from GitHub...');
  document.getElementById('resultsArea').innerHTML = '';
  document.getElementById('metricsGrid').classList.add('hidden');
  document.getElementById('askSection').classList.add('hidden');
  document.getElementById('errorBox').classList.add('hidden');

  try {
    const result = await fetchGitHubData(parsed.owner, parsed.repo);
    repoData = result.rd;
    langData = result.ld;
    contribData = result.cd;
    readmeText = result.readme;

    repoContext = `${repoData.full_name}: ${repoData.description || ''}. Languages: ${Object.keys(langData).join(', ')}. Stars: ${repoData.stargazers_count}. Forks: ${repoData.forks_count}. Topics: ${(repoData.topics||[]).join(', ')}.`;

    renderMetrics();
    hideLoading();
    renderAnalysis();
    document.getElementById('askSection').classList.remove('hidden');
  } catch(e) {
    showError(e.message || 'Failed to fetch repository. Make sure it is public.');
  }
}

// ── Q&A (local, keyword-based) ────────────────────────────────────────────────
function askQuestion() {
  const q = document.getElementById('askInput').value.trim();
  if (!q || !repoData.full_name) return;
  document.getElementById('askInput').value = '';

  const ql = q.toLowerCase();
  let answer = '';

  if (/star|popular/.test(ql)) {
    answer = `This repository has ${(repoData.stargazers_count||0).toLocaleString()} stars.`;
  } else if (/fork/.test(ql)) {
    answer = `This repository has been forked ${(repoData.forks_count||0).toLocaleString()} times.`;
  } else if (/language|tech|stack/.test(ql)) {
    answer = `Languages used: ${Object.keys(langData).join(', ') || 'Unknown'}.`;
  } else if (/issue|bug/.test(ql)) {
    answer = `There are ${(repoData.open_issues_count||0).toLocaleString()} open issues.`;
  } else if (/license/.test(ql)) {
    answer = `License: ${repoData.license?.name || 'No license specified'}.`;
  } else if (/description|about|what/.test(ql)) {
    answer = `${repoData.full_name}: ${repoData.description || 'No description available.'}`;
  } else if (/contribut|author|who/.test(ql)) {
    answer = `Top contributors: ${contribData.slice(0,5).map(c=>c.login).join(', ') || 'Unknown'}.`;
  } else if (/topic|tag/.test(ql)) {
    answer = `Topics: ${(repoData.topics||[]).join(', ') || 'No topics set'}.`;
  } else if (/update|recent|last/.test(ql)) {
    answer = `Last updated: ${new Date(repoData.updated_at).toDateString()}.`;
  } else if (/creat|old|age|when/.test(ql)) {
    answer = `Repository created on: ${new Date(repoData.created_at).toDateString()}.`;
  } else if (/home|website|url|link/.test(ql)) {
    answer = `Homepage: ${repoData.homepage || 'No homepage set'}.`;
  } else if (/watcher|subscriber/.test(ql)) {
    answer = `Watchers/subscribers: ${(repoData.subscribers_count||0).toLocaleString()}.`;
  } else if (/readme/.test(ql)) {
    answer = readmeText ? `README found (${readmeText.length} chars). First 200 chars: ${readmeText.substring(0,200)}...` : 'No README found in this repository.';
  } else {
    answer = `I found the following info about ${repoData.full_name}:\n• Description: ${repoData.description || 'N/A'}\n• Stars: ${repoData.stargazers_count}\n• Language: ${repoData.language || 'Unknown'}\n• Updated: ${new Date(repoData.updated_at).toDateString()}\n\nFor deeper AI answers, use the version with an Anthropic API key.`;
  }

  document.getElementById('resultsArea').innerHTML += `
    <div class="result-card">
      <h3>
        <i class="ti ti-message-circle" style="color:#059669"></i>
        Q: ${escapeHtml(q)}
        <span class="badge badge-success">Answer</span>
      </h3>
      <div class="content">${escapeHtml(answer)}</div>
    </div>
  `;
}
