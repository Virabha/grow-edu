# 25 - Grading queue

**What to build:** One ordered, stateful queue of every ungraded submission across all of an instructor's batches, allowing them to work through it without returning to a list, and holding partial work if they stop.

Grading two hundred submissions is only viable if it is a sitting rather than a navigation exercise.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] The queue spans every batch the instructor teaches, not one
- [ ] Advancing returns the next ungraded item without a list round trip
- [ ] Partial grading is retained if the instructor stops and returns
- [ ] A graded item leaves the queue
- [ ] An instructor cannot see submissions from a batch they do not teach
