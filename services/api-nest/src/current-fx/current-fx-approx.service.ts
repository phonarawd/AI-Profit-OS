/**
 * Architecture C apply host.
 * DISPLAY_ONLY_INPUT. userId financial read 0. DB write 0.
 */
import { BadRequestException, Injectable } from "@nestjs/common";
import { FxSnapshotService } from "../opportunities/fx-snapshot.service";
import {
  applyCurrentFxApprox,
  CurrentFxApproxRequestError,
  type CurrentFxApproxV1,
} from "./current-fx-approx.apply";

@Injectable()
export class CurrentFxApproxService {
  private readonly fxSnapshots: FxSnapshotService;

  constructor(fxSnapshots: FxSnapshotService) {
    this.fxSnapshots = fxSnapshots;
  }

  async apply(raw: unknown): Promise<CurrentFxApproxV1> {
    try {
      return await applyCurrentFxApprox(raw, () =>
        this.fxSnapshots.getLatestCurrentFxSnapshot(),
      );
    } catch (err) {
      if (err instanceof CurrentFxApproxRequestError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
