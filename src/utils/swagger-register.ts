import { MetadataArgsStorage } from 'routing-controllers';

/**
 * 修复 routing-controllers-openapi 库的 bug
 * 问题：getParamSchema 函数在访问元数据时没有检查是否存在，导致报错
 * 
 * 修复方案：
 * 1. 为所有 body 参数设置正确的 object 引用
 * 2. 手动设置完整的 design:paramtypes 元数据
 */
export function fixSwaggerMetadata(storage: MetadataArgsStorage): void {
    // 修复：为所有 body 参数设置正确的 object 引用
    const bodyParams = storage.params.filter(p => p.type === 'body');
    
    for (const param of bodyParams) {
        // 如果 object 不存在，尝试从 actions 中找到对应的控制器
        if (!param.object) {
            // 查找对应的 action（通过方法名匹配）
            const action = storage.actions.find(a => 
                a.method === param.method
            );
            
            if (action && action.target) {
                // 修复 param.object
                (param as any).object = action.target;
            } else {
                // 如果还是找不到，尝试从 controllers 中查找
                for (const controller of storage.controllers) {
                    if (controller.target && 
                        controller.target.prototype && 
                        typeof controller.target.prototype[param.method] === 'function') {
                        (param as any).object = controller.target;
                        break;
                    }
                }
            }
        }
        
        // 如果元数据不存在且有 explicitType，手动设置元数据
        // 这是关键：确保在调用 getParamSchema 之前，元数据已经存在
        if (param.object && param.explicitType) {
            let existingTypes = Reflect.getMetadata('design:paramtypes', param.object, param.method);
            if (!existingTypes || !existingTypes[param.index]) {
                // 安全地获取方法函数
                const prototype = (param.object as any)?.prototype;
                const methodFunc = prototype?.[param.method];
                
                if (methodFunc && typeof methodFunc === 'function') {
                    const paramCount = methodFunc.length;
                    // 如果元数据不存在，创建一个新的数组
                    if (!existingTypes) {
                        existingTypes = new Array(paramCount);
                        // 用 Object 填充所有位置（默认类型）
                        for (let i = 0; i < paramCount; i++) {
                            existingTypes[i] = Object;
                        }
                    }
                    // 确保数组足够大
                    while (existingTypes.length <= param.index) {
                        existingTypes.push(Object);
                    }
                    // 设置正确的类型
                    existingTypes[param.index] = param.explicitType;
                    Reflect.defineMetadata('design:paramtypes', existingTypes, param.object, param.method);
                } else {
                    // 如果无法获取方法，至少创建一个基本的元数据数组
                    if (!existingTypes) {
                        existingTypes = new Array(param.index + 1).fill(Object);
                        existingTypes[param.index] = param.explicitType;
                        Reflect.defineMetadata('design:paramtypes', existingTypes, param.object, param.method);
                    }
                }
            }
        } else if (param.object && !param.explicitType) {
            // 即使没有 explicitType，也确保元数据存在（至少是空数组）
            const existingTypes = Reflect.getMetadata('design:paramtypes', param.object, param.method);
            if (!existingTypes) {
                const prototype = (param.object as any)?.prototype;
                const methodFunc = prototype?.[param.method];
                
                if (methodFunc && typeof methodFunc === 'function') {
                    const paramCount = methodFunc.length;
                    const paramTypes = new Array(paramCount).fill(Object);
                    Reflect.defineMetadata('design:paramtypes', paramTypes, param.object, param.method);
                }
            }
        }
    }
}

