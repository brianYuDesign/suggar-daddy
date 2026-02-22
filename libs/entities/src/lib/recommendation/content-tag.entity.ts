import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, Index } from 'typeorm';
import { Content } from '../content/content.entity';

@Entity('content_tags')
@Index('idx_content_tag_usage', ['usage_count'])
export class ContentTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 0 })
  usage_count: number;

  @ManyToMany(() => Content, (content) => content.tags)
  contents: Content[];
}
