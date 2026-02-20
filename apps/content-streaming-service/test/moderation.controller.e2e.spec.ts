import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Content, ModerationStatus } from '../src/entities/content.entity';
import { ModerationLog, ModerationAction } from '../src/entities/moderation-log.entity';
import { Repository } from 'typeorm';

describe('ModerationController (e2e)', () => {
  let app: INestApplication;
  let contentRepository: Repository<Content>;
  let moderationLogRepository: Repository<ModerationLog>;

  const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@test.com',
    roles: ['admin'],
  };

  const mockModeratorUser = {
    id: 'moderator-1',
    email: 'moderator@test.com',
    roles: ['moderator'],
  };

  const mockRegularUser = {
    id: 'user-1',
    email: 'user@test.com',
    roles: ['subscriber'],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('JWT_AUTH_GUARD')
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockAdminUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    contentRepository = moduleFixture.get<Repository<Content>>(
      getRepositoryToken(Content),
    );
    moderationLogRepository = moduleFixture.get<Repository<ModerationLog>>(
      getRepositoryToken(ModerationLog),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await moderationLogRepository.clear();
    await contentRepository.clear();
  });

  describe('GET /api/content/pending-review', () => {
    it('should return pending review content list', async () => {
      // Create test content
      const content = contentRepository.create({
        id: 'content-1',
        title: 'Test Content',
        creator_id: 'creator-1',
        moderation_status: ModerationStatus.PENDING,
      });
      await contentRepository.save(content);

      const response = await request(app.getHttpServer())
        .get('/api/content/pending-review')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].id).toBe('content-1');
    });

    it('should support pagination', async () => {
      // Create multiple content items
      for (let i = 0; i < 5; i++) {
        await contentRepository.save(
          contentRepository.create({
            id: `content-${i}`,
            title: `Test Content ${i}`,
            creator_id: 'creator-1',
            moderation_status: ModerationStatus.PENDING,
          }),
        );
      }

      const response = await request(app.getHttpServer())
        .get('/api/content/pending-review?limit=2&offset=0')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.limit).toBe(2);
      expect(response.body.offset).toBe(0);
    });
  });

  describe('POST /api/content/:id/approve', () => {
    it('should approve content successfully', async () => {
      const content = await contentRepository.save(
        contentRepository.create({
          id: 'content-approve',
          title: 'Content to Approve',
          creator_id: 'creator-1',
          moderation_status: ModerationStatus.PENDING,
        }),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/content/${content.id}/approve`)
        .send({ reason: 'Looks good' })
        .expect(201);

      expect(response.body.moderation_status).toBe(ModerationStatus.APPROVED);
      expect(response.body.moderated_by).toBe(mockAdminUser.id);

      // Verify moderation log was created
      const logs = await moderationLogRepository.find({
        where: { content_id: content.id },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe(ModerationAction.APPROVE);
    });

    it('should return 404 for non-existent content', async () => {
      await request(app.getHttpServer())
        .post('/api/content/non-existent/approve')
        .send({ reason: 'Test' })
        .expect(404);
    });

    it('should return 400 if content is already approved', async () => {
      const content = await contentRepository.save(
        contentRepository.create({
          id: 'content-already-approved',
          title: 'Already Approved',
          creator_id: 'creator-1',
          moderation_status: ModerationStatus.APPROVED,
        }),
      );

      await request(app.getHttpServer())
        .post(`/api/content/${content.id}/approve`)
        .send({ reason: 'Test' })
        .expect(400);
    });
  });

  describe('POST /api/content/:id/reject', () => {
    it('should reject content with reason', async () => {
      const content = await contentRepository.save(
        contentRepository.create({
          id: 'content-reject',
          title: 'Content to Reject',
          creator_id: 'creator-1',
          moderation_status: ModerationStatus.PENDING,
        }),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/content/${content.id}/reject`)
        .send({ reason: 'Violates community guidelines' })
        .expect(201);

      expect(response.body.moderation_status).toBe(ModerationStatus.REJECTED);
      expect(response.body.moderation_reason).toBe('Violates community guidelines');
      expect(response.body.is_published).toBe(false);
    });

    it('should return 400 if rejection reason is missing', async () => {
      const content = await contentRepository.save(
        contentRepository.create({
          id: 'content-reject-no-reason',
          title: 'Content to Reject',
          creator_id: 'creator-1',
          moderation_status: ModerationStatus.PENDING,
        }),
      );

      await request(app.getHttpServer())
        .post(`/api/content/${content.id}/reject`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/content/:id/flag', () => {
    it('should flag content and increment report count', async () => {
      const content = await contentRepository.save(
        contentRepository.create({
          id: 'content-flag',
          title: 'Content to Flag',
          creator_id: 'creator-1',
          moderation_status: ModerationStatus.APPROVED,
          report_count: 0,
        }),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/content/${content.id}/flag`)
        .send({ reason: 'Inappropriate content' })
        .expect(201);

      expect(response.body.report_count).toBe(1);
    });

    it('should auto-flag content when report count reaches threshold', async () => {
      const content = await contentRepository.save(
        contentRepository.create({
          id: 'content-auto-flag',
          title: 'Content to Auto Flag',
          creator_id: 'creator-1',
          moderation_status: ModerationStatus.APPROVED,
          report_count: 2, // Already has 2 reports
        }),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/content/${content.id}/flag`)
        .send({ reason: 'Third report' })
        .expect(201);

      expect(response.body.moderation_status).toBe(ModerationStatus.FLAGGED);
    });
  });

  describe('POST /api/content/:id/unflag', () => {
    it('should unflag content (admin only)', async () => {
      const content = await contentRepository.save(
        contentRepository.create({
          id: 'content-unflag',
          title: 'Content to Unflag',
          creator_id: 'creator-1',
          moderation_status: ModerationStatus.FLAGGED,
        }),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/content/${content.id}/unflag`)
        .send({ reason: 'Reviewed and cleared' })
        .expect(201);

      expect(response.body.moderation_status).toBe(ModerationStatus.PENDING);
    });

    it('should return 400 if content is not flagged', async () => {
      const content = await contentRepository.save(
        contentRepository.create({
          id: 'content-not-flagged',
          title: 'Normal Content',
          creator_id: 'creator-1',
          moderation_status: ModerationStatus.APPROVED,
        }),
      );

      await request(app.getHttpServer())
        .post(`/api/content/${content.id}/unflag`)
        .send({ reason: 'Test' })
        .expect(400);
    });
  });

  describe('GET /api/content/:id/moderation-history', () => {
    it('should return moderation history for content', async () => {
      const content = await contentRepository.save(
        contentRepository.create({
          id: 'content-history',
          title: 'Content with History',
          creator_id: 'creator-1',
        }),
      );

      // Create moderation logs
      await moderationLogRepository.save([
        {
          content_id: content.id,
          action: ModerationAction.FLAG,
          performed_by: 'user-1',
          reason: 'Reported',
        },
        {
          content_id: content.id,
          action: ModerationAction.APPROVE,
          performed_by: 'admin-1',
          reason: 'Cleared',
        },
      ]);

      const response = await request(app.getHttpServer())
        .get(`/api/content/${content.id}/moderation-history`)
        .expect(200);

      expect(response.body.content_id).toBe(content.id);
      expect(response.body.history).toHaveLength(2);
    });
  });

  describe('Role-based Access Control', () => {
    it('should allow admin to access moderation endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/content/pending-review')
        .expect(200);
    });

    // Note: Full role testing would require mocking different users
    // This is a simplified version
  });
});
