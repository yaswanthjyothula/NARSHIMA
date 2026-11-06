// YouTube Studio & Video Analytics Dashboard - Main Logic

(function() {
  // Ensure dataset is loaded
  if (!window.YOUTUBE_DATASET || !Array.isArray(window.YOUTUBE_DATASET)) {
    console.error("YouTube dataset not found. Please ensure videos_data.js is loaded.");
    return;
  }

  const dataset = window.YOUTUBE_DATASET;
  const categoryMap = window.YOUTUBE_CATEGORY_MAP || {};

  // Application State
  const state = {
    searchQuery: '',
    activeFilter: 'all',     // all, trending, news, tech, AI, shorts, longform, etc.
    activeYear: 'all',
    sortBy: 'score_desc',
    currentPage: 1,
    pageSize: 48,
    viewMode: 'grid',        // 'grid' or 'table'
    activeTab: 'tab-explore',
    theme: localStorage.getItem('yt_dash_theme') || 'dark',
    channelFilter: null,
    chartInstances: {}
  };

  // DOM Elements
  const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
    logoHomeBtn: document.getElementById('logoHomeBtn'),
    searchInput: document.getElementById('searchInput'),
    searchSubmitBtn: document.getElementById('searchSubmitBtn'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    chipsWrapper: document.getElementById('chipsWrapper'),
    activeTagsList: document.getElementById('activeTagsList'),
    resultsCountText: document.getElementById('resultsCountText'),
    
    // Tab Views
    tabViews: document.querySelectorAll('.tab-view'),
    sidebarItems: document.querySelectorAll('.sidebar-item[data-tab]'),
    queryFilterBtns: document.querySelectorAll('.query-filter-btn'),
    
    // Explore Feed Elements
    kpiTotalViews: document.getElementById('kpiTotalViews'),
    kpiAvgViews: document.getElementById('kpiAvgViews'),
    kpiTotalLikes: document.getElementById('kpiTotalLikes'),
    kpiLikeRatio: document.getElementById('kpiLikeRatio'),
    kpiTotalComments: document.getElementById('kpiTotalComments'),
    kpiAvgComments: document.getElementById('kpiAvgComments'),
    kpiAvgDuration: document.getElementById('kpiAvgDuration'),
    kpiShortsRatio: document.getElementById('kpiShortsRatio'),
    
    sortBySelect: document.getElementById('sortBySelect'),
    yearFilterSelect: document.getElementById('yearFilterSelect'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    viewGridBtn: document.getElementById('viewGridBtn'),
    viewTableBtn: document.getElementById('viewTableBtn'),
    
    videoGrid: document.getElementById('videoGrid'),
    videoTableContainer: document.getElementById('videoTableContainer'),
    videoTableBody: document.getElementById('videoTableBody'),
    emptyState: document.getElementById('emptyState'),
    
    paginationBar: document.getElementById('paginationBar'),
    pageInfoText: document.getElementById('pageInfoText'),
    paginationControls: document.getElementById('paginationControls'),
    
    trendingGrid: document.getElementById('trendingGrid'),
    
    // Creator Lab elements
    optCapsContent: document.getElementById('optCapsContent'),
    optEmojiContent: document.getElementById('optEmojiContent'),
    optPunctContent: document.getElementById('optPunctContent'),
    heatmapTable: document.getElementById('heatmapTable'),
    
    // Channels elements
    channelSearchInput: document.getElementById('channelSearchInput'),
    channelsList: document.getElementById('channelsList'),
    
    // Modal elements
    modalBackdrop: document.getElementById('videoModalBackdrop'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalVideoBox: document.getElementById('modalVideoBox'),
    modalTitle: document.getElementById('modalTitle'),
    modalChannelAvatar: document.getElementById('modalChannelAvatar'),
    modalChannelName: document.getElementById('modalChannelName'),
    modalCategoryDate: document.getElementById('modalCategoryDate'),
    modalWatchOnYtBtn: document.getElementById('modalWatchOnYtBtn'),
    modalViews: document.getElementById('modalViews'),
    modalLikes: document.getElementById('modalLikes'),
    modalComments: document.getElementById('modalComments'),
    modalEngagement: document.getElementById('modalEngagement'),
    modalScore: document.getElementById('modalScore'),
    modalDuration: document.getElementById('modalDuration'),
    modalDescription: document.getElementById('modalDescription')
  };

  // Helper Formatters
  function formatNumber(num) {
    if (!num || isNaN(num)) return '0';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
  }

  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Apply Theme
  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('yt_dash_theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    renderStudioCharts();
  }

  // Filtering Logic
  function getFilteredData() {
    return dataset.filter(video => {
      // Channel filter
      if (state.channelFilter && video.c !== state.channelFilter) {
        return false;
      }

      // Year filter
      if (state.activeYear !== 'all' && video.yr.toString() !== state.activeYear) {
        return false;
      }

      // Search Query
      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        const inTitle = video.t.toLowerCase().includes(q);
        const inChannel = video.c.toLowerCase().includes(q);
        const inQuery = video.q.toLowerCase().includes(q);
        if (!inTitle && !inChannel && !inQuery) {
          return false;
        }
      }

      // Chips filter
      if (state.activeFilter === 'trending') {
        return video.score > 100000;
      } else if (state.activeFilter === 'shorts') {
        return video.d <= 60;
      } else if (state.activeFilter === 'longform') {
        return video.d >= 1200;
      } else if (state.activeFilter === 'high_engagement') {
        return video.v > 0 && (video.l / video.v) >= 0.02;
      } else if (state.activeFilter !== 'all') {
        return video.q.toLowerCase() === state.activeFilter.toLowerCase();
      }

      return true;
    });
  }

  // Sorting Logic
  function sortData(list) {
    const sorted = [...list];
    switch (state.sortBy) {
      case 'views_desc':
        return sorted.sort((a, b) => b.v - a.v);
      case 'likes_desc':
        return sorted.sort((a, b) => b.l - a.l);
      case 'comments_desc':
        return sorted.sort((a, b) => b.cm - a.cm);
      case 'score_desc':
        return sorted.sort((a, b) => b.score - a.score);
      case 'engagement_desc':
        return sorted.sort((a, b) => {
          const engA = a.v > 0 ? (a.l / a.v) : 0;
          const engB = b.v > 0 ? (b.l / b.v) : 0;
          return engB - engA;
        });
      case 'duration_desc':
        return sorted.sort((a, b) => b.d - a.d);
      case 'duration_asc':
        return sorted.sort((a, b) => a.d - b.d);
      case 'sentiment_desc':
        return sorted.sort((a, b) => b.sent - a.sent);
      case 'newest':
        return sorted.sort((a, b) => (b.p || '').localeCompare(a.p || ''));
      default:
        return sorted;
    }
  }

  // Update KPI Summary Header
  function updateKPIs(filtered) {
    if (filtered.length === 0) {
      elements.kpiTotalViews.textContent = '0';
      elements.kpiAvgViews.textContent = '0 avg';
      elements.kpiTotalLikes.textContent = '0';
      elements.kpiLikeRatio.textContent = '0%';
      elements.kpiTotalComments.textContent = '0';
      elements.kpiAvgComments.textContent = '0';
      elements.kpiAvgDuration.textContent = '0:00';
      elements.kpiShortsRatio.textContent = '0% Shorts';
      return;
    }

    let totViews = 0;
    let totLikes = 0;
    let totComments = 0;
    let totDuration = 0;
    let shortsCount = 0;

    for (let i = 0; i < filtered.length; i++) {
      totViews += filtered[i].v;
      totLikes += filtered[i].l;
      totComments += filtered[i].cm;
      totDuration += filtered[i].d;
      if (filtered[i].d <= 60) shortsCount++;
    }

    const avgViews = Math.round(totViews / filtered.length);
    const avgLikesRatio = totViews > 0 ? ((totLikes / totViews) * 100).toFixed(2) : 0;
    const avgComments = Math.round(totComments / filtered.length);
    const avgDuration = Math.round(totDuration / filtered.length);
    const shortsPercent = ((shortsCount / filtered.length) * 100).toFixed(0);

    elements.kpiTotalViews.textContent = formatNumber(totViews);
    elements.kpiAvgViews.textContent = `${formatNumber(avgViews)} avg/vid`;
    elements.kpiTotalLikes.textContent = formatNumber(totLikes);
    elements.kpiLikeRatio.textContent = `${avgLikesRatio}% like ratio`;
    elements.kpiTotalComments.textContent = formatNumber(totComments);
    elements.kpiAvgComments.textContent = `${formatNumber(avgComments)} comments/vid`;
    elements.kpiAvgDuration.textContent = formatDuration(avgDuration);
    elements.kpiShortsRatio.textContent = `${shortsPercent}% Shorts (<60s)`;
  }

  // Active Filter Pills
  function updateActiveFilterTags(totalFiltered) {
    elements.activeTagsList.innerHTML = '';
    elements.resultsCountText.textContent = `Showing ${totalFiltered.toLocaleString()} videos`;

    if (state.activeFilter !== 'all') {
      const tag = document.createElement('div');
      tag.className = 'active-tag';
      tag.innerHTML = `Filter: ${escapeHtml(state.activeFilter)} <button data-clear="filter">✕</button>`;
      tag.querySelector('button').addEventListener('click', () => {
        setFilter('all');
      });
      elements.activeTagsList.appendChild(tag);
    }

    if (state.searchQuery.trim()) {
      const tag = document.createElement('div');
      tag.className = 'active-tag';
      tag.innerHTML = `Search: "${escapeHtml(state.searchQuery)}" <button data-clear="search">✕</button>`;
      tag.querySelector('button').addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.searchClearBtn.style.display = 'none';
        render();
      });
      elements.activeTagsList.appendChild(tag);
    }

    if (state.activeYear !== 'all') {
      const tag = document.createElement('div');
      tag.className = 'active-tag';
      tag.innerHTML = `Year: ${state.activeYear} <button data-clear="year">✕</button>`;
      tag.querySelector('button').addEventListener('click', () => {
        state.activeYear = 'all';
        elements.yearFilterSelect.value = 'all';
        render();
      });
      elements.activeTagsList.appendChild(tag);
    }

    if (state.channelFilter) {
      const tag = document.createElement('div');
      tag.className = 'active-tag';
      tag.innerHTML = `Creator: ${escapeHtml(state.channelFilter)} <button data-clear="channel">✕</button>`;
      tag.querySelector('button').addEventListener('click', () => {
        state.channelFilter = null;
        render();
      });
      elements.activeTagsList.appendChild(tag);
    }

    // Reset All button if multiple filters
    if (elements.activeTagsList.children.length > 0) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'yt-action-pill';
      resetBtn.style.padding = '2px 8px';
      resetBtn.style.fontSize = '11px';
      resetBtn.textContent = 'Clear All';
      resetBtn.addEventListener('click', () => {
        state.activeFilter = 'all';
        state.searchQuery = '';
        state.activeYear = 'all';
        state.channelFilter = null;
        elements.searchInput.value = '';
        elements.searchClearBtn.style.display = 'none';
        elements.yearFilterSelect.value = 'all';
        syncChipStyles();
        render();
      });
      elements.activeTagsList.appendChild(resetBtn);
    }
  }

  // Render Video Grid Cards
  function renderVideoGrid(items) {
    elements.videoGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    items.forEach(video => {
      const card = document.createElement('div');
      card.className = 'video-card';
      card.addEventListener('click', () => openVideoModal(video));

      const isShort = video.d <= 60;
      const durationStr = formatDuration(video.d);
      const viewsStr = formatNumber(video.v) + ' views';
      const initial = (video.c || 'Y').charAt(0).toUpperCase();

      let sentimentClass = '';
      let sentimentLabel = 'Neutral';
      if (video.sent > 0.15) {
        sentimentClass = 'sentiment-pos';
        sentimentLabel = `+${video.sent} Positive`;
      } else if (video.sent < -0.15) {
        sentimentClass = 'sentiment-neg';
        sentimentLabel = `${video.sent} Negative`;
      }

      // Placeholder image if thumbnail fails
      const fallbackThumb = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

      card.innerHTML = `
        <div class="thumb-container">
          <img class="thumb-img" src="${video.thumb || fallbackThumb}" alt="${escapeHtml(video.t)}" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/480x270/181818/aaaaaa?text=YouTube+Video';">
          ${isShort ? '<div class="shorts-badge">⚡ Shorts</div>' : `<div class="duration-badge">${durationStr}</div>`}
          <div class="score-badge" title="Trending Velocity Score">
            ★ ${formatNumber(video.score)}
          </div>
        </div>
        <div class="video-info">
          <div class="channel-avatar">${initial}</div>
          <div class="video-details">
            <h3 class="video-title" title="${escapeHtml(video.t)}">${escapeHtml(video.t)}</h3>
            <div class="channel-name">
              <span>${escapeHtml(video.c)}</span>
              <svg class="verified-icon" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM9.8 17.3l-4.2-4.1 1.4-1.4 2.8 2.7 7.8-7.8 1.4 1.4-9.2 9.2z"/></svg>
            </div>
            <div class="video-meta">
              <span>${viewsStr}</span>
              <span class="meta-dot">•</span>
              <span>${video.p || 'Recent'}</span>
              <span class="meta-dot">•</span>
              <span style="color:var(--yt-blue);">${video.q}</span>
            </div>
            <div class="video-tags-row">
              <span class="tag-pill ${sentimentClass}">${sentimentLabel}</span>
              ${video.l > 0 && video.v > 0 ? `<span class="tag-pill">${((video.l / video.v)*100).toFixed(1)}% Likes</span>` : ''}
            </div>
          </div>
        </div>
      `;

      fragment.appendChild(card);
    });

    elements.videoGrid.appendChild(fragment);
  }

  // Render Video Table Rows
  function renderVideoTable(items) {
    elements.videoTableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    items.forEach(video => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => openVideoModal(video));

      const engRate = video.v > 0 ? ((video.l / video.v) * 100).toFixed(2) + '%' : '0%';
      const fallbackThumb = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

      tr.innerHTML = `
        <td><img class="table-thumb" src="${video.thumb || fallbackThumb}" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/80x45/181818/aaaaaa?text=YT';"></td>
        <td style="max-width:280px; font-weight:500;">
          <div style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(video.t)}</div>
        </td>
        <td style="white-space:nowrap;">${escapeHtml(video.c)}</td>
        <td><span class="tag-pill" style="color:var(--yt-blue); font-weight:600;">${video.q}</span></td>
        <td style="font-weight:600;">${video.v.toLocaleString()}</td>
        <td>${video.l.toLocaleString()}</td>
        <td>${video.cm.toLocaleString()}</td>
        <td style="color:var(--yt-green); font-weight:600;">${engRate}</td>
        <td>${formatDuration(video.d)}</td>
        <td style="color:var(--yt-yellow); font-weight:600;">${formatNumber(video.score)}</td>
        <td style="white-space:nowrap; color:var(--yt-text-muted);">${video.p}</td>
      `;

      fragment.appendChild(tr);
    });

    elements.videoTableBody.appendChild(fragment);
  }

  // Render Pagination Controls
  function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / state.pageSize) || 1;
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    elements.pageInfoText.textContent = `Page ${state.currentPage} of ${totalPages.toLocaleString()} (${totalItems.toLocaleString()} items)`;
    elements.paginationControls.innerHTML = '';

    if (totalPages <= 1) {
      elements.paginationBar.style.display = 'none';
      return;
    }
    elements.paginationBar.style.display = 'flex';

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '◀';
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderFeedItems();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    elements.paginationControls.appendChild(prevBtn);

    // Numbered Buttons (Smart range)
    let startPage = Math.max(1, state.currentPage - 2);
    let endPage = Math.min(totalPages, state.currentPage + 2);

    if (startPage > 1) {
      const firstBtn = createPageBtn(1);
      elements.paginationControls.appendChild(firstBtn);
      if (startPage > 2) {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.style.padding = '0 6px';
        dots.style.color = 'var(--yt-text-muted)';
        elements.paginationControls.appendChild(dots);
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      elements.paginationControls.appendChild(createPageBtn(p));
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.style.padding = '0 6px';
        dots.style.color = 'var(--yt-text-muted)';
        elements.paginationControls.appendChild(dots);
      }
      elements.paginationControls.appendChild(createPageBtn(totalPages));
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = '▶';
    nextBtn.disabled = state.currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderFeedItems();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    elements.paginationControls.appendChild(nextBtn);
  }

  function createPageBtn(p) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${p === state.currentPage ? 'active' : ''}`;
    btn.textContent = p;
    btn.addEventListener('click', () => {
      state.currentPage = p;
      renderFeedItems();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return btn;
  }

  // Render Feed Items
  function renderFeedItems() {
    const filtered = getFilteredData();
    const sorted = sortData(filtered);

    updateKPIs(filtered);
    updateActiveFilterTags(filtered.length);

    if (filtered.length === 0) {
      elements.videoGrid.style.display = 'none';
      elements.videoTableContainer.style.display = 'none';
      elements.emptyState.style.display = 'block';
      elements.paginationBar.style.display = 'none';
      return;
    }

    elements.emptyState.style.display = 'none';

    // Slice for pagination
    const startIdx = (state.currentPage - 1) * state.pageSize;
    const pagedItems = sorted.slice(startIdx, startIdx + state.pageSize);

    if (state.viewMode === 'grid') {
      elements.videoGrid.style.display = 'grid';
      elements.videoTableContainer.style.display = 'none';
      renderVideoGrid(pagedItems);
    } else {
      elements.videoGrid.style.display = 'none';
      elements.videoTableContainer.style.display = 'block';
      renderVideoTable(pagedItems);
    }

    renderPagination(filtered.length);
  }

  // Render Trending Spotlight Tab
  function renderTrendingTab() {
    // Top 30 videos by trending score
    const topTrending = [...dataset].sort((a, b) => b.score - a.score).slice(0, 30);
    elements.trendingGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    topTrending.forEach((video, index) => {
      const card = document.createElement('div');
      card.className = 'video-card';
      card.addEventListener('click', () => openVideoModal(video));

      const durationStr = formatDuration(video.d);
      const viewsStr = formatNumber(video.v) + ' views';
      const initial = (video.c || 'Y').charAt(0).toUpperCase();

      card.innerHTML = `
        <div class="thumb-container">
          <img class="thumb-img" src="${video.thumb}" alt="${escapeHtml(video.t)}" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/480x270/181818/aaaaaa?text=YouTube';">
          <div class="duration-badge">${durationStr}</div>
          <div class="score-badge" style="background:var(--yt-red); color:#fff; font-weight:700;">
            🔥 #${index + 1} Trending
          </div>
        </div>
        <div class="video-info">
          <div class="channel-avatar" style="background:#ff000030; color:var(--yt-red);">${initial}</div>
          <div class="video-details">
            <h3 class="video-title">${escapeHtml(video.t)}</h3>
            <div class="channel-name">${escapeHtml(video.c)}</div>
            <div class="video-meta">
              <span>${viewsStr}</span>
              <span class="meta-dot">•</span>
              <span>Trending Score: ${formatNumber(video.score)}</span>
            </div>
          </div>
        </div>
      `;
      fragment.appendChild(card);
    });

    elements.trendingGrid.appendChild(fragment);
  }

  // Render Studio Analytics Charts (Chart.js or Native Canvas Fallback)
  function renderStudioCharts() {
    const isLight = document.body.classList.contains('light-theme');
    const textColor = isLight ? '#222222' : '#e0e0e0';
    const gridColor = isLight ? '#e5e5e5' : '#282828';

    // 1. Performance by Query Data Preparation
    const queryStats = {};
    dataset.forEach(v => {
      const q = v.q || 'other';
      if (!queryStats[q]) queryStats[q] = { views: 0, likes: 0, count: 0 };
      queryStats[q].views += v.v;
      queryStats[q].likes += v.l;
      queryStats[q].count++;
    });

    const queries = Object.keys(queryStats);
    const avgViewsByQuery = queries.map(q => Math.round(queryStats[q].views / queryStats[q].count));
    const avgLikesByQuery = queries.map(q => Math.round(queryStats[q].likes / queryStats[q].count));

    // 2. Video Distribution by YouTube Category Data Preparation
    const catStats = {};
    dataset.forEach(v => {
      const catName = categoryMap[v.cat] || `Category ${v.cat}`;
      catStats[catName] = (catStats[catName] || 0) + 1;
    });
    const sortedCats = Object.entries(catStats).sort((a, b) => b[1] - a[1]).slice(0, 8);

    // 3. Duration Bins vs Average Views Data Preparation
    const durationBins = {
      'Shorts (<60s)': { views: 0, count: 0 },
      'Quick (1-5m)': { views: 0, count: 0 },
      'Standard (5-20m)': { views: 0, count: 0 },
      'Long (20-60m)': { views: 0, count: 0 },
      'Epic (60m+)': { views: 0, count: 0 }
    };

    dataset.forEach(v => {
      const d = v.d;
      let bin = 'Shorts (<60s)';
      if (d > 60 && d <= 300) bin = 'Quick (1-5m)';
      else if (d > 300 && d <= 1200) bin = 'Standard (5-20m)';
      else if (d > 1200 && d <= 3600) bin = 'Long (20-60m)';
      else if (d > 3600) bin = 'Epic (60m+)';

      durationBins[bin].views += v.v;
      durationBins[bin].count++;
    });
    const binLabels = Object.keys(durationBins);
    const avgViewsByBin = binLabels.map(b => Math.round(durationBins[b].views / (durationBins[b].count || 1)));

    // 4. Sentiment vs Engagement Data Preparation
    const sentBins = {
      'Negative': { engTotal: 0, count: 0 },
      'Neutral': { engTotal: 0, count: 0 },
      'Positive': { engTotal: 0, count: 0 }
    };

    dataset.forEach(v => {
      const rate = v.v > 0 ? (v.l / v.v) * 100 : 0;
      if (v.sent < -0.1) {
        sentBins['Negative'].engTotal += rate;
        sentBins['Negative'].count++;
      } else if (v.sent > 0.1) {
        sentBins['Positive'].engTotal += rate;
        sentBins['Positive'].count++;
      } else {
        sentBins['Neutral'].engTotal += rate;
        sentBins['Neutral'].count++;
      }
    });
    const sentLabels = ['Negative Sentiments', 'Neutral Titles', 'Positive / Inspiring'];
    const avgEngBySent = [
      (sentBins['Negative'].engTotal / (sentBins['Negative'].count || 1)).toFixed(2),
      (sentBins['Neutral'].engTotal / (sentBins['Neutral'].count || 1)).toFixed(2),
      (sentBins['Positive'].engTotal / (sentBins['Positive'].count || 1)).toFixed(2)
    ];

    // Check if Chart.js is available
    if (typeof Chart !== 'undefined') {
      try {
        renderWithChartJS(textColor, gridColor, queries, avgViewsByQuery, avgLikesByQuery, sortedCats, isLight, binLabels, avgViewsByBin, sentLabels, avgEngBySent);
        return;
      } catch (err) {
        console.warn("Chart.js render failed, falling back to Canvas renderer:", err);
      }
    }

    // Built-in Native Canvas Renderers (Offline mode)
    renderCanvasBarChart('chartQueryPerf', queries.map(q => q.toUpperCase()), [
      { label: 'Avg Views', data: avgViewsByQuery, color: '#ff0000' },
      { label: 'Avg Likes', data: avgLikesByQuery, color: '#3ea6ff' }
    ], textColor, gridColor);

    renderCanvasDonutChart('chartCategoryDist', sortedCats.map(c => c[0]), sortedCats.map(c => c[1]), [
      '#ff0000', '#3ea6ff', '#2ba640', '#fbc02d',
      '#9333ea', '#ec4899', '#f97316', '#14b8a6'
    ], textColor);

    renderCanvasSingleBarChart('chartDurationPerf', binLabels, avgViewsByBin, '#2ba640', textColor, gridColor);

    renderCanvasLineChart('chartSentimentEng', sentLabels, avgEngBySent.map(Number), '#fbc02d', textColor, gridColor);
  }

  function renderWithChartJS(textColor, gridColor, queries, avgViewsByQuery, avgLikesByQuery, sortedCats, isLight, binLabels, avgViewsByBin, sentLabels, avgEngBySent) {
    if (state.chartInstances.queryPerf) state.chartInstances.queryPerf.destroy();
    const ctxQuery = document.getElementById('chartQueryPerf');
    if (ctxQuery) {
      state.chartInstances.queryPerf = new Chart(ctxQuery, {
        type: 'bar',
        data: {
          labels: queries.map(q => q.toUpperCase()),
          datasets: [
            { label: 'Avg Views per Video', data: avgViewsByQuery, backgroundColor: '#ff0000', borderRadius: 6 },
            { label: 'Avg Likes per Video', data: avgLikesByQuery, backgroundColor: '#3ea6ff', borderRadius: 6 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: textColor } } },
          scales: {
            x: { ticks: { color: textColor }, grid: { display: false } },
            y: { ticks: { color: textColor }, grid: { color: gridColor } }
          }
        }
      });
    }

    if (state.chartInstances.catDist) state.chartInstances.catDist.destroy();
    const ctxCat = document.getElementById('chartCategoryDist');
    if (ctxCat) {
      state.chartInstances.catDist = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
          labels: sortedCats.map(c => c[0]),
          datasets: [{
            data: sortedCats.map(c => c[1]),
            backgroundColor: ['#ff0000', '#3ea6ff', '#2ba640', '#fbc02d', '#9333ea', '#ec4899', '#f97316', '#14b8a6'],
            borderColor: isLight ? '#ffffff' : '#181818',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { color: textColor, boxWidth: 12 } } }
        }
      });
    }

    if (state.chartInstances.durationPerf) state.chartInstances.durationPerf.destroy();
    const ctxDur = document.getElementById('chartDurationPerf');
    if (ctxDur) {
      state.chartInstances.durationPerf = new Chart(ctxDur, {
        type: 'bar',
        data: {
          labels: binLabels,
          datasets: [{ label: 'Avg Views per Video', data: avgViewsByBin, backgroundColor: '#2ba640', borderRadius: 6 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: textColor } } },
          scales: {
            x: { ticks: { color: textColor }, grid: { display: false } },
            y: { ticks: { color: textColor }, grid: { color: gridColor } }
          }
        }
      });
    }

    if (state.chartInstances.sentEng) state.chartInstances.sentEng.destroy();
    const ctxSent = document.getElementById('chartSentimentEng');
    if (ctxSent) {
      state.chartInstances.sentEng = new Chart(ctxSent, {
        type: 'line',
        data: {
          labels: sentLabels,
          datasets: [{
            label: 'Avg Like-to-View Engagement (%)',
            data: avgEngBySent,
            borderColor: '#fbc02d',
            backgroundColor: 'rgba(251, 192, 45, 0.2)',
            fill: true,
            tension: 0.3,
            pointRadius: 6,
            pointBackgroundColor: '#fbc02d'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: textColor } } },
          scales: {
            x: { ticks: { color: textColor }, grid: { display: false } },
            y: { ticks: { color: textColor }, grid: { color: gridColor } }
          }
        }
      });
    }
  }

  // --- Offline Canvas Chart Renderers ---
  function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const parent = canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = (rect.width || 460) * dpr;
    canvas.height = 280 * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '280px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width: rect.width || 460, height: 280 };
  }

  function renderCanvasBarChart(canvasId, labels, datasets, textColor, gridColor) {
    const c = setupCanvas(canvasId);
    if (!c) return;
    const { ctx, width, height } = c;
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 25, bottom: 40, left: 55, right: 20 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...datasets[0].data, ...datasets[1].data, 1);
    const numGroups = labels.length;
    const groupW = chartW / numGroups;
    const barW = Math.max(6, Math.min(20, (groupW - 12) / 2));

    // Y Axis Grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const yVal = Math.round((maxVal / 4) * i);
      const yPos = padding.top + chartH - (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();
      ctx.fillText(formatNumber(yVal), padding.left - 6, yPos + 3);
    }

    // Bars
    labels.forEach((label, i) => {
      const groupCenterX = padding.left + i * groupW + groupW / 2;

      // Dataset 0
      const val0 = datasets[0].data[i] || 0;
      const h0 = (val0 / maxVal) * chartH;
      ctx.fillStyle = datasets[0].color;
      ctx.fillRect(groupCenterX - barW - 2, padding.top + chartH - h0, barW, h0);

      // Dataset 1
      const val1 = datasets[1].data[i] || 0;
      const h1 = (val1 / maxVal) * chartH;
      ctx.fillStyle = datasets[1].color;
      ctx.fillRect(groupCenterX + 2, padding.top + chartH - h1, barW, h1);

      // Label
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(label, groupCenterX, height - padding.bottom + 16);
    });
  }

  function renderCanvasSingleBarChart(canvasId, labels, data, barColor, textColor, gridColor) {
    const c = setupCanvas(canvasId);
    if (!c) return;
    const { ctx, width, height } = c;
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 25, bottom: 45, left: 55, right: 20 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const maxVal = Math.max(...data, 1);
    const numBars = labels.length;
    const barSpacing = chartW / numBars;
    const barW = Math.max(14, barSpacing * 0.45);

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const yVal = Math.round((maxVal / 4) * i);
      const yPos = padding.top + chartH - (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();
      ctx.fillText(formatNumber(yVal), padding.left - 6, yPos + 3);
    }

    labels.forEach((label, i) => {
      const x = padding.left + i * barSpacing + barSpacing / 2 - barW / 2;
      const val = data[i] || 0;
      const barH = (val / maxVal) * chartH;

      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect(x, padding.top + chartH - barH, barW, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(label, x + barW / 2, height - padding.bottom + 16);
    });
  }

  function renderCanvasDonutChart(canvasId, labels, data, colors, textColor) {
    const c = setupCanvas(canvasId);
    if (!c) return;
    const { ctx, width, height } = c;
    ctx.clearRect(0, 0, width, height);

    const total = data.reduce((a, b) => a + b, 0);
    const centerX = width * 0.35;
    const centerY = height / 2;
    const outerRadius = Math.min(centerX - 20, centerY - 20);
    const innerRadius = outerRadius * 0.58;

    let startAngle = -Math.PI / 2;

    data.forEach((val, i) => {
      const sliceAngle = (val / total) * 2 * Math.PI;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, startAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Donut Center Text
    ctx.fillStyle = textColor;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${total}`, centerX, centerY + 2);
    ctx.font = '11px sans-serif';
    ctx.fillText('Videos', centerX, centerY + 18);

    // Legend on the Right
    const legendX = width * 0.65;
    let legendY = 30;
    ctx.textAlign = 'left';
    ctx.font = '11px sans-serif';

    labels.forEach((lbl, i) => {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(legendX, legendY, 10, 10);
      ctx.fillStyle = textColor;
      const pct = ((data[i] / total) * 100).toFixed(1);
      ctx.fillText(`${lbl} (${pct}%)`, legendX + 16, legendY + 9);
      legendY += 24;
    });
  }

  function renderCanvasLineChart(canvasId, labels, data, lineColor, textColor, gridColor) {
    const c = setupCanvas(canvasId);
    if (!c) return;
    const { ctx, width, height } = c;
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, bottom: 40, left: 50, right: 30 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const maxVal = Math.max(...data, 1) * 1.25;

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const yVal = ((maxVal / 4) * i).toFixed(1);
      const yPos = padding.top + chartH - (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();
      ctx.fillText(yVal + '%', padding.left - 6, yPos + 3);
    }

    const points = labels.map((lbl, i) => {
      const x = padding.left + (i / (labels.length - 1)) * chartW;
      const y = padding.top + chartH - (data[i] / maxVal) * chartH;
      return { x, y, lbl, val: data[i] };
    });

    // Gradient fill below line
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, 'rgba(251, 192, 45, 0.35)');
    grad.addColorStop(1, 'rgba(251, 192, 45, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach(pt => ctx.lineTo(pt.x, pt.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Points & Labels
    points.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(pt.val + '%', pt.x, pt.y - 10);
      ctx.fillText(pt.lbl, pt.x, height - padding.bottom + 18);
    });
  }

  // Render Creator Lab Optimization Insights
  function renderCreatorLab() {
    // 1. Capitalization Impact
    let lowCapsViews = 0, lowCapsCount = 0;
    let midCapsViews = 0, midCapsCount = 0;
    let highCapsViews = 0, highCapsCount = 0;

    dataset.forEach(v => {
      if (v.caps < 0.15) {
        lowCapsViews += v.v;
        lowCapsCount++;
      } else if (v.caps <= 0.35) {
        midCapsViews += v.v;
        midCapsCount++;
      } else {
        highCapsViews += v.v;
        highCapsCount++;
      }
    });

    const avgLowCaps = Math.round(lowCapsViews / (lowCapsCount || 1));
    const avgMidCaps = Math.round(midCapsViews / (midCapsCount || 1));
    const avgHighCaps = Math.round(highCapsViews / (highCapsCount || 1));
    const maxCaps = Math.max(avgLowCaps, avgMidCaps, avgHighCaps);

    elements.optCapsContent.innerHTML = `
      <div class="opt-stat-row">
        <div>
          <div class="opt-stat-label">Standard / Sentence Case (&lt;15% caps)</div>
          <div class="opt-bar-container"><div class="opt-bar-fill" style="width:${(avgLowCaps/maxCaps)*100}%; background:#3ea6ff;"></div></div>
        </div>
        <div class="opt-stat-value">${formatNumber(avgLowCaps)} <span style="font-size:11px;color:var(--yt-text-muted);">views</span></div>
      </div>
      <div class="opt-stat-row">
        <div>
          <div class="opt-stat-label">Title Case Emphasis (15% - 35% caps)</div>
          <div class="opt-bar-container"><div class="opt-bar-fill" style="width:${(avgMidCaps/maxCaps)*100}%; background:#2ba640;"></div></div>
        </div>
        <div class="opt-stat-value">${formatNumber(avgMidCaps)} <span style="font-size:11px;color:var(--yt-text-muted);">views</span></div>
      </div>
      <div class="opt-stat-row">
        <div>
          <div class="opt-stat-label">Heavy ALL CAPS (&gt;35% caps)</div>
          <div class="opt-bar-container"><div class="opt-bar-fill" style="width:${(avgHighCaps/maxCaps)*100}%; background:#ff0000;"></div></div>
        </div>
        <div class="opt-stat-value">${formatNumber(avgHighCaps)} <span style="font-size:11px;color:var(--yt-text-muted);">views</span></div>
      </div>
    `;

    // 2. Emoji Impact
    let zeroEmojiViews = 0, zeroEmojiCount = 0;
    let fewEmojiViews = 0, fewEmojiCount = 0;
    let manyEmojiViews = 0, manyEmojiCount = 0;

    dataset.forEach(v => {
      if (v.emoji === 0) {
        zeroEmojiViews += v.v;
        zeroEmojiCount++;
      } else if (v.emoji <= 2) {
        fewEmojiViews += v.v;
        fewEmojiCount++;
      } else {
        manyEmojiViews += v.v;
        manyEmojiCount++;
      }
    });

    const avgZeroEmoji = Math.round(zeroEmojiViews / (zeroEmojiCount || 1));
    const avgFewEmoji = Math.round(fewEmojiViews / (fewEmojiCount || 1));
    const avgManyEmoji = Math.round(manyEmojiViews / (manyEmojiCount || 1));
    const maxEmoji = Math.max(avgZeroEmoji, avgFewEmoji, avgManyEmoji);

    elements.optEmojiContent.innerHTML = `
      <div class="opt-stat-row">
        <div>
          <div class="opt-stat-label">No Emojis in Title (0)</div>
          <div class="opt-bar-container"><div class="opt-bar-fill" style="width:${(avgZeroEmoji/maxEmoji)*100}%; background:#3ea6ff;"></div></div>
        </div>
        <div class="opt-stat-value">${formatNumber(avgZeroEmoji)} <span style="font-size:11px;color:var(--yt-text-muted);">views</span></div>
      </div>
      <div class="opt-stat-row">
        <div>
          <div class="opt-stat-label">1 - 2 Tasteful Emojis 🚀</div>
          <div class="opt-bar-container"><div class="opt-bar-fill" style="width:${(avgFewEmoji/maxEmoji)*100}%; background:#2ba640;"></div></div>
        </div>
        <div class="opt-stat-value">${formatNumber(avgFewEmoji)} <span style="font-size:11px;color:var(--yt-text-muted);">views</span></div>
      </div>
      <div class="opt-stat-row">
        <div>
          <div class="opt-stat-label">3+ Emojis 🔥💥🎉</div>
          <div class="opt-bar-container"><div class="opt-bar-fill" style="width:${(avgManyEmoji/maxEmoji)*100}%; background:#fbc02d;"></div></div>
        </div>
        <div class="opt-stat-value">${formatNumber(avgManyEmoji)} <span style="font-size:11px;color:var(--yt-text-muted);">views</span></div>
      </div>
    `;

    // 3. Punctuation Impact
    let qmarkViews = 0, qmarkCount = 0;
    let exclViews = 0, exclCount = 0;
    let cleanViews = 0, cleanCount = 0;

    dataset.forEach(v => {
      if (v.qmark === 1) {
        qmarkViews += v.v;
        qmarkCount++;
      } else if (v.excl === 1) {
        exclViews += v.v;
        exclCount++;
      } else {
        cleanViews += v.v;
        cleanCount++;
      }
    });

    const avgQmark = Math.round(qmarkViews / (qmarkCount || 1));
    const avgExcl = Math.round(exclViews / (exclCount || 1));
    const avgClean = Math.round(cleanViews / (cleanCount || 1));
    const maxPunct = Math.max(avgQmark, avgExcl, avgClean);

    elements.optPunctContent.innerHTML = `
      <div class="opt-stat-row">
        <div>
          <div class="opt-stat-label">Question Hook Titles (?)</div>
          <div class="opt-bar-container"><div class="opt-bar-fill" style="width:${(avgQmark/maxPunct)*100}%; background:#2ba640;"></div></div>
        </div>
        <div class="opt-stat-value">${formatNumber(avgQmark)} <span style="font-size:11px;color:var(--yt-text-muted);">views</span></div>
      </div>
      <div class="opt-stat-row">
        <div>
          <div class="opt-stat-label">Exclamation Mark Titles (!)</div>
          <div class="opt-bar-container"><div class="opt-bar-fill" style="width:${(avgExcl/maxPunct)*100}%; background:#ff0000;"></div></div>
        </div>
        <div class="opt-stat-value">${formatNumber(avgExcl)} <span style="font-size:11px;color:var(--yt-text-muted);">views</span></div>
      </div>
      <div class="opt-stat-row">
        <div>
          <div class="opt-stat-label">Standard Declarative Titles</div>
          <div class="opt-bar-container"><div class="opt-bar-fill" style="width:${(avgClean/maxPunct)*100}%; background:#3ea6ff;"></div></div>
        </div>
        <div class="opt-stat-value">${formatNumber(avgClean)} <span style="font-size:11px;color:var(--yt-text-muted);">views</span></div>
      </div>
    `;

    // 4. Best Publishing Time Heatmap (24 Hours x 7 Days)
    renderHeatmap();
  }

  function renderHeatmap() {
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const matrix = {};

    weekdays.forEach(day => {
      matrix[day] = {};
      for (let h = 0; h < 24; h++) {
        matrix[day][h] = { views: 0, count: 0 };
      }
    });

    let maxCellAvg = 0;
    dataset.forEach(v => {
      if (matrix[v.day] && matrix[v.day][v.hr] !== undefined) {
        matrix[v.day][v.hr].views += v.v;
        matrix[v.day][v.hr].count++;
      }
    });

    weekdays.forEach(d => {
      for (let h = 0; h < 24; h++) {
        if (matrix[d][h].count > 0) {
          const avg = matrix[d][h].views / matrix[d][h].count;
          if (avg > maxCellAvg) maxCellAvg = avg;
        }
      }
    });

    let tableHtml = `
      <thead>
        <tr>
          <th style="text-align:left; padding-left:8px;">Day / UTC Hour</th>
    `;
    for (let h = 0; h < 24; h++) {
      tableHtml += `<th>${h}:00</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;

    weekdays.forEach(day => {
      tableHtml += `<tr><td style="text-align:left; font-weight:600; padding:6px 8px;">${day.slice(0, 3)}</td>`;
      for (let h = 0; h < 24; h++) {
        const cell = matrix[day][h];
        const avg = cell.count > 0 ? Math.round(cell.views / cell.count) : 0;
        const ratio = maxCellAvg > 0 ? (avg / maxCellAvg) : 0;

        let bg = 'rgba(255, 255, 255, 0.04)';
        let color = 'var(--yt-text-muted)';
        if (cell.count > 0) {
          if (ratio > 0.6) {
            bg = `rgba(255, 0, 0, ${0.4 + ratio * 0.6})`;
            color = '#ffffff';
          } else if (ratio > 0.25) {
            bg = `rgba(62, 166, 255, ${0.3 + ratio * 0.5})`;
            color = '#ffffff';
          } else {
            bg = `rgba(43, 166, 64, ${0.2 + ratio * 0.4})`;
            color = '#ffffff';
          }
        }

        tableHtml += `
          <td>
            <div class="heatmap-cell" style="background:${bg}; color:${color};" title="${day} at ${h}:00 UTC&#10;${cell.count} uploads&#10;Avg Views: ${formatNumber(avg)}">
              ${cell.count > 0 ? formatNumber(avg) : '-'}
            </div>
          </td>
        `;
      }
      tableHtml += `</tr>`;
    });

    tableHtml += `</tbody>`;
    elements.heatmapTable.innerHTML = tableHtml;
  }

  // Render Channels Leaderboard
  function renderChannelsLeaderboard(searchFilter = '') {
    const channelMap = {};

    dataset.forEach(v => {
      const name = v.c || 'Unknown Creator';
      if (!channelMap[name]) {
        channelMap[name] = {
          name: name,
          totalViews: 0,
          totalLikes: 0,
          videoCount: 0,
          primaryQuery: v.q
        };
      }
      channelMap[name].totalViews += v.v;
      channelMap[name].totalLikes += v.l;
      channelMap[name].videoCount++;
    });

    let channels = Object.values(channelMap);

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      channels = channels.filter(c => c.name.toLowerCase().includes(q));
    }

    // Sort by Total Views
    channels.sort((a, b) => b.totalViews - a.totalViews);

    elements.channelsList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    channels.slice(0, 60).forEach((ch, idx) => {
      const card = document.createElement('div');
      card.className = 'channel-card';
      const initial = ch.name.charAt(0).toUpperCase();
      const avgViews = Math.round(ch.totalViews / ch.videoCount);

      card.innerHTML = `
        <div class="channel-big-avatar" style="background:${getAvatarColor(idx)};">${initial}</div>
        <div class="channel-card-info">
          <div class="channel-card-name">
            <span>${escapeHtml(ch.name)}</span>
            <svg class="verified-icon" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM9.8 17.3l-4.2-4.1 1.4-1.4 2.8 2.7 7.8-7.8 1.4 1.4-9.2 9.2z"/></svg>
          </div>
          <div class="channel-card-stats">
            <span style="font-weight:600; color:var(--yt-text-primary);">${formatNumber(ch.totalViews)} total views</span> • 
            <span>${ch.videoCount} videos</span>
          </div>
          <div style="font-size:11.5px; color:var(--yt-text-muted); margin-top:2px;">
            Avg ${formatNumber(avgViews)} views/vid • Category: <strong style="color:var(--yt-blue);">${ch.primaryQuery}</strong>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        state.channelFilter = ch.name;
        switchTab('tab-explore');
        setFilter('all');
        render();
      });

      fragment.appendChild(card);
    });

    elements.channelsList.appendChild(fragment);
  }

  function getAvatarColor(idx) {
    const colors = [
      '#ff0000', '#0284c7', '#16a34a', '#ca8a04', '#9333ea',
      '#e11d48', '#0d9488', '#4f46e5', '#ea580c', '#334155'
    ];
    return colors[idx % colors.length];
  }

  // Open Video Watch Modal
  function openVideoModal(video) {
    elements.modalTitle.textContent = video.t;
    elements.modalChannelName.textContent = video.c;
    elements.modalChannelAvatar.textContent = (video.c || 'Y').charAt(0).toUpperCase();

    const catName = categoryMap[video.cat] || `Category ${video.cat}`;
    elements.modalCategoryDate.textContent = `${catName} • Published ${video.p || 'N/A'}`;

    elements.modalViews.textContent = video.v.toLocaleString();
    elements.modalLikes.textContent = video.l.toLocaleString();
    elements.modalComments.textContent = video.cm.toLocaleString();

    const engRate = video.v > 0 ? ((video.l / video.v) * 100).toFixed(2) + '%' : '0%';
    elements.modalEngagement.textContent = engRate;
    elements.modalScore.textContent = formatNumber(video.score);
    elements.modalDuration.textContent = formatDuration(video.d);

    elements.modalDescription.textContent = video.desc || "No description provided for this video.";

    const ytUrl = `https://www.youtube.com/watch?v=${video.id}`;
    elements.modalWatchOnYtBtn.href = ytUrl;

    // Video Box - YouTube Embed with fallback
    elements.modalVideoBox.innerHTML = `
      <iframe src="https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0" 
        title="${escapeHtml(video.t)}" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    `;

    elements.modalBackdrop.classList.add('open');
  }

  function closeVideoModal() {
    elements.modalBackdrop.classList.remove('open');
    elements.modalVideoBox.innerHTML = ''; // Stop video playback
  }

  // Export to CSV Function
  function exportFilteredCSV() {
    const filtered = getFilteredData();
    if (filtered.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ["video_id", "query", "title", "channel_title", "published_date", "category_id", "view_count", "like_count", "comment_count", "duration_seconds", "trending_score", "sentiment"];
    const csvRows = [headers.join(',')];

    filtered.forEach(v => {
      const row = [
        `"${v.id}"`,
        `"${(v.q || '').replace(/"/g, '""')}"`,
        `"${(v.t || '').replace(/"/g, '""')}"`,
        `"${(v.c || '').replace(/"/g, '""')}"`,
        `"${v.p}"`,
        v.cat,
        v.v,
        v.l,
        v.cm,
        v.d,
        v.score,
        v.sent
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `youtube_analytics_export_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Switch Active Tab
  function switchTab(tabId) {
    state.activeTab = tabId;

    elements.tabViews.forEach(tab => {
      if (tab.id === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    elements.sidebarItems.forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (tabId === 'tab-trending') {
      renderTrendingTab();
    } else if (tabId === 'tab-analytics') {
      setTimeout(renderStudioCharts, 50);
    } else if (tabId === 'tab-optimization') {
      renderCreatorLab();
    } else if (tabId === 'tab-channels') {
      renderChannelsLeaderboard();
    }
  }

  // Set Filter Helper
  function setFilter(filterName) {
    state.activeFilter = filterName;
    state.currentPage = 1;
    syncChipStyles();
    renderFeedItems();
  }

  function syncChipStyles() {
    const chips = elements.chipsWrapper.querySelectorAll('.chip');
    chips.forEach(chip => {
      if (chip.getAttribute('data-filter') === state.activeFilter) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    // Sync sidebar query buttons
    elements.queryFilterBtns.forEach(btn => {
      if (btn.getAttribute('data-query') === state.activeFilter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Master Render
  function render() {
    renderFeedItems();
    if (state.activeTab === 'tab-trending') renderTrendingTab();
    if (state.activeTab === 'tab-analytics') renderStudioCharts();
    if (state.activeTab === 'tab-optimization') renderCreatorLab();
    if (state.activeTab === 'tab-channels') renderChannelsLeaderboard(elements.channelSearchInput.value);
  }

  // Event Listeners Initialization
  function initEvents() {
    // Sidebar toggle (mini / full)
    elements.sidebarToggleBtn.addEventListener('click', () => {
      elements.sidebar.classList.toggle('collapsed');
    });

    // Logo click goes home
    elements.logoHomeBtn.addEventListener('click', () => {
      switchTab('tab-explore');
      setFilter('all');
      state.searchQuery = '';
      elements.searchInput.value = '';
      elements.searchClearBtn.style.display = 'none';
      render();
    });

    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', () => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });

    // Tab Navigation from sidebar
    elements.sidebarItems.forEach(item => {
      item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');
        switchTab(tabId);
      });
    });

    // Query filter navigation from sidebar
    elements.queryFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.getAttribute('data-query');
        switchTab('tab-explore');
        setFilter(query);
      });
    });

    // Chips filter click
    elements.chipsWrapper.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const filter = chip.getAttribute('data-filter');
      setFilter(filter);
    });

    // Search bar logic
    elements.searchInput.addEventListener('input', e => {
      state.searchQuery = e.target.value;
      elements.searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
      state.currentPage = 1;
      renderFeedItems();
    });

    elements.searchClearBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      state.searchQuery = '';
      elements.searchClearBtn.style.display = 'none';
      state.currentPage = 1;
      renderFeedItems();
    });

    elements.searchSubmitBtn.addEventListener('click', () => {
      state.currentPage = 1;
      renderFeedItems();
    });

    // Sort By selector
    elements.sortBySelect.addEventListener('change', e => {
      state.sortBy = e.target.value;
      state.currentPage = 1;
      renderFeedItems();
    });

    // Year selector
    elements.yearFilterSelect.addEventListener('change', e => {
      state.activeYear = e.target.value;
      state.currentPage = 1;
      renderFeedItems();
    });

    // Page size selector
    elements.pageSizeSelect.addEventListener('change', e => {
      state.pageSize = parseInt(e.target.value, 10);
      state.currentPage = 1;
      renderFeedItems();
    });

    // Grid vs Table view toggle
    elements.viewGridBtn.addEventListener('click', () => {
      state.viewMode = 'grid';
      elements.viewGridBtn.classList.add('active');
      elements.viewTableBtn.classList.remove('active');
      renderFeedItems();
    });

    elements.viewTableBtn.addEventListener('click', () => {
      state.viewMode = 'table';
      elements.viewTableBtn.classList.add('active');
      elements.viewGridBtn.classList.remove('active');
      renderFeedItems();
    });

    // Channel search input in Channels tab
    elements.channelSearchInput.addEventListener('input', e => {
      renderChannelsLeaderboard(e.target.value);
    });

    // Modal Close
    elements.modalCloseBtn.addEventListener('click', closeVideoModal);
    elements.modalBackdrop.addEventListener('click', e => {
      if (e.target === elements.modalBackdrop) {
        closeVideoModal();
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && elements.modalBackdrop.classList.contains('open')) {
        closeVideoModal();
      }
    });

    // Export CSV
    elements.exportCsvBtn.addEventListener('click', exportFilteredCSV);
  }

  // Initialize Application
  function init() {
    applyTheme(state.theme);
    initEvents();
    render();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
