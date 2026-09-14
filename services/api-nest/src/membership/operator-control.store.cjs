/**
 * 런타임 권위는 persist provider.
 * 프로세스 메모리 singleton 은 더 이상 내보내지 않는다.
 * 실참여/effective 가 이 파일을 메모리 draft 로 읽으면 회귀다.
 */

"use strict";

const provider = require("./operator-control.provider.cjs");

module.exports = {
  PROVIDER_KIND: provider.PROVIDER_KIND,
  createTestMemoryProvider: provider.createTestMemoryProvider,
  createRuntimePersistProvider: provider.createRuntimePersistProvider,
  projectRuntimeParticipateQuota: provider.projectRuntimeParticipateQuota,
};
