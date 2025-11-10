/// <reference types="node" />
/// <reference types="node" />
import { UserRepository } from '../repositories/userRepository';
export declare class ImportExportService {
    private userRepository;
    constructor(userRepository?: UserRepository);
    importUsersFromExcel(buffer: Buffer): Promise<{
        success: number;
        failed: number;
        errors: string[];
        data: any[];
    }>;
    exportUsersToExcel(params: any): Promise<Buffer>;
    private getStatusLabel;
}
//# sourceMappingURL=importExportService.d.ts.map