import csv
import json

with open('data.csv', mode='r', encoding='utf-8', errors='replace') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

clean_rows = []
for r in rows:
    try:
        clean_rows.append({
            'id': r.get('video_id', ''),
            'q': r.get('query', ''),
            't': r.get('title', ''),
            'c': r.get('channel_title', ''),
            'p': r.get('published_at', '')[:10],
            'cat': int(r['category_id']) if r.get('category_id') and r['category_id'].isdigit() else 0,
            'v': int(float(r['view_count'])) if r.get('view_count') else 0,
            'l': int(float(r['like_count'])) if r.get('like_count') else 0,
            'cm': int(float(r['comment_count'])) if r.get('comment_count') else 0,
            'd': int(float(r['duration_seconds'])) if r.get('duration_seconds') else 0,
            'thumb': r.get('thumbnail_url', ''),
            'score': round(float(r['trending_score']), 1) if r.get('trending_score') else 0,
            'sent': round(float(r['title_sentiment']), 2) if r.get('title_sentiment') else 0,
            'yr': int(r['publish_year']) if r.get('publish_year') and r['publish_year'].isdigit() else 0,
            'hr': int(r['publish_hour']) if r.get('publish_hour') and r['publish_hour'].isdigit() else 0,
            'day': r.get('publish_weekday', ''),
            'qmark': int(r['has_question_mark']) if r.get('has_question_mark') and r['has_question_mark'].isdigit() else 0,
            'excl': int(r['has_exclamation']) if r.get('has_exclamation') and r['has_exclamation'].isdigit() else 0,
            'emoji': int(r['emoji_count']) if r.get('emoji_count') and r['emoji_count'].isdigit() else 0,
            'caps': round(float(r['title_uppercase_ratio']), 2) if r.get('title_uppercase_ratio') else 0,
            'tags': int(r['tags_count']) if r.get('tags_count') and r['tags_count'].isdigit() else 0,
            'desc_len': int(r['description_length']) if r.get('description_length') and r['description_length'].isdigit() else 0,
            'desc': r.get('description', '')[:300]
        })
    except Exception as e:
        pass

category_map = {
    1: 'Film & Animation',
    2: 'Autos & Vehicles',
    10: 'Music',
    15: 'Pets & Animals',
    17: 'Sports',
    19: 'Travel & Events',
    20: 'Gaming',
    22: 'People & Blogs',
    23: 'Comedy',
    24: 'Entertainment',
    25: 'News & Politics',
    26: 'Howto & Style',
    27: 'Education',
    28: 'Science & Tech',
    29: 'Nonprofits',
    30: 'Movies'
}

js_content = f"window.YOUTUBE_CATEGORY_MAP = {json.dumps(category_map, indent=2)};\n"
js_content += f"window.YOUTUBE_DATASET = {json.dumps(clean_rows, separators=(',', ':'))};\n"

with open('videos_data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Generated videos_data.js successfully! Total items: {len(clean_rows)}")

