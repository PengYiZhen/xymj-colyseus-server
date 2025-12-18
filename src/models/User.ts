import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';

/**
 * 用户实体示例
 */
@Entity('users')
@Index(['username'], { unique: true })
@Index(['email'], { unique: true })
export class User extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 64,
    comment: '用户名',
  })
  username!: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: '邮箱',
  })
  email!: string;

  @Column({
    type: 'varchar',
    length: 255,
    select: false,
    comment: '密码（加密）',
  })
  password!: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '昵称',
  })
  nickname?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '头像URL',
  })
  avatar?: string;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '状态：0-禁用，1-启用',
  })
  status!: number;
}

