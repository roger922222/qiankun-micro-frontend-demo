import { Request, Response } from 'express';
export declare const getUsers: (req: Request, res: Response) => Promise<void>;
export declare const getUserById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createUser: (req: Request, res: Response) => Promise<void>;
export declare const updateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const importUsers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const exportUsers: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=userController.d.ts.map