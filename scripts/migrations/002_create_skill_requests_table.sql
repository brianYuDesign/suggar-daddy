-- Create skill_requests table for custom skill requests
CREATE TABLE IF NOT EXISTS skill_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL,
    suggested_name VARCHAR(100) NOT NULL,
    suggested_name_en VARCHAR(100) NOT NULL,
    suggested_name_zh_tw VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    created_skill_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_skill_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_skill_requests_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_skill_requests_created_skill FOREIGN KEY (created_skill_id) REFERENCES skills(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_skill_requests_user_id ON skill_requests(user_id);
CREATE INDEX idx_skill_requests_status ON skill_requests(status);
CREATE INDEX idx_skill_requests_created_at ON skill_requests(created_at DESC);
CREATE INDEX idx_skill_requests_reviewer ON skill_requests(reviewed_by);

COMMENT ON TABLE skill_requests IS '用戶自訂技能申請表';
COMMENT ON COLUMN skill_requests.status IS '申請狀態: pending, approved, rejected';
COMMENT ON COLUMN skill_requests.reviewed_by IS '審核人 ID';
COMMENT ON COLUMN skill_requests.rejection_reason IS '拒絕原因';
COMMENT ON COLUMN skill_requests.created_skill_id IS '批准後建立的技能 ID';
