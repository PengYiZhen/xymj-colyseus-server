import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { BaseEntity } from '../models/BaseEntity';

/**
 * 基础服务类
 */
export abstract class BaseService<T extends BaseEntity> {
  protected abstract repository: Repository<T>;

  /**
   * 根据ID查找
   */
  async findById(id: string): Promise<T | null> {
    return await this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
    });
  }

  /**
   * 查找所有
   */
  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return await this.repository.find(options);
  }

  /**
   * 创建
   */
  async create(entity: Partial<T>): Promise<T> {
    const newEntity = this.repository.create(entity as any);
    const saved = await this.repository.save(newEntity);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  /**
   * 更新
   */
  async update(id: string, entity: Partial<T>): Promise<T> {
    await this.repository.update(id, entity as any);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('更新失败：记录不存在');
    }
    return updated;
  }

  /**
   * 删除（软删除）
   */
  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  /**
   * 硬删除
   */
  async hardDelete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * 分页查询
   */
  async paginate(
    page: number = 1,
    pageSize: number = 10,
    options?: FindManyOptions<T>
  ): Promise<{ data: T[]; total: number; page: number; pageSize: number }> {
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.repository.findAndCount({
      ...options,
      skip,
      take: pageSize,
    });

    return {
      data,
      total,
      page,
      pageSize,
    };
  }
}

