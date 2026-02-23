import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('conversations')
@Unique(['participantAId', 'participantBId'])
export class ConversationEntity {
  @PrimaryColumn('varchar', { length: 255 })
  id!: string;

  @Index('idx_conversation_participant_a')
  @Column('uuid')
  participantAId!: string;

  @Index('idx_conversation_participant_b')
  @Column('uuid')
  participantBId!: string;

  @Column('timestamp', { nullable: true })
  lastMessageAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
