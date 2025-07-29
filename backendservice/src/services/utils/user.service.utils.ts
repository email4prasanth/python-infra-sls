import { USER_ROLES } from '../../lib/enum';
import { PracticeUserModel } from '../../models';
import { ROLES_TO_ACCESS } from '../../types';

export const getUserRole = async (practiceAccountId: string, userId: string): Promise<USER_ROLES> => {
  const userRole = (await PracticeUserModel.findOne({
    attributes: ['role'],
    where: {
      user_id: userId,
      practice_account_id: practiceAccountId,
      active_status: true,
    },
    raw: true,
  })) as unknown as { role: USER_ROLES };

  return userRole?.role;
};

export const userRoleFilter = (role: ROLES_TO_ACCESS) => {
  const mapFunction: { [key: string]: string[] } = {
    ['All']: ['Account Owner', 'Admin', 'Staff', 'System Admin'],
    ['Doctor']: ['Doctor'],
  };
  return mapFunction[role];
};
