"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
exports.userRoutes = router;
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        }
        else {
            cb(new Error('只支持Excel文件'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
// 用户管理路由
router.get('/', userController_1.getUsers);
router.get('/:id', userController_1.getUserById);
router.post('/', userController_1.createUser);
router.put('/:id', userController_1.updateUser);
router.delete('/:id', userController_1.deleteUser);
// 导入导出
router.post('/import', upload.single('file'), userController_1.importUsers);
router.get('/export', userController_1.exportUsers);
//# sourceMappingURL=users.js.map