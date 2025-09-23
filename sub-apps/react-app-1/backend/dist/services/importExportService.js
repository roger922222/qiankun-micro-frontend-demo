"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportExportService = void 0;
const XLSX = __importStar(require("xlsx"));
const userRepository_1 = require("../repositories/userRepository");
const error_1 = require("../middleware/error");
class ImportExportService {
    constructor(userRepository = new userRepository_1.UserRepository()) {
        this.userRepository = userRepository;
    }
    async importUsersFromExcel(buffer) {
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            const results = {
                success: 0,
                failed: 0,
                errors: [],
                data: [],
            };
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                const rowNumber = i + 2; // Excel行号从2开始
                try {
                    // 验证必填字段
                    if (!row.username || !row.email) {
                        results.errors.push(`第${rowNumber}行：用户名和邮箱不能为空`);
                        results.failed++;
                        continue;
                    }
                    // 验证邮箱格式
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(row.email)) {
                        results.errors.push(`第${rowNumber}行：邮箱格式不正确`);
                        results.failed++;
                        continue;
                    }
                    // 检查用户名和邮箱唯一性
                    const existingUser = await this.userRepository.findByUsernameOrEmail(row.username, row.email);
                    if (existingUser) {
                        results.errors.push(`第${rowNumber}行：用户名或邮箱已存在`);
                        results.failed++;
                        continue;
                    }
                    // 创建用户数据
                    const userData = {
                        username: row.username,
                        email: row.email,
                        password: row.password || '123456',
                        phone: row.phone || undefined,
                        nickname: row.nickname || undefined,
                        status: row.status || 'active',
                        roles: [],
                        permissions: [],
                        profile: {
                            department: row.department || undefined,
                            position: row.position || undefined,
                            location: row.location || undefined,
                            bio: row.bio || undefined,
                        },
                    };
                    await this.userRepository.create(userData);
                    results.success++;
                    results.data.push(userData);
                }
                catch (error) {
                    results.errors.push(`第${rowNumber}行：${error instanceof Error ? error.message : '未知错误'}`);
                    results.failed++;
                }
            }
            return results;
        }
        catch (error) {
            throw new error_1.ValidationError('Excel文件解析失败');
        }
    }
    async exportUsersToExcel(params) {
        const users = await this.userRepository.findAll();
        // 应用筛选条件
        let filteredUsers = users;
        if (params.keyword) {
            filteredUsers = filteredUsers.filter(user => user.username.toLowerCase().includes(params.keyword.toLowerCase()) ||
                user.email.toLowerCase().includes(params.keyword.toLowerCase()) ||
                (user.nickname && user.nickname.toLowerCase().includes(params.keyword.toLowerCase())));
        }
        if (params.status && params.status !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.status === params.status);
        }
        if (params.role) {
            filteredUsers = filteredUsers.filter(user => user.roles.some(r => r.code === params.role));
        }
        // 准备Excel数据
        const excelData = filteredUsers.map(user => ({
            '用户名': user.username,
            '邮箱': user.email,
            '昵称': user.nickname || '',
            '手机号': user.phone || '',
            '状态': this.getStatusLabel(user.status),
            '角色': user.roles.map(role => role.name).join(', '),
            '部门': user.profile?.department || '',
            '职位': user.profile?.position || '',
            '最后登录': user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '',
            '创建时间': new Date(user.createdAt).toLocaleString('zh-CN'),
        }));
        // 创建工作簿
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '用户列表');
        // 设置列宽
        const colWidths = [
            { wch: 15 },
            { wch: 25 },
            { wch: 15 },
            { wch: 15 },
            { wch: 10 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 20 },
            { wch: 20 }, // 创建时间
        ];
        worksheet['!cols'] = colWidths;
        // 生成Excel文件
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        return Buffer.from(excelBuffer);
    }
    getStatusLabel(status) {
        const statusMap = {
            'active': '正常',
            'inactive': '禁用',
            'suspended': '锁定',
            'pending': '待审核',
        };
        return statusMap[status] || status;
    }
}
exports.ImportExportService = ImportExportService;
//# sourceMappingURL=importExportService.js.map