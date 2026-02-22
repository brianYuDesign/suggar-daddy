import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserInterest } from '../recommendation/user-interest.entity';
import { UserInteraction } from '../recommendation/user-interaction.entity';

@Entity('users')
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  email!: string;

  @Index('idx_user_username', { unique: true })
  @Column('varchar', { length: 20, unique: true, nullable: true })
  username!: string | null;

  @Exclude()
  @Column('varchar', { length: 255 })
  passwordHash!: string;

  @Column('varchar', { length: 100 })
  displayName!: string;

  @Column('varchar', { length: 50, default: 'subscriber' })
  role!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Recommendation relations
  @OneToMany(() => UserInterest, (interest) => interest.user)
  interests!: UserInterest[];

  @OneToMany(() => UserInteraction, (interaction) => interaction.user)
  interactions!: UserInteraction[];
}
