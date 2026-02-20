import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1708252800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Recommendation Service Indexes
    
    // Content table - engagement and date indexes for sorting
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_content_engagement_score 
       ON contents(engagement_score DESC)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_content_created_at 
       ON contents(created_at DESC)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_content_is_featured 
       ON contents(is_featured)`
    );
    
    // User interactions table - composite index for common queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_interaction_user_id_created_at 
       ON user_interactions(user_id, created_at DESC)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_interaction_content_id 
       ON user_interactions(content_id)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_interaction_type 
       ON user_interactions(interaction_type)`
    );
    
    // User interests table - for finding user interests
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_interest_user_id_tag_id 
       ON user_interests(user_id, tag_id)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_interest_user_id 
       ON user_interests(user_id)`
    );
    
    // Content tags table
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_content_tag_name 
       ON content_tags(name)`
    );
    
    // Auth Service Indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_auth_user_username 
       ON users(username) WHERE username IS NOT NULL`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_auth_user_email 
       ON users(email) WHERE email IS NOT NULL`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_auth_user_is_active 
       ON users(is_active)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_auth_role_permission_role_id 
       ON role_permissions(role_id)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_auth_role_permission_permission_id 
       ON role_permissions(permission_id)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_auth_token_blacklist_user_id_created_at 
       ON token_blacklist(user_id, created_at DESC)`
    );
    
    // Payment Service Indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_payment_user_id_status 
       ON payments(user_id, status)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_payment_created_at 
       ON payments(created_at DESC)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_subscription_user_id_active 
       ON subscriptions(user_id, is_active)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_subscription_tier 
       ON subscriptions(tier)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_invoice_user_id_created_at 
       ON invoices(user_id, created_at DESC)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_invoice_payment_id 
       ON invoices(payment_id)`
    );
    
    // Content Streaming Service Indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_video_creator_id 
       ON videos(creator_id)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_video_status 
       ON videos(status)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_video_created_at 
       ON videos(created_at DESC)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_transcoding_job_video_id_status 
       ON transcoding_jobs(video_id, status)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_transcoding_job_created_at 
       ON transcoding_jobs(created_at DESC)`
    );
    
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_video_quality_video_id 
       ON video_qualities(video_id)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    const indexNames = [
      'idx_content_engagement_score',
      'idx_content_created_at',
      'idx_content_is_featured',
      'idx_user_interaction_user_id_created_at',
      'idx_user_interaction_content_id',
      'idx_user_interaction_type',
      'idx_user_interest_user_id_tag_id',
      'idx_user_interest_user_id',
      'idx_content_tag_name',
      'idx_auth_user_username',
      'idx_auth_user_email',
      'idx_auth_user_is_active',
      'idx_auth_role_permission_role_id',
      'idx_auth_role_permission_permission_id',
      'idx_auth_token_blacklist_user_id_created_at',
      'idx_payment_user_id_status',
      'idx_payment_created_at',
      'idx_subscription_user_id_active',
      'idx_subscription_tier',
      'idx_invoice_user_id_created_at',
      'idx_invoice_payment_id',
      'idx_video_creator_id',
      'idx_video_status',
      'idx_video_created_at',
      'idx_transcoding_job_video_id_status',
      'idx_transcoding_job_created_at',
      'idx_video_quality_video_id',
    ];

    for (const indexName of indexNames) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${indexName}`);
    }
  }
}
