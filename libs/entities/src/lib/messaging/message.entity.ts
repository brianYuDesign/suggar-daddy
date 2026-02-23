import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('messages')
@Index('idx_message_conversation_created', ['conversationId', 'createdAt'])
export class MessageEntity {
  @PrimaryColumn('varchar', { length: 255 })
  id!: string;

  @Column('varchar', { length: 255 })
  conversationId!: string;

  @Index('idx_message_sender')
  @Column('uuid')
  senderId!: string;

  @Column('text')
  content!: string;

  @Column('jsonb', { nullable: true })
  attachments!: { id: string; type: string; url: string; thumbnailUrl?: string }[] | null;

  @Column('timestamp', { nullable: true })
  readAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
