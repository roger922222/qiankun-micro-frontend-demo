export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
} as const;

export const USER_STATUS_LABELS = {
  [USER_STATUS.ACTIVE]: '正常',
  [USER_STATUS.INACTIVE]: '禁用',
  [USER_STATUS.SUSPENDED]: '锁定',
  [USER_STATUS.PENDING]: '待审核',
} as const;

export const USER_STATUS_COLORS = {
  [USER_STATUS.ACTIVE]: 'green',
  [USER_STATUS.INACTIVE]: 'gray',
  [USER_STATUS.SUSPENDED]: 'red',
  [USER_STATUS.PENDING]: 'orange',
} as const;

export const ROLE_LEVELS = {
  SUPER_ADMIN: 999,
  ADMIN: 100,
  USER: 1,
} as const;

export const PERMISSIONS = {
  USER_MANAGE: 'USER_MANAGE',
  ROLE_MANAGE: 'ROLE_MANAGE',
  PERMISSION_MANAGE: 'PERMISSION_MANAGE',
  LOG_VIEW: 'LOG_VIEW',
} as const;

export const OPERATION_LOG_ACTIONS = {
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  CREATE_ROLE: 'CREATE_ROLE',
  UPDATE_ROLE: 'UPDATE_ROLE',
  DELETE_ROLE: 'DELETE_ROLE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
} as const;