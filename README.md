# YouTube Studio Style Analytics Dashboard

A modern, responsive, high-performance video analytics dashboard inspired by the official **YouTube & YouTube Studio UI**, built directly on the `data.csv` dataset (3,951 analyzed videos across Music, Tech, AI, Gaming, News, Sports, Education, and Movies).

---

## 🚀 How to Launch
You can open and view the dashboard in **any web browser** without needing a web server or internet connection:

1. **Quick Launch**: Double-click [`Launch_Dashboard.bat`](file:///c:/Users/narsi/Downloads/New%20folder/Launch_Dashboard.bat)
2. **Direct Browser**: Double-click or right-click [`index.html`](file:///c:/Users/narsi/Downloads/New%20folder/index.html) and open with Google Chrome, Microsoft Edge, Brave, or Firefox.

---

## 🎨 YouTube UI Features
- **YouTube Studio Dark & Light Themes**: Authentic `#0f0f0f` true dark theme with YouTube red `#ff0000` and YouTube blue accents.
- **Top YouTube Search Bar**: Real-time multi-field search across titles, channel creators, and query topics.
- **Collapsible Sidebar**:
  - 🏠 **Explore Feed**: Grid and Tabular video views with real YouTube thumbnails, duration overlays, and verified badges.
  - 🔥 **Trending Radar**: Highest trending velocity and community breakout videos.
  - 📊 **Studio Analytics**: High-resolution charts comparing performance by Query, YouTube Category breakdown, and Duration strategy.
  - 💡 **Creator Lab**: Algorithmic insights answering:
    - *Does ALL CAPS hurt or help views?*
    - *How do Emojis in titles impact CTR?*
    - *Do Question marks `?` and Exclamation points `!` boost engagement?*
    - *Best Time to Post 24×7 Heatmap (Day × Hour matrix).*
  - 🏆 **Top Channels Leaderboard**: Ranked creators (Fox News, Mrwhosetheboss, Geo News, NBC Sports, Thuy Nga, etc.) with drill-down filters.
- **YouTube Pill / Chip Filters**: Instant filtering by `Trending`, `Shorts (<60s)`, `Longform (>20m)`, `News`, `Tech`, `AI`, `Music`, `Sports`, `Education`, and `Gaming`.
- **Interactive YouTube Watch Modal**: Click any video card to open a YouTube watch inspector with an embedded player, description preview, and full engagement statistics.
- **Export Data**: 1-click CSV export of currently filtered and searched videos.

---

## 📁 Project Structure
- [`index.html`](file:///c:/Users/narsi/Downloads/New%20folder/index.html) - Main dashboard shell and YouTube UI layout
- [`style.css`](file:///c:/Users/narsi/Downloads/New%20folder/style.css) - YouTube design system styles (cards, typography, badges, dark/light theme)
- [`app.js`](file:///c:/Users/narsi/Downloads/New%20folder/app.js) - Application logic, state management, search, sorters, filters, analytics & offline chart renderers
- [`videos_data.js`](file:///c:/Users/narsi/Downloads/New%20folder/videos_data.js) - Compact JSON dataset compiled from `data.csv` (3,951 videos)
- [`Launch_Dashboard.bat`](file:///c:/Users/narsi/Downloads/New%20folder/Launch_Dashboard.bat) - One-click Windows launcher

