import { Module } from "@nestjs/common";
import { SkillDemonstrationSweepService } from "./skill-demonstration-sweep.service";
import { SkillsController } from "./skills.controller";
import { SkillsService } from "./skills.service";

@Module({
  controllers: [SkillsController],
  providers: [SkillsService, SkillDemonstrationSweepService],
  exports: [SkillsService],
})
export class SkillsModule {}
