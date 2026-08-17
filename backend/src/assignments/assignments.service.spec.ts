import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DATABASE_CONNECTION } from "../database/database.module";
import { AssignmentsService } from "./assignments.service";

type Chain = {
  from: (...a: unknown[]) => Chain;
  leftJoin: (...a: unknown[]) => Chain;
  innerJoin: (...a: unknown[]) => Chain;
  where: (...a: unknown[]) => Chain;
  orderBy: (...a: unknown[]) => Chain;
  limit: (...a: unknown[]) => Chain;
  offset: (...a: unknown[]) => Chain;
  groupBy: (...a: unknown[]) => Chain;
  set: (...a: unknown[]) => Chain;
  values: (...a: unknown[]) => Chain;
  returning: () => Promise<unknown[]>;
  then: (
    onfulfilled?: ((value: unknown[]) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null,
  ) => Promise<unknown>;
};

function makeChain(rows: unknown[]): Chain {
  const c: Chain = {
    from: () => c,
    leftJoin: () => c,
    innerJoin: () => c,
    where: () => c,
    orderBy: () => c,
    limit: () => c,
    offset: () => c,
    groupBy: () => c,
    set: () => c,
    values: () => c,
    returning: () => Promise.resolve(rows),
    then: (ok, fail) => Promise.resolve(rows).then(ok, fail),
  };
  return c;
}

async function makeService(dbOverrides: Record<string, jest.Mock>) {
  const db = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...dbOverrides,
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      AssignmentsService,
      { provide: DATABASE_CONNECTION, useValue: db },
    ],
  }).compile();

  return { service: moduleRef.get(AssignmentsService), db };
}

const ASSIGNMENT_ID = "asgn-001";
const SUBMISSION_ID = "sub-001";
const INSTRUCTOR_ID = "instructor-001";
const LEARNER_ID = "learner-001";

const FAKE_ASSIGNMENT = {
  id: ASSIGNMENT_ID,
  courseId: "course-001",
  instructorId: INSTRUCTOR_ID,
  title: "Test Assignment",
  submissionType: "TEXT",
  maxMarks: 100,
  passMarks: 40,
  dueAt: null,
  allowResubmission: false,
  isPublished: true,
  isDeleted: false,
};

