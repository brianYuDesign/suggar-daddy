import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserInterest } from './user-interest.entity';
import { UserInteraction } from './user-interaction.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => UserInterest, (interest) => interest.user, { cascade: true })
  interests: UserInterest[];

  @OneToMany(() => UserInteraction, (interaction) => interaction.user, { cascade: true })
  interactions: UserInteraction[];
}
