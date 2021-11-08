import { IBlockHeader, IStateData, IRound, IState, IStateNext, ISlot } from "../interfaces";
import { HashAlgorithms } from "../crypto/hash-algorithms";

export class State implements IState {
    public finalizedBlock: IBlockHeader;
    public finalizedRound: IRound;

    public justifiedBlock: IBlockHeader;
    public justifiedRound: IRound;

    public lastBlock: IBlockHeader;
    public lastRound: IRound;
    public lastSlot: ISlot;

    public next?: IStateNext;

    public constructor(data: IStateData) {
        this.finalizedBlock = data.finalizedBlock;
        this.finalizedRound = data.finalizedRound;
        this.justifiedBlock = data.justifiedBlock;
        this.justifiedRound = data.justifiedRound;
        this.lastBlock = data.lastBlock;
        this.lastRound = data.lastRound;
        this.lastSlot = data.lastSlot;

        if (this.isLastRoundNextRound()) {
            this.next = {
                round: this.lastRound,
                forgers: this.getNextForgers(this.lastRound),
                validators: this.getNextValidators(this.finalizedRound, this.lastRound),
            };
        }
    }

    public chainNewBlock(header: IBlockHeader): void {
        throw new Error("Method not implemented.");
    }

    public applyNextRound(round: IRound): void {
        if (this.isLastRoundNextRound()) {
            throw new Error("Cannot apply next round.");
        }
    }

    public clone(): State {
        const clone = new State({
            finalizedBlock: this.finalizedBlock,
            finalizedRound: this.finalizedRound,
            justifiedBlock: this.justifiedBlock,
            justifiedRound: this.justifiedRound,
            lastBlock: this.lastBlock,
            lastRound: this.lastRound,
            lastSlot: this.lastSlot,
        });

        if (this.next) {
            clone.next = { ...this.next };
        }

        return clone;
    }

    private isLastRoundNextRound(): boolean {
        return true;
    }

    private getNextForgers(nextRound: IRound): string[] {
        const nextForgers = nextRound.delegates.slice();
        let seed = HashAlgorithms.sha256(nextRound.no.toString());

        for (let i = 0; i < nextForgers.length; i++) {
            for (const x of seed.slice(0, Math.min(nextForgers.length - i, 4))) {
                const index = x % nextForgers.length;
                const t = nextForgers[index];
                nextForgers[index] = nextForgers[i];
                nextForgers[i] = t;
                i++;
            }

            seed = HashAlgorithms.sha256(seed);
        }

        return nextForgers;
    }

    private getNextValidators(finalizedRound: IRound, nextRound: IRound) {
        const constants = configManager.getMilestone(header.height);
        const trustedValidators = constants.trustedValidators ?? finalizedRound.delegates.slice().sort();
        const newValidators = nextRound.delegates.filter((publicKey) => !trustedValidators.includes(publicKey)).sort();
        const nextValidators = [...trustedValidators, ...newValidators];

        return nextValidators;
    }
}
