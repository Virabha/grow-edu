import { PartialType } from '@nestjs/mapped-types';
import { CreateWithdrawMethodDto } from './create-withdraw-method.dto';

export class UpdateWithdrawMethodDto extends PartialType(CreateWithdrawMethodDto) {}
