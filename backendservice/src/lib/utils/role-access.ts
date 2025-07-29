import { DB_ACTIONS, RESOURCES, ROLE_ACCESS, USER_ROLES } from '../enum';

export const hasUserAccess = (role: USER_ROLES, resource: RESOURCES, action: DB_ACTIONS) => {
  return ROLE_ACCESS[role][resource]?.includes(action);
};
