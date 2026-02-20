import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { ContentTag } from './content-tag.entity';
import { UserInteraction } from './user-interaction.entity';

@Entity('contents')
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  creator_id: string;

  @Column({ default: 0 })
  view_count: number;

  @Column({ default: 0 })
  like_count: number;

  @Column({ default: 0 })
  share_count: number;

  @Column({ type: 'float', default: 0 })
  engagement_score: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ default: false })
  is_featured: boolean;

  @Column({ type: 'float', default: 0 })
  newness_score: number;

  @ManyToMany(() => ContentTag, (tag) => tag.contents, { cascade: true, eager: true })
  @JoinTable({
    name: 'content_tags_junction',
    joinColumn: { name: 'content_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: ContentTag[];

  @OneToMany(() => UserInteraction, (interaction) => interaction.content, { cascade: true })
  interactions: UserInteraction[];
}
