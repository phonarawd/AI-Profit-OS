export const MINING_USER_ROUTES = {
  mines: "api/v1/mines",
  mine: "api/v1/mines/:mineId",
  summary: "api/v1/mining/me/summary",
  positions: "api/v1/mining/me/positions",
  position: "api/v1/mining/me/positions/:positionId",
  settlements: "api/v1/mining/me/settlements",
  start: "api/v1/mining/positions/start",
  increase: "api/v1/mining/positions/:positionId/increase",
  decrease: "api/v1/mining/positions/:positionId/decrease",
  end: "api/v1/mining/positions/:positionId/end",
} as const;
