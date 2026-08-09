/** Phase0 in-process AI / shadow events */

export const AI_EVENTS = {
  logAppended: "ai.log.appended",
  pickScored: "ai.pick.scored",
  evalCompleted: "ai.eval.completed",
  analysis: "ai.analysis.completed",
  coachAnswerCompleted: "coach.answer.completed",
} as const;

export const SHADOW_REPLAY_EVENTS = {
  completed: "shadow.replay.completed",
  failed: "shadow.replay.failed",
} as const;
