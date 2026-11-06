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
            'caps': round(float(r['title_uppercase_ratio']), 2) if r.get('title_uppercase_ratio') else 0
        })
    except Exception as e:
        pass

out_json = json.dumps(clean_rows, separators=(',', ':'))
print(f"Processed {len(clean_rows)} items. JSON length: {len(out_json)} bytes ({len(out_json)/(1024*1024):.2f} MB)")

with open('videos_data.json', 'w', encoding='utf-8') as f:
    f.write(out_json)

