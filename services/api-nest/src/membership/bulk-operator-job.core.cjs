/**
 * 일괄 작업 dry-run / 상태 조회 (B01–B06).
 * 프론트 현재 페이지를 전체로 취급하지 않음. 실 effect 없음.
 */

"use strict";

function createBulkJobStore() {
  return { jobs: Object.create(null), next: 1 };
}

function previewBulkTargets(input) {
  if (input.useCurrentPageAsAll === true) {
    const err = new Error("current page is not the full target set");
    err.code = "PAGE_IS_NOT_ALL";
    throw err;
  }
  const ids = Array.isArray(input.userIds) ? input.userIds.slice() : [];
  const cap = Number(input.maxTargets || 500);
  if (ids.length > cap) {
    const err = new Error("bulk target cap exceeded");
    err.code = "TARGET_CAP";
    throw err;
  }
  return {
    count: ids.length,
    userIds: ids,
    excluded: Array.isArray(input.excluded) ? input.excluded : [],
    dynamicGroupMayDrift: input.groupType === "dynamic",
    requiresReapprovalIfTargetsChange: input.groupType === "dynamic",
    effect: 0,
  };
}

function dryRunBulkJob(store, input) {
  const targets = previewBulkTargets(input);
  const jobId = `bulk_${store.next++}`;
  const job = {
    jobId,
    status: "dry_run",
    action: String(input.action || ""),
    revision: Number(input.revision || 1),
    targets,
    makerId: String(input.makerId || ""),
    checkerId: String(input.checkerId || ""),
    createdAt: new Date().toISOString(),
    appliedCount: 0,
    ledgerMutated: false,
  };
  if (job.makerId && job.checkerId && job.makerId === job.checkerId) {
    job.status = "blocked";
    job.blockedReason = "MAKER_EQUALS_CHECKER";
  }
  store.jobs[jobId] = job;
  return { ...job };
}

function getBulkJob(store, jobId) {
  const job = store.jobs[jobId];
  if (!job) {
    return { status: "unknown", jobId, lastCheckedAt: new Date().toISOString() };
  }
  return { ...job, lastCheckedAt: new Date().toISOString() };
}

module.exports = {
  createBulkJobStore,
  previewBulkTargets,
  dryRunBulkJob,
  getBulkJob,
};
