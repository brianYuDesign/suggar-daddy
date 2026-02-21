-- Seed data for interest_tags table
-- Run after the interest_tags table migration

INSERT INTO interest_tags (id, category, name, name_zh, icon, sort_order, is_active) VALUES
-- Lifestyle
(gen_random_uuid(), 'lifestyle', 'travel', '旅行', '✈️', 1, true),
(gen_random_uuid(), 'lifestyle', 'food', '美食', '🍽️', 2, true),
(gen_random_uuid(), 'lifestyle', 'fitness', '健身', '💪', 3, true),
(gen_random_uuid(), 'lifestyle', 'shopping', '購物', '🛍️', 4, true),
(gen_random_uuid(), 'lifestyle', 'party', '派對', '🎉', 5, true),
(gen_random_uuid(), 'lifestyle', 'outdoor', '戶外運動', '🏔️', 6, true),
-- Interests
(gen_random_uuid(), 'interests', 'music', '音樂', '🎵', 1, true),
(gen_random_uuid(), 'interests', 'movies', '電影', '🎬', 2, true),
(gen_random_uuid(), 'interests', 'art', '藝術', '🎨', 3, true),
(gen_random_uuid(), 'interests', 'photography', '攝影', '📷', 4, true),
(gen_random_uuid(), 'interests', 'reading', '閱讀', '📚', 5, true),
(gen_random_uuid(), 'interests', 'gaming', '遊戲', '🎮', 6, true),
-- Expectations
(gen_random_uuid(), 'expectations', 'long_term', '長期關係', '💍', 1, true),
(gen_random_uuid(), 'expectations', 'casual', '短期約會', '🥂', 2, true),
(gen_random_uuid(), 'expectations', 'travel_companion', '旅伴', '🧳', 3, true),
(gen_random_uuid(), 'expectations', 'mentor', '導師', '🎓', 4, true),
(gen_random_uuid(), 'expectations', 'sponsor', '生活贊助', '💎', 5, true),
-- Personality
(gen_random_uuid(), 'personality', 'introvert', '內向', '🌙', 1, true),
(gen_random_uuid(), 'personality', 'extrovert', '外向', '☀️', 2, true),
(gen_random_uuid(), 'personality', 'adventurous', '冒險型', '🚀', 3, true),
(gen_random_uuid(), 'personality', 'artistic', '文藝型', '🖌️', 4, true),
(gen_random_uuid(), 'personality', 'business', '商務型', '💼', 5, true)
ON CONFLICT (category, name) DO NOTHING;
