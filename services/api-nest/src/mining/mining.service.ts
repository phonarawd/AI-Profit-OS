import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PostgresService } from "../db/postgres";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import { addAmount, assertAmountUsdt, cmpAmount, subAmount } from "../ledger/ledger.money";
import { MiningProfitEngineService } from "./mining-profit-engine.service";

type EventType = "START" | "INCREASE" | "DECREASE" | "END";
type Position = { id:string; user_id:string; mine_id:string; status:string; principal_usdt:string; requested_principal_usdt:string; started_at:Date|null; ended_at:Date|null };

@Injectable()
export class MiningService {
  private readonly mutationTails = new Map<string, Promise<void>>();
  constructor(private readonly db: PostgresService, private readonly ledger: LedgerPostingService, private readonly engine: MiningProfitEngineService) {}

  async listMines() {
    const r=await this.db.query(`SELECT m.id,m.code,m.display_name,m.description,m.asset_code,m.status,m.principal_currency,m.min_position_usdt::text,m.max_position_usdt::text,m.metadata,m.published_at,
      rv.id rate_version_id,rv.daily_rate::text,rv.effective_at
      FROM public.mines m LEFT JOIN public.mine_rate_versions rv ON rv.mine_id=m.id AND rv.status='ACTIVE'
      WHERE m.published_at IS NOT NULL AND m.status IN ('ACTIVE','NEW_POSITIONS_PAUSED','PAUSED') ORDER BY m.display_order,m.id`);
    return r.rows.map(this.mineView);
  }
  async getMine(id:string) {
    const r=await this.db.query(`SELECT m.id,m.code,m.display_name,m.description,m.asset_code,m.status,m.principal_currency,m.min_position_usdt::text,m.max_position_usdt::text,m.metadata,m.published_at,
      rv.id rate_version_id,rv.daily_rate::text,rv.effective_at FROM public.mines m LEFT JOIN public.mine_rate_versions rv ON rv.mine_id=m.id AND rv.status='ACTIVE'
      WHERE m.id=$1 AND m.published_at IS NOT NULL`,[id]);
    if(!r.rows[0]) throw new NotFoundException("MINE_NOT_FOUND"); return this.mineView(r.rows[0]);
  }
  async summary(userId:string) {
    const r=await this.db.query<{principal:string;profit:string;today:string;active:string}>(`SELECT
      COALESCE((SELECT sum(principal_usdt)::text FROM public.mine_positions WHERE user_id=$1 AND status<>'ENDED'),'0') principal,
      COALESCE((SELECT sum(credited_profit_usdt)::text FROM public.mine_settlements WHERE user_id=$1 AND status='LEDGER_POSTED'),'0') profit,
      COALESCE((SELECT sum(credited_profit_usdt)::text FROM public.mine_settlements WHERE user_id=$1 AND status='LEDGER_POSTED' AND period_end>=date_trunc('day',now())),'0') today,
      (SELECT count(*)::text FROM public.mine_positions WHERE user_id=$1 AND status<>'ENDED') active`,[userId]);
    const x=r.rows[0]; return { activePrincipalUsdt:x.principal,totalSettledProfitUsdt:x.profit,todaySettledProfitUsdt:x.today,activePositionCount:Number(x.active) };
  }
  async listPositions(userId:string) { const r=await this.db.query(`SELECT p.*,m.display_name,m.code FROM public.mine_positions p JOIN public.mines m ON m.id=p.mine_id WHERE p.user_id=$1 ORDER BY p.created_at DESC`,[userId]); return r.rows.map(this.positionView); }
  async getPosition(userId:string,id:string) { const r=await this.db.query(`SELECT p.*,m.display_name,m.code FROM public.mine_positions p JOIN public.mines m ON m.id=p.mine_id WHERE p.id=$1 AND p.user_id=$2`,[id,userId]); if(!r.rows[0]) throw new NotFoundException("POSITION_NOT_FOUND"); return this.positionView(r.rows[0]); }
  async listSettlements(userId:string) { const r=await this.db.query(`SELECT s.*,m.display_name,m.code FROM public.mine_settlements s JOIN public.mines m ON m.id=s.mine_id WHERE s.user_id=$1 ORDER BY s.period_end DESC,s.id DESC`,[userId]); return r.rows.map((x:any)=>({id:x.id,positionId:x.position_id,mineId:x.mine_id,mineName:x.display_name,status:x.status,periodStart:x.period_start,periodEnd:x.period_end,calculatedProfitUsdt:x.calculated_profit_usdt,creditedProfitUsdt:x.credited_profit_usdt,createdAt:x.created_at})); }

  async start(userId:string,mineId:string,rawAmount:string,key:string) {
    return this.withMutationLock(`start:${userId}:${mineId}`, () => this.startLocked(userId,mineId,rawAmount,key));
  }

