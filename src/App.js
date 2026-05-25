import React, { useState } from 'react';
import './App.css';

const MODES = [
  { key: 'overview', label: '🔍 Overview' },
  { key: 'readme', label: '📄 README' },
  { key: 'structure', label: '🏗️ Code Structure' },
  { key: 'improvements', label: '💡 Improvements' },
  { key: 'tech', label: '⚙️ Tech Stack' },
];

function parseRepoUrl(url) {
  const m = url.trim().replace(/\/$/, '').match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

async function fetchGitHubData(owner, repo) {
  const headers = { Accept: 'application/vnd.github.v3+json' };
  const [rRes, lRes, cRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=5`, { headers }),
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
      readme = atob(rm.content.replace(/\n/g, '')).substring(0, 4000);
    }
  } catch (e) {}
  return { rd, ld, cd, readme };
}

function analyzeOverview(repoData, langData, contribData) {
  const langs = Object.keys(langData);
  const totalBytes = Object.values(langData).reduce((a, b) => a + b, 0);
  const langBreakdown = langs.slice(0, 5).map(l => `${l} (${totalBytes ? Math.round(langData[l] / totalBytes * 100) : 0}%)`).join(', ');
  const age = Math.floor((Date.now() - new Date(repoData.created_at)) / (1000 * 60 * 60 * 24 * 365));
  const stars = repoData.stargazers_count || 0;
  const maturity = stars > 10000 ? 'Very mature / widely adopted' : stars > 1000 ? 'Established project' : stars > 100 ? 'Growing project' : stars > 10 ? 'Early-stage' : 'New / experimental';
  return `1. Project Summary\n   ${repoData.full_name} — ${repoData.description || 'No description provided.'}\n   Created ${age} year(s) ago, last updated ${new Date(repoData.updated_at).toDateString()}.\n\n2. Languages\n   ${langBreakdown || 'No data'}\n\n3. License\n   ${repoData.license?.name || 'No license'}\n\n4. Top Contributors\n   ${contribData.slice(0, 5).map(c => c.login).join(', ') || 'Unknown'}\n\n5. Maturity\n   ${maturity} — ${stars.toLocaleString()} stars, ${(repoData.forks_count || 0).toLocaleString()} forks`;
}

function analyzeReadme(readmeText) {
  if (!readmeText) return 'No README found.\n\nRecommendation: Add a README.md with project description, installation steps, usage, and contribution guidelines.';
  const lines = readmeText.split('\n');
  const headings = lines.filter(l => l.startsWith('#')).slice(0, 8).map(h => h.replace(/^#+\s*/, ''));
  const hasInstall = /install|setup|getting started/i.test(readmeText);
  const hasUsage = /usage|example|how to use/i.test(readmeText);
  const hasContrib = /contribut|pull request/i.test(readmeText);
  const hasBadges = /!\[.*?\]\(.*?\)/i.test(readmeText);
  const hasLicense = /license/i.test(readmeText);
  let score = [hasInstall, hasUsage, hasContrib, hasBadges, hasLicense, headings.length > 3].filter(Boolean).length;
  const quality = score >= 5 ? 'Excellent' : score >= 3 ? 'Good' : score >= 2 ? 'Fair' : 'Poor';
  return `1. Sections Found\n   ${headings.join(', ') || 'None detected'}\n\n2. Content Check\n   Installation: ${hasInstall ? '✅' : '❌'}\n   Usage/Examples: ${hasUsage ? '✅' : '❌'}\n   Contribution Guide: ${hasContrib ? '✅' : '❌'}\n   Badges: ${hasBadges ? '✅' : '❌'}\n   License mention: ${hasLicense ? '✅' : '❌'}\n\n3. Quality Rating: ${quality} (${score}/6)\n\n4. Preview\n   ${readmeText.substring(0, 300).replace(/\n/g, ' ')}...`;
}

function analyzeStructure(repoData, langData) {
  const langs = Object.keys(langData);
  const totalBytes = Object.values(langData).reduce((a, b) => a + b, 0);
  let arch = 'Unknown';
  if (langs.includes('Python')) arch = langs.includes('HTML') ? 'Full-stack (Python + Web)' : 'Python Application';
  if (langs.includes('JavaScript') || langs.includes('TypeScript')) arch = 'JavaScript / Node.js Application';
  if (langs.includes('HTML') || langs.includes('CSS')) arch = 'Web Frontend';
  if (langs.includes('Java') || langs.includes('Kotlin')) arch = 'JVM Application';
  if (langs.includes('Swift')) arch = 'iOS / macOS App';
  if (langs.includes('Dart')) arch = 'Flutter / Dart Application';
  if (langs.includes('Rust')) arch = 'Rust Systems Application';
  if (langs.includes('Go')) arch = 'Go / Microservice';
  const langDetails = langs.slice(0, 6).map(l => `   • ${l}: ${totalBytes ? Math.round(langData[l] / totalBytes * 100) : 0}% (${(langData[l] / 1024).toFixed(1)} KB)`).join('\n');
  return `1. Detected Architecture\n   ${arch}\n\n2. Language Breakdown\n${langDetails || '   No data'}\n\n3. Repository Features\n   Wiki: ${repoData.has_wiki ? '✅' : '❌'}  Projects: ${repoData.has_projects ? '✅' : '❌'}  Discussions: ${repoData.has_discussions ? '✅' : '❌'}  Pages: ${repoData.has_pages ? '✅' : '❌'}\n\n4. Default Branch: ${repoData.default_branch || 'main'}`;
}

function analyzeImprovements(repoData, readmeText) {
  const issues = [];
  if (!repoData.description) issues.push('Add a repository description');
  if (!repoData.license) issues.push('Add an open-source license (MIT, Apache 2.0, etc.)');
  if (!readmeText) issues.push('Create a README.md');
  else {
    if (!/install/i.test(readmeText)) issues.push('README: Add installation instructions');
    if (!/usage|example/i.test(readmeText)) issues.push('README: Add usage examples');
    if (!/contribut/i.test(readmeText)) issues.push('README: Add contribution guidelines');
  }
  if (!repoData.homepage) issues.push('Add a homepage / demo URL');
  if ((repoData.topics || []).length === 0) issues.push('Add topics/tags for discoverability');
  if (repoData.open_issues_count > 50) issues.push(`Triage open issues (${repoData.open_issues_count} open)`);
  const score = issues.length === 0 ? '🟢 Excellent' : issues.length <= 2 ? '🟡 Good' : issues.length <= 4 ? '🟠 Fair' : '🔴 Needs Work';
  return `1. Top Issues\n${issues.slice(0, 3).map((i, n) => `   ${n + 1}. ${i}`).join('\n') || '   No critical issues — great job!'}\n\n2. Additional Suggestions\n${issues.slice(3).map(i => `   • ${i}`).join('\n') || '   Repository looks well-maintained!'}\n\n3. Health Score: ${score}\n   ${issues.length} improvement(s) identified\n\n4. Quick Wins\n   • Pin repo to your GitHub profile\n   • Add CHANGELOG.md\n   • Set up GitHub Actions CI/CD`;
}

function analyzeTech(repoData, langData) {
  const langs = Object.keys(langData);
  const totalBytes = Object.values(langData).reduce((a, b) => a + b, 0);
  const techMap = { JavaScript: 'Dynamic web / Node.js', TypeScript: 'Typed JS — scalable', Python: 'Data science / web / scripting', Java: 'Enterprise JVM', Kotlin: 'Modern JVM / Android', Swift: 'Apple ecosystem', Dart: 'Flutter cross-platform', Rust: 'Memory-safe systems', Go: 'Fast microservices', 'C++': 'High-performance systems', Ruby: 'Web (Rails)', PHP: 'Server-side web', 'C#': '.NET / Unity', HTML: 'Web markup', CSS: 'Web styling', Shell: 'DevOps scripting' };
  const langDetails = langs.slice(0, 6).map(l => `   • ${l} (${totalBytes ? Math.round(langData[l] / totalBytes * 100) : 0}%) — ${techMap[l] || 'General purpose'}`).join('\n');
  const topics = (repoData.topics || []).join(', ') || 'None listed';
  return `1. Technologies\n${langDetails || '   No data'}\n\n2. Topics / Tags\n   ${topics}\n\n3. Stack Summary\n   Primary: ${repoData.language || 'Unknown'}\n   Total languages: ${langs.length}\n   Type: ${langs.length > 5 ? 'Multi-language (complex)' : langs.length > 2 ? 'Mixed-language' : 'Single-language'}\n\n4. Infrastructure\n   GitHub Pages: ${repoData.has_pages ? '✅' : '❌'}   Containerization: ${langs.includes('Dockerfile') || langs.includes('Shell') ? '✅ Likely present' : '❌ Not detected'}`;
}

function localAnalyze(mode, repoData, langData, contribData, readmeText) {
  switch (mode) {
    case 'overview': return analyzeOverview(repoData, langData, contribData);
    case 'readme': return analyzeReadme(readmeText);
    case 'structure': return analyzeStructure(repoData, langData);
    case 'improvements': return analyzeImprovements(repoData, readmeText);
    case 'tech': return analyzeTech(repoData, langData);
    default: return '';
  }
}

function localAsk(q, repoData, langData, contribData, readmeText) {
  const ql = q.toLowerCase();
  if (/star|popular/.test(ql)) return `This repo has ${(repoData.stargazers_count || 0).toLocaleString()} stars.`;
  if (/fork/.test(ql)) return `Forked ${(repoData.forks_count || 0).toLocaleString()} times.`;
  if (/language|tech|stack/.test(ql)) return `Languages: ${Object.keys(langData).join(', ') || 'Unknown'}.`;
  if (/issue|bug/.test(ql)) return `${(repoData.open_issues_count || 0).toLocaleString()} open issues.`;
  if (/license/.test(ql)) return `License: ${repoData.license?.name || 'No license specified'}.`;
  if (/description|about|what/.test(ql)) return `${repoData.full_name}: ${repoData.description || 'No description.'}`;
  if (/contribut|author|who/.test(ql)) return `Top contributors: ${contribData.slice(0, 5).map(c => c.login).join(', ') || 'Unknown'}.`;
  if (/topic|tag/.test(ql)) return `Topics: ${(repoData.topics || []).join(', ') || 'No topics set'}.`;
  if (/update|recent|last/.test(ql)) return `Last updated: ${new Date(repoData.updated_at).toDateString()}.`;
  if (/creat|old|age|when/.test(ql)) return `Created: ${new Date(repoData.created_at).toDateString()}.`;
  if (/home|website|url|link/.test(ql)) return `Homepage: ${repoData.homepage || 'None set'}.`;
  if (/readme/.test(ql)) return readmeText ? `README found (${readmeText.length} chars). Preview: ${readmeText.substring(0, 200)}...` : 'No README found.';
  return `${repoData.full_name}\n• Description: ${repoData.description || 'N/A'}\n• Stars: ${repoData.stargazers_count}\n• Language: ${repoData.language || 'Unknown'}\n• Updated: ${new Date(repoData.updated_at).toDateString()}`;
}

// ── Components ────────────────────────────────────────────────────────────────

function MetricCard({ icon, label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{icon} {label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function ResultCard({ icon, title, badge, badgeClass, content, topics }) {
  return (
    <div className="result-card">
      <h3 className="result-title">
        <span>{icon}</span> {title}
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </h3>
      <pre className="result-content">{content}</pre>
      {topics && topics.length > 0 && (
        <div className="topics">
          {topics.map(t => <span key={t} className="topic-tag">{t}</span>)}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState('');
  const [repoData, setRepoData] = useState(null);
  const [langData, setLangData] = useState({});
  const [contribData, setContribData] = useState([]);
  const [readmeText, setReadmeText] = useState('');
  const [results, setResults] = useState([]);
  const [askInput, setAskInput] = useState('');

  const handleAnalyze = async () => {
    if (!url.trim()) { setError('Please enter a GitHub repository URL.'); return; }
    const parsed = parseRepoUrl(url);
    if (!parsed) { setError('Invalid GitHub URL. Format: https://github.com/owner/repo'); return; }

    setLoading(true); setLoadingText('Fetching repository data...'); setError('');
    setResults([]); setRepoData(null);

    try {
      const { rd, ld, cd, readme } = await fetchGitHubData(parsed.owner, parsed.repo);
      setRepoData(rd); setLangData(ld); setContribData(cd); setReadmeText(readme);
      setLoadingText('Analyzing...');
      const text = localAnalyze(mode, rd, ld, cd, readme);
      setResults([{ id: Date.now(), mode, content: text, question: null }]);
    } catch (e) {
      setError(e.message || 'Failed to fetch repository.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (repoData) {
      const text = localAnalyze(newMode, repoData, langData, contribData, readmeText);
      setResults(prev => {
        const filtered = prev.filter(r => r.question !== null);
        return [{ id: Date.now(), mode: newMode, content: text, question: null }, ...filtered];
      });
    }
  };

  const handleAsk = () => {
    if (!askInput.trim() || !repoData) return;
    const answer = localAsk(askInput, repoData, langData, contribData, readmeText);
    setResults(prev => [...prev, { id: Date.now(), question: askInput, content: answer }]);
    setAskInput('');
  };

  const topLang = Object.keys(langData)[0] || 'Unknown';
  const modeLabelMap = Object.fromEntries(MODES.map(m => [m.key, m.label]));

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h1>🐙 AI GitHub Project Analyzer</h1>
          <p>Enter any public GitHub repo URL to get an instant analysis</p>
        </div>

        <div className="input-row">
          <input
            type="text"
            className="repo-input"
            placeholder="https://github.com/owner/repository"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
          />
          <button className="btn-primary" onClick={handleAnalyze} disabled={loading}>
            {loading ? '⏳ Loading...' : '🔍 Analyze'}
          </button>
        </div>

        <div className="mode-row">
          {MODES.map(m => (
            <button
              key={m.key}
              className={`mode-btn ${mode === m.key ? 'active' : ''}`}
              onClick={() => handleModeChange(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <span>{loadingText}</span>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        {repoData && (
          <div className="metrics-grid">
            <MetricCard icon="⭐" label="Stars" value={(repoData.stargazers_count || 0).toLocaleString()} />
            <MetricCard icon="🍴" label="Forks" value={(repoData.forks_count || 0).toLocaleString()} />
            <MetricCard icon="🐛" label="Open Issues" value={(repoData.open_issues_count || 0).toLocaleString()} />
            <MetricCard icon="💻" label="Top Language" value={topLang} />
            <MetricCard icon="👁️" label="Watchers" value={(repoData.subscribers_count || 0).toLocaleString()} />
            <MetricCard icon="📅" label="Updated" value={new Date(repoData.updated_at).toLocaleDateString()} />
          </div>
        )}

        <div className="results-area">
          {results.map(r => (
            r.question === null ? (
              <ResultCard
                key={r.id}
                icon="✨"
                title={modeLabelMap[r.mode] || 'Analysis'}
                badge="No API Key"
                badgeClass="badge-local"
                content={r.content}
                topics={r.mode === 'overview' ? (repoData?.topics || []) : []}
              />
            ) : (
              <ResultCard
                key={r.id}
                icon="💬"
                title={`Q: ${r.question}`}
                badge="Answer"
                badgeClass="badge-success"
                content={r.content}
              />
            )
          ))}
        </div>

        {repoData && (
          <div className="ask-row">
            <input
              type="text"
              className="ask-input"
              placeholder="Ask anything about this repo..."
              value={askInput}
              onChange={e => setAskInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
            />
            <button className="btn-success" onClick={handleAsk}>💬 Ask</button>
          </div>
        )}
      </div>
    </div>
  );
}
