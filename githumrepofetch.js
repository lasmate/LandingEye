// Constants for better maintainability
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const GITHUB_USERNAME = 'lasmate';
const REPOS_PER_PAGE = 5; // Increased to fill carousel

// Cache keys
const CACHE_KEYS = {
  REPOS: 'github_repos_cache',
  TIMESTAMP: 'github_repos_cache_time',
  LANGUAGES: 'github_languages_cache',
  VERSION: 'github_cache_version'
};

// Current cache version - increment when making breaking changes
const CACHE_VERSION = '1.1';

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
  const repoList = document.getElementById('github-projects-carousel');
  if (!repoList) return;

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
    repoList.innerHTML = '<div class="carousel-item">Loading...</div>';
    
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
    repoList.innerHTML = `<div class="carousel-item" style="background-color: #ffcccc; color: #990000; font-size: 0.8rem; text-align: center;">
      ${error.message || 'Error fetching repos.'}
      <br><button onclick="clearGitHubCache()" style="margin-top:5px; cursor:pointer;">Retry</button>
    </div>`;
  }
}

async function renderRepos(repos, languagesCache) {
  const repoList = document.getElementById('github-projects-carousel');
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

      const card = document.createElement('div');
      card.className = 'carousel-item';
      // Make the whole card clickable
      card.onclick = () => window.open(repo.html_url, '_blank');
      
      card.innerHTML = `
        <div style="padding: 15px; width: 100%; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; text-align: left;">
          <div style="font-weight: bold; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
             <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" style="width: 16px; height: 16px;">
             <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${repo.name}</span>
          </div>
          <div style="font-size: 0.8rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; line-height: 1.2;">
            ${repo.description || 'No description available'}
          </div>
          <div style="font-size: 0.7rem; color: #555; display: flex; justify-content: space-between; align-items: center;">
            <span>${languagesList.length ? languagesList[0] : 'Code'}</span>
            <span>★ ${repo.stargazers_count}</span>
          </div>
        </div>
      `;
      fragment.appendChild(card);
    } catch (error) {
      console.error(`Error processing repo "${repo.name}": ${error.message}`);
    }
  }
  
  repoList.appendChild(fragment);
}

// Make clearGitHubCache global so it can be called from onclick
window.clearGitHubCache = function(reload = true) {
  localStorage.removeItem(CACHE_KEYS.REPOS);
  localStorage.removeItem(CACHE_KEYS.TIMESTAMP);
  localStorage.removeItem(CACHE_KEYS.LANGUAGES);
  localStorage.removeItem(CACHE_KEYS.VERSION); 
  if (reload) {
    fetchRepos();
  }
};
