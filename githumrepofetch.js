// Constants for better maintainability
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const GITHUB_USERNAME = 'lasmate';
const REPOS_PER_PAGE = 3;

// Cache keys
const CACHE_KEYS = {
  REPOS: 'github_repos_cache',
  TIMESTAMP: 'github_repos_cache_time',
  LANGUAGES: 'github_languages_cache',
  VERSION: 'github_cache_version'
};

// Current cache version - increment when making breaking changes
const CACHE_VERSION = '1.0';

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check cache version and clear if outdated
  const cachedVersion = localStorage.getItem(CACHE_KEYS.VERSION);
  if (cachedVersion !== CACHE_VERSION) {
    clearGitHubCache(false);
    localStorage.setItem(CACHE_KEYS.VERSION, CACHE_VERSION);
  }
  
  fetchRepos();
});

async function fetchRepos() {
  const repoList = document.getElementById('repo-list');
  try {
    // Check cache first
    const cache = localStorage.getItem(CACHE_KEYS.REPOS);
    const cacheTime = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
    const cacheLanguages = localStorage.getItem(CACHE_KEYS.LANGUAGES);
    
    // Use cache if valid
    if (cache && cacheTime && cacheLanguages && 
        (Date.now() - parseInt(cacheTime)) < CACHE_DURATION) {
      const repos = JSON.parse(cache);
      const languages = JSON.parse(cacheLanguages);
      renderRepos(repos, languages);
      return;
    }

    // Show loading indicator
  repoList.innerHTML = '<li><div style="background-color: var(--bg-0b344f); border-radius: 10px; padding: 10px; margin-bottom: 15px; width:80vw;">Loading repositories...</div></li>';
    
    // Check rate limit before making the main request
    const rateLimitResponse = await fetch('https://api.github.com/rate_limit');
    if (!rateLimitResponse.ok) {
      throw new Error('Unable to check GitHub API rate limit');
    }
    
    const rateLimit = await rateLimitResponse.json();
    if (rateLimit.resources.core.remaining < 5) { // Need at least 5 for repos + languages
      const resetDate = new Date(rateLimit.resources.core.reset * 1000);
      throw new Error(`Rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`);
    }

    // Fetch repositories
    const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=${REPOS_PER_PAGE}`);
    if (!response.ok) {
      throw new Error(`GitHub API responded with status ${response.status}`);
    }
    
    const repos = await response.json();
    const languagesCache = {};

    // Store the results in cache
    localStorage.setItem(CACHE_KEYS.REPOS, JSON.stringify(repos));
    localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
    
    renderRepos(repos, languagesCache);

  } catch (error) {
    console.error('Error fetching repos:', error);
  repoList.innerHTML = `<li><div style="background-color: var(--bg-0b344f); border-radius: 10px; padding: 10px; margin-bottom: 15px; width:80vw;">
      <img   src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub Logo" style="border-radius:10px; width: 20px; height: 20px; vertical-align: middle; margin-right: 10px;">
      <span>${error.message || 'Error fetching repos. Please try again later.'}</span>
  <button onclick="clearGitHubCache()" style="margin-left: 15px; background: var(--bg-0d1117); border: 1px solid var(--border-30363d); color: var(--muted-c9d1d9); padding: 3px 8px; border-radius: 6px; cursor: pointer;">Retry</button>
    </div></li>`;
  }
}

async function renderRepos(repos, languagesCache) {
  const repoList = document.getElementById('repo-list');
  repoList.innerHTML = ''; // Clear existing content
  
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  for (const repo of repos) {
    try {
      let languages;
      
      // Check if languages are in cache
      if (languagesCache[repo.name]) {
        languages = languagesCache[repo.name];
      } else {
        // Add delay between requests to avoid rate limiting
        if (Object.keys(languagesCache).length > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Fetch languages if not in cache
        const languagesResponse = await fetch(repo.languages_url);
        if (!languagesResponse.ok) {
          throw new Error(`Failed to fetch languages for ${repo.name}`);
        }
        languages = await languagesResponse.json();
        languagesCache[repo.name] = languages;
        
        // Update languages cache in localStorage
        localStorage.setItem(CACHE_KEYS.LANGUAGES, JSON.stringify(languagesCache));
      }

      // Convert languages object to array and sort by usage
      const languagesList = Object.entries(languages)
        .sort((a, b) => b[1] - a[1])
        .map(([name, bytes]) => name)
        .slice(0, 3);

      const listItem = document.createElement('li');
      listItem.innerHTML = `
  <div style="background-color: var(--bg-353535); border-radius: 10px; padding: 10px; margin-bottom: 15px; width:60vw;" class="repo-card">
          <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub Logo" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 10px;">
          <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" style="font-weight: thin; font-size: large;">${repo.name} :</a><br> ${repo.description || 'No description available'}<br>
          <div style="color: rgba(217,217,217,1); font-size: larger;">Main languages: ${languagesList.length ? languagesList.join(', ') : 'None detected'}</div><br>
          Last updated: ${new Date(repo.updated_at).toLocaleString()}<br>
          <div class="github-embed" style="margin-top: 10px;">
            <iframe 
              src="https://ghbtns.com/github-btn.html?user=${GITHUB_USERNAME}&repo=${repo.name}&type=star&count=true&size=large" 
              frameborder="0" 
              scrolling="0" 
              width="170" 
              height="30" 
              title="${repo.name} GitHub Stars"
              loading="lazy">
            </iframe>
          </div>
        </div>
      `;
  fragment.appendChild(listItem);
    } catch (error) {
      console.error(`Error processing repo "${repo.name}" (URL: ${repo.html_url}): ${error.message}\nStack Trace:`, error.stack);
      const errorItem = document.createElement('li');
      errorItem.innerHTML = `
    <div style="background-color: var(--bg-353535); border-radius: 10px; padding: 10px; margin-bottom: 15px; width:80vw;">
          <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub Logo" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 10px;">
          <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">${repo.name}</a>: ${error.message}
        </div>
      `;
      fragment.appendChild(errorItem);
    }
  }
  
  repoList.appendChild(fragment);
  
  // Add refresh button after all repos
  const refreshItem = document.createElement('li');
  refreshItem.innerHTML = `
    <button onclick="clearGitHubCache()" style="background: var(--bg-0d1117); border: 1px solid var(--border-30363d); color: var(--muted-c9d1d9); padding: 5px 10px; border-radius: 6px; cursor: pointer; margin-top: 10px;">
      Refresh Repository Data
    </button>
  `;
  repoList.appendChild(refreshItem);
}

function clearGitHubCache(reload = true) {
  localStorage.removeItem(CACHE_KEYS.REPOS);
  localStorage.removeItem(CACHE_KEYS.TIMESTAMP);
  localStorage.removeItem(CACHE_KEYS.LANGUAGES);
  localStorage.removeItem(CACHE_KEYS.VERSION); // Clear cache version
  if (reload) {
    fetchRepos();
  }
}
