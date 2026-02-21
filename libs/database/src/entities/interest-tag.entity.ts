import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
} from 'typeorm';

export type InterestTagCategory = 'lifestyle' | 'interests' | 'expectations' | 'personality';

@Entity('interest_tags')
@Unique(['category', 'name'])
export class InterestTagEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  category!: InterestTagCategory;

  @Column('varchar', { length: 50 })
  name!: string;

  @Column('varchar', { length: 50, nullable: true })
  nameZh!: string | null;

  @Column('varchar', { length: 10, nullable: true })
  icon!: string | null;

  @Column('int', { default: 0 })
  sortOrder!: number;

  @Column('boolean', { default: true })
  isActive!: boolean;
}
