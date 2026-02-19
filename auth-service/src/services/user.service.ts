import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role, RoleType } from '@/entities';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '@/dtos';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  /**
   * Create a new user (admin operation)
   */
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.rolePermissions', 'roles.rolePermissions.permission'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['roles', 'roles.rolePermissions', 'roles.rolePermissions.permission'],
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(userId);

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  /**
   * List all users (with pagination)
   */
  async listUsers(page: number = 1, limit: number = 10): Promise<any> {
    const [users, total] = await this.usersRepository.findAndCount({
      relations: ['roles'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: users,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    user.isActive = false;
    await this.usersRepository.save(user);
  }

  /**
   * Activate user
   */
  async activateUser(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    user.isActive = true;
    await this.usersRepository.save(user);
  }

  /**
   * Delete user (hard delete)
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    await this.usersRepository.remove(user);
  }

  /**
   * Get user response DTO
   */
  async getUserResponse(userId: string): Promise<UserResponseDto> {
    const user = await this.getUserById(userId);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles?.map((role) => ({
        id: role.id,
        name: role.name,
      })),
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    user.emailVerified = true;
    await this.usersRepository.save(user);
  }
}
