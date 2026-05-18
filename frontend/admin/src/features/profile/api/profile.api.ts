import { UpdateProfileDto, ProfileUser } from '../types';
import { usersApi } from '../../users/api/users.api';
export const profileApi = {
    async getProfile(userId: string): Promise<ProfileUser> {
        return usersApi.getById(userId);
    },
    async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileUser> {
        return usersApi.update(userId, dto);
    },
};