  private async startLocked(userId:string,mineId:string,rawAmount:string,key:string) {
    const amount=this.mutationInput(rawAmount,key); const mine=await this.lockableMine(mineId);
    if(mine.status!=="ACTIVE") throw new ConflictException("MINE_NOT_ACCEPTING_POSITIONS"); this.assertBounds(amount,mine.min,mine.max);
    let p=(await this.db.query<Position>(`SELECT id,user_id,mine_id,status,principal_usdt::text,requested_principal_usdt::text,started_at,ended_at FROM public.mine_positions WHERE start_idempotency_key=$1`,[key])).rows[0];
    if(p && (p.user_id!==userId || p.mine_id!==mineId || cmpAmount(p.requested_principal_usdt,amount)!==0)) throw new ConflictException("IDEMPOTENCY_KEY_REUSED");
    if(!p){ try { p=(await this.db.query<Position>(`INSERT INTO public.mine_positions(user_id,mine_id,requested_principal_usdt,start_idempotency_key) VALUES($1,$2,$3::numeric,$4) RETURNING id,user_id,mine_id,status,principal_usdt::text,requested_principal_usdt::text,started_at,ended_at`,[userId,mineId,amount,key])).rows[0]; } catch(e){ if(this.pgCode(e)!=="23505") throw e; throw new ConflictException("POSITION_ALREADY_OPEN"); } }
    if(p.status==="ACTIVE") return this.getPosition(userId,p.id);
    const journal=await this.ledger.postJournal({idempotencyKey:`mine:start:${key}`,journalType:"mine_position_lock",referenceType:"mine_position",referenceId:p.id,createdBy:userId,lines:[{account:{userId,bucket:"principal"},direction:"debit",amountUsdt:amount},{account:{userId,bucket:"locked"},direction:"credit",amountUsdt:amount}]});
    await this.finalizeEvent(p,"START",amount,key,journal.id); return this.getPosition(userId,p.id);
  }

  async change(userId:string,id:string,type:Exclude<EventType,"START">,rawAmount:string|null,key:string) {
    return this.withMutationLock(`position:${id}`, () => this.changeLocked(userId,id,type,rawAmount,key));
  }

  private async changeLocked(userId:string,id:string,type:Exclude<EventType,"START">,rawAmount:string|null,key:string) {
    if(!key || key.length<8) throw new BadRequestException("IDEMPOTENCY_KEY_REQUIRED");
    const existing=await this.db.query(`SELECT position_id,event_type,amount_usdt::text FROM public.mine_position_events WHERE idempotency_key=$1`,[key]);
    if(existing.rows[0]) { const e:any=existing.rows[0]; if(e.position_id!==id||e.event_type!==type||(rawAmount!==null&&cmpAmount(e.amount_usdt,assertAmountUsdt(rawAmount))!==0)) throw new ConflictException("IDEMPOTENCY_KEY_REUSED"); return this.getPosition(userId,id); }
    const p=await this.positionForUser(userId,id); if(p.status!=="ACTIVE") throw new ConflictException("POSITION_NOT_ACTIVE");
    const amount=type==="END"?p.principal_usdt:this.mutationInput(rawAmount??"",key);
    if(type==="DECREASE"&&cmpAmount(amount,p.principal_usdt)>=0) throw new BadRequestException("USE_END_FOR_FULL_AMOUNT");
    if(type==="INCREASE"){ const m=await this.lockableMine(p.mine_id); if(m.status!=="ACTIVE") throw new ConflictException("MINE_NOT_ACCEPTING_POSITIONS"); this.assertBounds(addAmount(p.principal_usdt,amount),m.min,m.max); }
    const unlock=type!=="INCREASE"; const journal=await this.ledger.postJournal({idempotencyKey:`mine:${type.toLowerCase()}:${key}`,journalType:unlock?"mine_position_unlock":"mine_position_lock",referenceType:"mine_position",referenceId:id,createdBy:userId,lines:unlock?[{account:{userId,bucket:"locked"},direction:"debit",amountUsdt:amount},{account:{userId,bucket:"principal"},direction:"credit",amountUsdt:amount}]:[{account:{userId,bucket:"principal"},direction:"debit",amountUsdt:amount},{account:{userId,bucket:"locked"},direction:"credit",amountUsdt:amount}]});
    await this.finalizeEvent(p,type,amount,key,journal.id); return this.getPosition(userId,id);
  }

