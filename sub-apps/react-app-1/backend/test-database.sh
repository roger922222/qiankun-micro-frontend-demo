#!/bin/bash

# 数据库连接测试脚本

echo "🧪 开始测试数据库连接和功能..."

# 检查 PostgreSQL 是否运行
echo "📡 检查 PostgreSQL 服务状态..."
if ! command -v pg_isready &> /dev/null; then
    echo "⚠️  未找到 pg_isready 命令，跳过服务状态检查"
else
    if pg_isready -h localhost -p 5432; then
        echo "✅ PostgreSQL 服务正在运行"
    else
        echo "❌ PostgreSQL 服务未运行，请先启动 PostgreSQL 服务"
        echo "💡 可以使用 Docker 快速启动:"
        echo "   docker run -d --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:15"
        exit 1
    fi
fi

# 设置环境变量
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=postgres
export DB_PASSWORD=password
export DB_NAME=react_app_1
export NODE_ENV=development

echo "🔧 环境变量配置:"
echo "   DB_HOST: $DB_HOST"
echo "   DB_PORT: $DB_PORT"
echo "   DB_USERNAME: $DB_USERNAME"
echo "   DB_NAME: $DB_NAME"

# 启动后端服务进行测试
echo "🚀 启动后端服务进行数据库测试..."
cd /Users/bytedance/Downloads/qiankun-micro-frontend-demo/sub-apps/react-app-1/backend

# 安装 ts-node 用于直接运行 TypeScript 文件
if ! command -v ts-node &> /dev/null; then
    echo "📦 安装 ts-node..."
    npm install -g ts-node
fi

# 创建测试脚本
cat > test-database.ts << 'EOF'
import 'reflect-metadata';
import { AppDataSource, initializeDatabase } from './src/config/database';
import { UserRepository } from './src/repositories/database/UserRepository';
import { RoleRepository } from './src/repositories/database/RoleRepository';

async function testDatabase() {
    console.log('🔄 开始数据库测试...');
    
    try {
        // 初始化数据库连接
        await initializeDatabase();
        console.log('✅ 数据库连接成功');
        
        // 测试用户仓库
        const userRepo = new UserRepository();
        console.log('👤 测试用户仓库...');
        
        // 测试获取用户列表
        const [users, total] = await userRepo.findAll({ page: 1, pageSize: 10 });
        console.log(`📊 用户总数: ${total}`);
        console.log(`👥 第一页用户数量: ${users.length}`);
        
        if (users.length > 0) {
            console.log('📝 第一个用户:', {
                id: users[0].id,
                username: users[0].username,
                email: users[0].email,
                roles: users[0].roles?.map(r => r.name) || []
            });
        }
        
        // 测试角色仓库
        const roleRepo = new RoleRepository();
        console.log('🎭 测试角色仓库...');
        
        const roles = await roleRepo.findAll();
        console.log(`🎨 角色总数: ${roles.length}`);
        
        if (roles.length > 0) {
            console.log('📝 第一个角色:', {
                id: roles[0].id,
                name: roles[0].name,
                code: roles[0].code,
                permissions: roles[0].permissions?.map(p => p.name) || []
            });
        }
        
        // 测试创建新用户
        console.log('➕ 测试创建新用户...');
        try {
            const newUser = await userRepo.create({
                username: 'testuser',
                email: 'test@example.com',
                password: 'test123',
                nickname: '测试用户',
                status: 'active',
                profile: {
                    department: '测试部门',
                    position: '测试职位'
                }
            });
            console.log('✅ 新用户创建成功:', {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            });
            
            // 测试查找用户
            const foundUser = await userRepo.findById(newUser.id);
            console.log('🔍 查找用户结果:', foundUser ? '找到用户' : '未找到用户');
            
            // 清理测试数据
            console.log('🧹 清理测试数据...');
            await userRepo.delete(newUser.id);
            console.log('✅ 测试数据清理完成');
            
        } catch (error) {
            console.log('⚠️  创建用户测试失败:', error.message);
        }
        
        console.log('🎉 数据库测试完成！');
        
    } catch (error) {
        console.error('❌ 数据库测试失败:', error);
        process.exit(1);
    } finally {
        // 关闭数据库连接
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log('🔌 数据库连接已关闭');
        }
    }
}

// 运行测试
testDatabase().catch(console.error);
EOF

echo "🔍 运行数据库测试..."
ts-node test-database.ts

# 清理测试文件
rm -f test-database.ts

echo "✅ 数据库测试完成！"