-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_zh_tw VARCHAR(100) NOT NULL,
    icon VARCHAR(500),
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_active ON skills(is_active);

-- Create user_skills table
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    skill_id UUID NOT NULL,
    proficiency_level INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
    is_highlight BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_user_skills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_skill UNIQUE (user_id, skill_id)
);

-- Create indexes
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_user_skills_highlight ON user_skills(user_id, is_highlight);

-- Insert default skills data
-- Personality
INSERT INTO skills (category, name, name_en, name_zh_tw, sort_order) VALUES
('personality', '活潑開朗', 'Cheerful', '活潑開朗', 1),
('personality', '溫柔體貼', 'Gentle', '溫柔體貼', 2),
('personality', '幽默風趣', 'Humorous', '幽默風趣', 3),
('personality', '成熟穩重', 'Mature', '成熟穩重', 4),
('personality', '神秘性感', 'Mysterious', '神秘性感', 5);

-- Hobby
INSERT INTO skills (category, name, name_en, name_zh_tw, sort_order) VALUES
('hobby', '健身運動', 'Fitness', '健身運動', 10),
('hobby', '瑜珈', 'Yoga', '瑜珈', 11),
('hobby', '游泳', 'Swimming', '游泳', 12),
('hobby', '登山', 'Hiking', '登山', 13),
('hobby', '跑步', 'Running', '跑步', 14),
('hobby', '音樂', 'Music', '音樂', 15),
('hobby', '唱歌', 'Singing', '唱歌', 16),
('hobby', '跳舞', 'Dancing', '跳舞', 17),
('hobby', '攝影', 'Photography', '攝影', 18),
('hobby', '繪畫', 'Painting', '繪畫', 19),
('hobby', '旅遊', 'Travel', '旅遊', 20),
('hobby', '美食', 'Gourmet', '美食', 21),
('hobby', '咖啡', 'Coffee', '咖啡', 22),
('hobby', '閱讀', 'Reading', '閱讀', 23),
('hobby', '電影', 'Movies', '電影', 24),
('hobby', '動漫', 'Anime', '動漫', 25),
('hobby', '遊戲', 'Gaming', '遊戲', 26);

-- Talent
INSERT INTO skills (category, name, name_en, name_zh_tw, sort_order) VALUES
('talent', '鋼琴', 'Piano', '鋼琴', 30),
('talent', '吉他', 'Guitar', '吉他', 31),
('talent', '小提琴', 'Violin', '小提琴', 32),
('talent', '芭蕾舞', 'Ballet', '芭蕾舞', 33),
('talent', '街舞', 'Street Dance', '街舞', 34),
('talent', '拉丁舞', 'Latin Dance', '拉丁舞', 35),
('talent', '素描', 'Sketching', '素描', 36),
('talent', '水彩', 'Watercolor', '水彩', 37),
('talent', '數位繪圖', 'Digital Art', '數位繪圖', 38),
('talent', '影片剪輯', 'Video Editing', '影片剪輯', 39);

-- Language
INSERT INTO skills (category, name, name_en, name_zh_tw, sort_order) VALUES
('language', '中文', 'Chinese', '中文', 40),
('language', '英文', 'English', '英文', 41),
('language', '日文', 'Japanese', '日文', 42),
('language', '韓文', 'Korean', '韓文', 43),
('language', '西班牙文', 'Spanish', '西班牙文', 44),
('language', '法文', 'French', '法文', 45);

-- Content Type (for Creators)
INSERT INTO skills (category, name, name_en, name_zh_tw, sort_order) VALUES
('content_type', '寫真照片', 'Portrait Photos', '寫真照片', 50),
('content_type', '藝術照', 'Artistic Photos', '藝術照', 51),
('content_type', '時尚穿搭', 'Fashion', '時尚穿搭', 52),
('content_type', '舞蹈表演', 'Dance Performance', '舞蹈表演', 53),
('content_type', '歌唱表演', 'Singing Performance', '歌唱表演', 54),
('content_type', 'ASMR', 'ASMR', 'ASMR', 55),
('content_type', '生活日常', 'Daily Life', '生活日常', 56),
('content_type', '旅遊 Vlog', 'Travel Vlog', '旅遊 Vlog', 57),
('content_type', '美妝教學', 'Makeup Tutorial', '美妝教學', 58),
('content_type', '健身教學', 'Fitness Tutorial', '健身教學', 59);