  async settle(positionId:string,start:Date,end:Date,key:string) {
    if(end<=start) throw new BadRequestException("INVALID_SETTLEMENT_WINDOW");
    const p=(await this.db.query<Position>(`SELECT id,user_id,mine_id,status,principal_usdt::text,requested_principal_usdt::text,started_at,ended_at FROM public.mine_positions WHERE id=$1`,[positionId])).rows[0]; if(!p) throw new NotFoundException("POSITION_NOT_FOUND");
    let s=(await this.db.query<any>(`INSERT INTO public.mine_settlements(position_id,user_id,mine_id,period_start,period_end,idempotency_key) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(position_id,period_start,period_end) DO UPDATE SET idempotency_key=public.mine_settlements.idempotency_key RETURNING *`,[p.id,p.user_id,p.mine_id,start,end,key])).rows[0];
    if(s.idempotency_key!==key) throw new ConflictException("SETTLEMENT_WINDOW_EXISTS"); if(s.status==="LEDGER_POSTED") return s;
    try {
      const segments=await this.segments(p,start,end); let total="0";
      for(const g of segments){ const out=await this.engine.calculate({principal:g.principal,dailyRate:g.rate,periodStartUnixMicros:this.micros(g.start),periodEndUnixMicros:this.micros(g.end)}); total=addAmount(total,out.accruedProfit); const fingerprint=createHash("sha256").update(`${p.id}|${g.rateId}|${g.start.toISOString()}|${g.end.toISOString()}|${g.principal}|${g.rate}|${out.calcVersion}`).digest("hex"); const a=await this.db.query<any>(`INSERT INTO public.mine_accruals(position_id,user_id,mine_id,rate_version_id,period_start,period_end,principal_usdt,daily_rate,accrued_profit_usdt,calc_version,calc_fingerprint) VALUES($1,$2,$3,$4,$5,$6,$7::numeric,$8::numeric,$9::numeric,$10,$11) ON CONFLICT(position_id,period_start,period_end,rate_version_id) DO UPDATE SET calc_fingerprint=public.mine_accruals.calc_fingerprint RETURNING id,accrued_profit_usdt::text`,[p.id,p.user_id,p.mine_id,g.rateId,g.start,g.end,g.principal,g.rate,out.accruedProfit,out.calcVersion,fingerprint]); if(cmpAmount(a.rows[0].accrued_profit_usdt,out.accruedProfit)!==0) throw new ConflictException("ACCRUAL_MISMATCH"); await this.db.query(`INSERT INTO public.mine_settlement_accruals(settlement_id,accrual_id,position_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,[s.id,a.rows[0].id,p.id]); }
      await this.db.query(`UPDATE public.mine_settlements SET status='CALCULATED',calculated_profit_usdt=$2::numeric,attempt_count=attempt_count+1,failure_code=NULL WHERE id=$1`,[s.id,total]);
      if(cmpAmount(total,"0")>0){ const j=await this.ledger.postJournal({idempotencyKey:`mine:settlement:${key}`,journalType:"mine_profit_settlement",referenceType:"mine_settlement",referenceId:s.id,createdBy:null,lines:[{account:{systemCode:"SYS:MINING_POOL"},direction:"debit",amountUsdt:total},{account:{userId:p.user_id,bucket:"profit"},direction:"credit",amountUsdt:total}]}); await this.db.query(`UPDATE public.mine_settlements SET status='LEDGER_POSTED',credited_profit_usdt=calculated_profit_usdt,ledger_journal_id=$2,failure_code=NULL WHERE id=$1 AND status<>'LEDGER_POSTED'`,[s.id,j.id]); }
    } catch(e){ await this.db.query(`UPDATE public.mine_settlements SET status='FAILED',attempt_count=attempt_count+1,failure_code=$2 WHERE id=$1 AND status<>'LEDGER_POSTED'`,[s.id,this.pgCode(e)??"SETTLEMENT_FAILED"]); throw e; }
    return (await this.db.query(`SELECT * FROM public.mine_settlements WHERE id=$1`,[s.id])).rows[0];
  }

  private async segments(p:Position,start:Date,end:Date){ const er=await this.db.query<any>(`SELECT effective_at,principal_after_usdt::text principal FROM public.mine_position_events WHERE position_id=$1 AND effective_at<=$3 ORDER BY effective_at`,[p.id,start,end]); const rr=await this.db.query<any>(`SELECT id,daily_rate::text rate,effective_at,ended_at FROM public.mine_rate_versions WHERE mine_id=$1 AND status IN('ACTIVE','ENDED') AND effective_at<$3 AND (ended_at IS NULL OR ended_at>$2) ORDER BY effective_at`,[p.mine_id,start,end]); const boundaries=[start,end,...er.rows.map(x=>new Date(x.effective_at)).filter(x=>x>start&&x<end),...rr.rows.flatMap(x=>[new Date(x.effective_at),x.ended_at?new Date(x.ended_at):null]).filter((x):x is Date=>!!x&&x>start&&x<end)].sort((a,b)=>a.getTime()-b.getTime()); const uniq=boundaries.filter((x,i)=>i===0||x.getTime()!==boundaries[i-1].getTime()); return uniq.slice(0,-1).map((a,i)=>{const b=uniq[i+1]; const ev=[...er.rows].reverse().find(x=>new Date(x.effective_at)<=a); const rate=[...rr.rows].reverse().find(x=>new Date(x.effective_at)<=a&&(!x.ended_at||new Date(x.ended_at)>a)); if(!ev||!rate) throw new ConflictException("SETTLEMENT_SEGMENT_MISSING"); return {start:a,end:b,principal:ev.principal,rate:rate.rate,rateId:rate.id};}); }
  private async finalizeEvent(p:Position,type:EventType,amount:string,key:string,journalId:string){ const before=p.principal_usdt; const after=type==="START"?amount:type==="INCREASE"?addAmount(before,amount):subAmount(before,amount); try { await this.db.withTransaction(async c=>{ await c.query(`SELECT id FROM public.mine_positions WHERE id=$1 FOR UPDATE`,[p.id]); await c.query(`INSERT INTO public.mine_position_events(position_id,event_type,amount_usdt,principal_before_usdt,principal_after_usdt,effective_at,ledger_journal_id,idempotency_key) VALUES($1,$2,$3::numeric,$4::numeric,$5::numeric,now(),$6,$7) ON CONFLICT(idempotency_key) DO NOTHING`,[p.id,type,amount,before,after,journalId,key]); await c.query(`UPDATE public.mine_positions SET status=$2,principal_usdt=$3::numeric,started_at=CASE WHEN $2='ACTIVE' THEN COALESCE(started_at,now()) ELSE started_at END,ended_at=CASE WHEN $2='ENDED' THEN now() ELSE ended_at END WHERE id=$1`,[p.id,type==="END"?"ENDED":"ACTIVE",after]); }); } catch(e){ if(this.pgCode(e)==="23505") throw new ConflictException("POSITION_CHANGED_CONCURRENTLY"); throw e; } }
  private async positionForUser(u:string,id:string){ const p=(await this.db.query<Position>(`SELECT id,user_id,mine_id,status,principal_usdt::text,requested_principal_usdt::text,started_at,ended_at FROM public.mine_positions WHERE id=$1 AND user_id=$2`,[id,u])).rows[0]; if(!p) throw new NotFoundException("POSITION_NOT_FOUND"); return p; }
  private async lockableMine(id:string){ const r=await this.db.query<any>(`SELECT id,status,min_position_usdt::text min,max_position_usdt::text max FROM public.mines WHERE id=$1 AND published_at IS NOT NULL`,[id]); if(!r.rows[0]) throw new NotFoundException("MINE_NOT_FOUND"); return r.rows[0]; }
  private mutationInput(raw:string,key:string){ if(!key||key.length<8) throw new BadRequestException("IDEMPOTENCY_KEY_REQUIRED"); return assertAmountUsdt(raw); }
  private assertBounds(a:string,min:string|null,max:string|null){ if(min&&cmpAmount(a,min)<0) throw new BadRequestException("AMOUNT_BELOW_MINIMUM"); if(max&&cmpAmount(a,max)>0) throw new BadRequestException("AMOUNT_ABOVE_MAXIMUM"); }
  private micros(d:Date){ return (BigInt(d.getTime())*1000n).toString(); }
  private mineView=(x:any)=>({id:x.id,code:x.code,displayName:x.display_name,description:x.description,assetCode:x.asset_code,status:x.status,principalCurrency:x.principal_currency,minPositionUsdt:x.min_position_usdt,maxPositionUsdt:x.max_position_usdt,metadata:x.metadata,activeRate:x.rate_version_id?{rateVersionId:x.rate_version_id,dailyRate:x.daily_rate,effectiveAt:x.effective_at}:null});
  private positionView=(x:any)=>({id:x.id,mineId:x.mine_id,mineCode:x.code,mineName:x.display_name,status:x.status,principalUsdt:x.principal_usdt,requestedPrincipalUsdt:x.requested_principal_usdt,startedAt:x.started_at,endedAt:x.ended_at,createdAt:x.created_at,updatedAt:x.updated_at});
  private pgCode(e:unknown){ return e&&typeof e==="object"&&"code" in e?String((e as {code?:unknown}).code??""):null; }
  private async withMutationLock<T>(scope:string,work:()=>Promise<T>):Promise<T>{
    const previous=this.mutationTails.get(scope)??Promise.resolve();
    let release!:()=>void;
    const current=new Promise<void>(resolve=>{ release=resolve; });
    const tail=previous.then(()=>current);
    this.mutationTails.set(scope,tail);
    await previous;
    try { return await work(); }
    finally { release(); if(this.mutationTails.get(scope)===tail) this.mutationTails.delete(scope); }
  }
}
