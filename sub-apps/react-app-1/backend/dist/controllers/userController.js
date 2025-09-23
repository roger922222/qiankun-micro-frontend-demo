"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportUsers = exports.importUsers = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getUsers = void 0;
const userService_1 = require("../services/userService");
const importExportService_1 = require("../services/importExportService");
const error_1 = require("../middleware/error");
const userService = new userService_1.UserService();
const importExportService = new importExportService_1.ImportExportService();
const getUsers = async (req, res) => {
    try {
        const params = {
            page: parseInt(req.query.page) || 1,
            pageSize: parseInt(req.query.pageSize) || 20,
            keyword: req.query.keyword,
            status: req.query.status,
            role: req.query.role,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder || 'desc',
        };
        const result = await userService.getUsers(params);
        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    }
    catch (error) {
        if (error instanceof error_1.ValidationError) {
            res.status(400).json({ success: false, message: error.message });
        }
        else {
            res.status(500).json({ success: false, message: '服务器内部错误' });
        }
    }
};
exports.getUsers = getUsers;
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userService.getUserById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
};
exports.getUserById = getUserById;
const createUser = async (req, res) => {
    try {
        const userData = req.body;
        const newUser = await userService.createUser(userData);
        res.status(201).json({
            success: true,
            data: newUser,
            message: '用户创建成功'
        });
    }
    catch (error) {
        if (error instanceof error_1.ValidationError) {
            res.status(400).json({ success: false, message: error.message });
        }
        else {
            res.status(500).json({ success: false, message: '服务器内部错误' });
        }
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userData = req.body;
        const updatedUser = await userService.updateUser(id, userData);
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        res.json({
            success: true,
            data: updatedUser,
            message: '用户更新成功'
        });
    }
    catch (error) {
        if (error instanceof error_1.ValidationError) {
            res.status(400).json({ success: false, message: error.message });
        }
        else {
            res.status(500).json({ success: false, message: '服务器内部错误' });
        }
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await userService.deleteUser(id);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        res.json({
            success: true,
            message: '用户删除成功'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
};
exports.deleteUser = deleteUser;
const importUsers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '请上传文件'
            });
        }
        const result = await importExportService.importUsersFromExcel(req.file.buffer);
        res.json({
            success: true,
            data: result,
            message: '用户导入成功'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '导入失败' });
    }
};
exports.importUsers = importUsers;
const exportUsers = async (req, res) => {
    try {
        const params = {
            keyword: req.query.keyword,
            status: req.query.status,
            role: req.query.role,
        };
        const buffer = await importExportService.exportUsersToExcel(params);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
        res.send(buffer);
    }
    catch (error) {
        res.status(500).json({ success: false, message: '导出失败' });
    }
};
exports.exportUsers = exportUsers;
//# sourceMappingURL=userController.js.map