import { User } from '../../auth/types';
export interface UpdateProfileDto {
    firstName?: string;
    lastName?: string;
}
export type ProfileUser = User;