-- Service Type (for Creators)
INSERT INTO skills (category, name, name_en, name_zh_tw, sort_order) VALUES
('service_type', '文字聊天', 'Text Chat', '文字聊天', 60),
('service_type', '語音通話', 'Voice Call', '語音通話', 61),
('service_type', '視訊通話', 'Video Call', '視訊通話', 62),
('service_type', '直播互動', 'Live Stream', '直播互動', 63),
('service_type', '一對一視訊', '1-on-1 Video', '一對一視訊', 64),
('service_type', '客製化內容', 'Custom Content', '客製化內容', 65),
('service_type', '專屬訊息', 'Exclusive Messages', '專屬訊息', 66);

-- Interaction Style
INSERT INTO skills (category, name, name_en, name_zh_tw, sort_order) VALUES
('interaction_style', '傾聽陪伴', 'Listening & Companionship', '傾聽陪伴', 70),
('interaction_style', '情感支持', 'Emotional Support', '情感支持', 71),
('interaction_style', '輕鬆娛樂', 'Entertainment', '輕鬆娛樂', 72),
('interaction_style', '深度對話', 'Deep Conversation', '深度對話', 73);

-- Date Activity
INSERT INTO skills (category, name, name_en, name_zh_tw, sort_order) VALUES
('date_activity', '看電影', 'Movie', '看電影', 80),
('date_activity', '吃飯', 'Dining', '吃飯', 81),
('date_activity', '喝咖啡', 'Coffee Date', '喝咖啡', 82),
('date_activity', '運動健身', 'Sports', '運動健身', 83),
('date_activity', '戶外活動', 'Outdoor Activities', '戶外活動', 84),
('date_activity', '逛街購物', 'Shopping', '逛街購物', 85),
('date_activity', '展覽活動', 'Exhibitions', '展覽活動', 86),
('date_activity', '夜生活', 'Nightlife', '夜生活', 87),
('date_activity', '旅遊', 'Travel', '旅遊', 88);

-- Seeking (what users are looking for)
INSERT INTO skills (category, name, name_en, name_zh_tw, sort_order) VALUES
('seeking', '長期關係', 'Long-term Relationship', '長期關係', 90),
('seeking', '短期約會', 'Casual Dating', '短期約會', 91),
('seeking', '純聊天', 'Chat Only', '純聊天', 92),
('seeking', '新朋友', 'New Friends', '新朋友', 93),
('seeking', '互惠關係', 'Mutually Beneficial', '互惠關係', 94);

-- Lifestyle
INSERT INTO skills (category, name, name_en, name_zh_tw, sort_order) VALUES
('lifestyle', '健身愛好者', 'Fitness Enthusiast', '健身愛好者', 100),
('lifestyle', '夜生活', 'Night Owl', '夜生活', 101),
('lifestyle', '寵物愛好者', 'Pet Lover', '寵物愛好者', 102),
('lifestyle', '素食主義', 'Vegetarian', '素食主義', 103),
('lifestyle', '環保意識', 'Eco-conscious', '環保意識', 104);

COMMENT ON TABLE skills IS '技能主表';
COMMENT ON TABLE user_skills IS '用戶技能關聯表';
COMMENT ON COLUMN skills.category IS '技能分類';
COMMENT ON COLUMN skills.is_active IS '是否啟用';
COMMENT ON COLUMN skills.sort_order IS '排序順序';
COMMENT ON COLUMN user_skills.proficiency_level IS '熟練度 1-5';
COMMENT ON COLUMN user_skills.is_highlight IS '是否在個人資料中突顯';