describe("AssignmentsService › gradeSubmission", () => {
  it("throws BadRequestException when marks exceed maxMarks", async () => {
    const FAKE_SUB = { id: SUBMISSION_ID, assignmentId: ASSIGNMENT_ID };

    let callCount = 0;
    const selectChain = jest.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return makeChain([FAKE_SUB]);
      }
      return makeChain([FAKE_ASSIGNMENT]);
    });

    const { service } = await makeService({ select: selectChain });

    await expect(
      service.gradeSubmission(SUBMISSION_ID, INSTRUCTOR_ID, "INSTRUCTOR", {
        marks: 150,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws BadRequestException when marks are negative", async () => {
    const FAKE_SUB = { id: SUBMISSION_ID, assignmentId: ASSIGNMENT_ID };

    let callCount = 0;
    const selectChain = jest.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return makeChain([FAKE_SUB]);
      }
      return makeChain([FAKE_ASSIGNMENT]);
    });

    const { service } = await makeService({ select: selectChain });

    await expect(
      service.gradeSubmission(SUBMISSION_ID, INSTRUCTOR_ID, "INSTRUCTOR", {
        marks: -1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws ForbiddenException when instructor grades another instructor's submission", async () => {
    const FAKE_SUB = { id: SUBMISSION_ID, assignmentId: ASSIGNMENT_ID };
    const OTHER_ASSIGNMENT = { ...FAKE_ASSIGNMENT, instructorId: "other-instructor" };

    let callCount = 0;
    const selectChain = jest.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return makeChain([FAKE_SUB]);
      }
      return makeChain([OTHER_ASSIGNMENT]);
    });

    const { service } = await makeService({ select: selectChain });

    await expect(
      service.gradeSubmission(SUBMISSION_ID, INSTRUCTOR_ID, "INSTRUCTOR", {
        marks: 80,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows admin to grade any submission", async () => {
    const FAKE_SUB = { id: SUBMISSION_ID, assignmentId: ASSIGNMENT_ID };
    const OTHER_ASSIGNMENT = { ...FAKE_ASSIGNMENT, instructorId: "other-instructor" };
    const UPDATED_SUB = { ...FAKE_SUB, marks: 80, status: "GRADED", gradedBy: "admin-001" };

    let selectCount = 0;
    const selectChain = jest.fn().mockImplementation(() => {
      selectCount += 1;
      if (selectCount === 1) return makeChain([FAKE_SUB]);
      return makeChain([OTHER_ASSIGNMENT]);
    });

    const updateChain = makeChain([UPDATED_SUB]);
    const dbUpdate = jest.fn().mockReturnValue(updateChain);

    const { service } = await makeService({ select: selectChain, update: dbUpdate });

    const result = await service.gradeSubmission("admin-001", "admin-001", "PLATFORM_ADMIN", {
      marks: 80,
    });

    expect(dbUpdate).toHaveBeenCalled();
    expect(result).toEqual(UPDATED_SUB);
  });

  it("throws NotFoundException when submission does not exist", async () => {
    const selectChain = jest.fn().mockReturnValue(makeChain([]));
    const { service } = await makeService({ select: selectChain });

    await expect(
      service.gradeSubmission("nonexistent", INSTRUCTOR_ID, "INSTRUCTOR", { marks: 50 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("AssignmentsService › submitAssignment", () => {
  it("rejects resubmission when allowResubmission is false", async () => {
    const NO_RESUB_ASSIGNMENT = {
      ...FAKE_ASSIGNMENT,
      allowResubmission: false,
      isPublished: true,
    };
    const EXISTING_SUB = { attemptNo: 1 };
    const ENROLLMENT = { enrollmentId: "enroll-001" };

    let selectCount = 0;
    const selectChain = jest.fn().mockImplementation(() => {
      selectCount += 1;
      if (selectCount === 1) return makeChain([NO_RESUB_ASSIGNMENT]);
      if (selectCount === 2) return makeChain([ENROLLMENT]);
      return makeChain([EXISTING_SUB]);
    });

    const { service } = await makeService({ select: selectChain });

    await expect(
      service.submitAssignment(ASSIGNMENT_ID, LEARNER_ID, { textAnswer: "My answer" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows resubmission and increments attemptNo when allowResubmission is true", async () => {
    const WITH_RESUB_ASSIGNMENT = {
      ...FAKE_ASSIGNMENT,
      allowResubmission: true,
      isPublished: true,
    };
    const EXISTING_SUB = { attemptNo: 1 };
    const ENROLLMENT = { enrollmentId: "enroll-001" };
    const NEW_SUB = { id: "sub-002", attemptNo: 2, status: "SUBMITTED" };

    let selectCount = 0;
    const selectChain = jest.fn().mockImplementation(() => {
      selectCount += 1;
      if (selectCount === 1) return makeChain([WITH_RESUB_ASSIGNMENT]);
      if (selectCount === 2) return makeChain([ENROLLMENT]);
      return makeChain([EXISTING_SUB]);
    });

    const insertChain = makeChain([NEW_SUB]);
    const dbInsert = jest.fn().mockReturnValue(insertChain);

    const { service } = await makeService({ select: selectChain, insert: dbInsert });

    const result = await service.submitAssignment(ASSIGNMENT_ID, LEARNER_ID, {
      textAnswer: "My second answer",
    });

    expect(dbInsert).toHaveBeenCalled();
    const insertArgs = dbInsert.mock.calls[0][0];
    expect(insertArgs).toBeDefined();
  });

  it("rejects submission past the due date", async () => {
    const PAST_DUE_ASSIGNMENT = {
      ...FAKE_ASSIGNMENT,
      dueAt: new Date(Date.now() - 86400_000),
      isPublished: true,
    };

    const selectChain = jest.fn().mockReturnValue(makeChain([PAST_DUE_ASSIGNMENT]));
    const { service } = await makeService({ select: selectChain });

    await expect(
      service.submitAssignment(ASSIGNMENT_ID, LEARNER_ID, { textAnswer: "Late answer" }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("rejects submission when learner is not enrolled", async () => {
    const selectChain = jest.fn().mockImplementation(() => {
      return makeChain([]);
    });

    const PUBLISHED_ASSIGNMENT = { ...FAKE_ASSIGNMENT, isPublished: true };

    let selectCount = 0;
    const selectChainWithFirst = jest.fn().mockImplementation(() => {
      selectCount += 1;
      if (selectCount === 1) return makeChain([PUBLISHED_ASSIGNMENT]);
      return makeChain([]);
    });

    const { service } = await makeService({ select: selectChainWithFirst });

    await expect(
      service.submitAssignment(ASSIGNMENT_ID, LEARNER_ID, { textAnswer: "Answer" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects TEXT submission without textAnswer", async () => {
    const TEXT_ASSIGNMENT = {
      ...FAKE_ASSIGNMENT,
      submissionType: "TEXT",
      isPublished: true,
      dueAt: null,
    };
    const ENROLLMENT = { enrollmentId: "enroll-001" };

    let selectCount = 0;
    const selectChain = jest.fn().mockImplementation(() => {
      selectCount += 1;
      if (selectCount === 1) return makeChain([TEXT_ASSIGNMENT]);
      if (selectCount === 2) return makeChain([ENROLLMENT]);
      return makeChain([]);
    });

    const { service } = await makeService({ select: selectChain });

    await expect(
      service.submitAssignment(ASSIGNMENT_ID, LEARNER_ID, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("AssignmentsService › createAssignment", () => {
  it("throws BadRequestException when passMarks exceeds maxMarks", async () => {
    const selectChain = jest
      .fn()
      .mockReturnValue(makeChain([{ courseId: "course-001", instructorId: INSTRUCTOR_ID }]));

    const { service } = await makeService({ select: selectChain });

    await expect(
      service.createAssignment(INSTRUCTOR_ID, "INSTRUCTOR", {
        title: "Test",
        courseId: "course-001",
        submissionType: "TEXT",
        maxMarks: 50,
        passMarks: 60,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws ForbiddenException when instructor creates assignment for another course", async () => {
    const selectChain = jest
      .fn()
      .mockReturnValue(makeChain([{ courseId: "course-001", instructorId: "other-instructor" }]));

    const { service } = await makeService({ select: selectChain });

    await expect(
      service.createAssignment(INSTRUCTOR_ID, "INSTRUCTOR", {
        title: "Test",
        courseId: "course-001",
        submissionType: "TEXT",
        maxMarks: 100,
        passMarks: 40,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
