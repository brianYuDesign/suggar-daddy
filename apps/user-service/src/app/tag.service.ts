import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  InterestTagEntity,
  UserInterestTagEntity,
} from '@suggar-daddy/database';
import { InjectLogger } from '@suggar-daddy/common';

const MAX_TAGS_PER_USER = 20;
const MAX_TAGS_PER_CATEGORY = 5;

@Injectable()
export class TagService {
  @InjectLogger()
  private readonly logger!: Logger;

  constructor(
    @InjectRepository(InterestTagEntity)
    private readonly tagRepo: Repository<InterestTagEntity>,
    @InjectRepository(UserInterestTagEntity)
    private readonly userTagRepo: Repository<UserInterestTagEntity>,
  ) {}

  /** Get all active tags, ordered by category then sortOrder */
  async getAllTags(): Promise<InterestTagEntity[]> {
    return this.tagRepo.find({
      where: { isActive: true },
      order: { category: 'ASC', sortOrder: 'ASC' },
    });
  }

  /** Get tags for a specific user */
  async getUserTags(userId: string): Promise<InterestTagEntity[]> {
    const userTags = await this.userTagRepo.find({
      where: { userId },
    });
    return userTags.map((ut) => ut.tag);
  }

  /** Update user's tags (replace all) */
  async updateUserTags(
    userId: string,
    tagIds: string[],
  ): Promise<InterestTagEntity[]> {
    // Validate: max 20 tags total
    if (tagIds.length > MAX_TAGS_PER_USER) {
      throw new BadRequestException(
        `Cannot select more than ${MAX_TAGS_PER_USER} tags`,
      );
    }

    // Remove duplicates
    const uniqueTagIds = [...new Set(tagIds)];

    // Validate: all tagIds exist and are active
    const tags = await this.tagRepo.find({
      where: { id: In(uniqueTagIds), isActive: true },
    });

    if (tags.length !== uniqueTagIds.length) {
      const foundIds = new Set(tags.map((t) => t.id));
      const invalidIds = uniqueTagIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Invalid or inactive tag IDs: ${invalidIds.join(', ')}`,
      );
    }

    // Validate: max 5 per category
    const categoryCount = new Map<string, number>();
    for (const tag of tags) {
      const count = categoryCount.get(tag.category) ?? 0;
      categoryCount.set(tag.category, count + 1);
    }
    for (const [category, count] of categoryCount.entries()) {
      if (count > MAX_TAGS_PER_CATEGORY) {
        throw new BadRequestException(
          `Cannot select more than ${MAX_TAGS_PER_CATEGORY} tags in category "${category}"`,
        );
      }
    }

    // Delete existing user tags
    await this.userTagRepo.delete({ userId });

    // Insert new user tags
    if (uniqueTagIds.length > 0) {
      const newUserTags = uniqueTagIds.map((tagId) =>
        this.userTagRepo.create({ userId, tagId }),
      );
      await this.userTagRepo.save(newUserTags);
    }

    this.logger.log(
      `user tags updated userId=${userId} count=${uniqueTagIds.length}`,
    );

    // Return updated tags
    return this.getUserTags(userId);
  }

  /** Get common tags between two users */
  async getCommonTags(
    userAId: string,
    userBId: string,
  ): Promise<InterestTagEntity[]> {
    const [tagsA, tagsB] = await Promise.all([
      this.userTagRepo.find({ where: { userId: userAId } }),
      this.userTagRepo.find({ where: { userId: userBId } }),
    ]);

    const tagIdsB = new Set(tagsB.map((ut) => ut.tagId));
    const commonTagIds = tagsA
      .filter((ut) => tagIdsB.has(ut.tagId))
      .map((ut) => ut.tagId);

    if (commonTagIds.length === 0) return [];

    return this.tagRepo.find({
      where: { id: In(commonTagIds) },
      order: { category: 'ASC', sortOrder: 'ASC' },
    });
  }
}
