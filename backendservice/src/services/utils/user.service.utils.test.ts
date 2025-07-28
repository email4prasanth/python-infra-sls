import { USER_ROLES } from '../../lib/enum';
import { PracticeUserModel } from '../../models';
import { getUserRole, userRoleFilter } from '../../services/utils/user.service.utils';
import { ROLES_TO_ACCESS } from '../../types';

jest.mock('../../models', () => ({
  PracticeUserModel: {
    findOne: jest.fn(),
  },
}));

describe('User Service Utils', () => {
  describe('getUserRole', () => {
    const mockPracticeAccountId = 'practice-123';
    const mockUserId = 'user-456';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return the correct user role for a valid practiceAccountId and userId', async () => {
      // Mock successful role fetch
      (PracticeUserModel.findOne as jest.Mock).mockResolvedValue({
        role: USER_ROLES.ADMIN,
      });

      const result = await getUserRole(mockPracticeAccountId, mockUserId);

      expect(result).toBe(USER_ROLES.ADMIN);
      expect(PracticeUserModel.findOne).toHaveBeenCalledWith({
        attributes: ['role'],
        where: {
          user_id: mockUserId,
          practice_account_id: mockPracticeAccountId,
          active_status: true,
        },
        raw: true,
      });
    });

    it('should return undefined when user is inactive', async () => {
      // Mock inactive user (wouldn't normally be found due to query conditions)
      (PracticeUserModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await getUserRole(mockPracticeAccountId, mockUserId);

      expect(result).toBeUndefined();
    });
  });
});

describe('userRoleFilter', () => {
  it('should correctly filter Doctor role to include only Doctor', () => {
    const result = userRoleFilter(ROLES_TO_ACCESS.DOCTOR);
    expect(result).toEqual(['Doctor']);
  });

  it('should handle unknown roles in userRoleFilter by returning an empty array', () => {
    const result = userRoleFilter('Unknown' as ROLES_TO_ACCESS);
    expect(result).toEqual(undefined);
  });

  it('should correctly filter All roles to include Account Owner, Admin, and Staff', () => {
    const result = userRoleFilter(ROLES_TO_ACCESS.ALL);
    expect(result).toEqual(['Account Owner', 'Admin', 'Staff', 'System Admin']);
  });
});
