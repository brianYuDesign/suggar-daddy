import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum PageType {
  PRIVACY = 'privacy',
  TERMS = 'terms',
  COMMUNITY_GUIDELINES = 'community-guidelines',
  ABOUT = 'about',
  CONTACT = 'contact',
  FAQ = 'faq',
  COOKIE_POLICY = 'cookie-policy',
  CUSTOM = 'custom',
}

@Entity('static_pages')
export class StaticPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ unique: true, length: 250 })
  @Index()
  slug: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: PageType, default: PageType.CUSTOM })
  @Index()
  pageType: PageType;

  @Column({ type: 'enum', enum: PageStatus, default: PageStatus.DRAFT })
  @Index()
  status: PageStatus;

  @Column({ nullable: true })
  metaTitle: string;

  @Column({ type: 'text', nullable: true })
  metaDescription: string;

  @Column({ nullable: true })
  lastEditedBy: string;

  @Column({ nullable: true })
  publishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
