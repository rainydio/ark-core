import { Container } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";

@Container.injectable()
export class ConsensusState {
    public applyBlock(block: Interfaces.IBlock): void {
        //
    }
}
