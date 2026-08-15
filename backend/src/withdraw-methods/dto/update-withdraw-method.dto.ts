import { PartialType } from '@nestjs/swagger';
import { CreateWithdrawMethodDto } from './create-withdraw-method.dto';

export class UpdateWithdrawMethodDto extends PartialType(CreateWithdrawMethodDto) {}
