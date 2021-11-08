import { IBlockHeader } from "./block";

export type IStateData = {
    readonly finalizedBlock: IBlockHeader;
    readonly finalizedRound: IRound;

    readonly justifiedBlock: IBlockHeader;
    readonly justifiedRound: IRound;

    readonly lastBlock: IBlockHeader;
    readonly lastRound: IRound;
    readonly lastSlot: ISlot;
};

export type IStateNext = {
    readonly round: IRound;
    readonly forgers: string[];
    readonly validators: string[];
};

export type IState = IStateData & {
    readonly next?: IStateNext;

    chainNewBlock(header: IBlockHeader): void;
    applyNextRound(round: IRound): void;
    clone(): IState;
};

export type ISlot = {
    readonly no: number;
    readonly timestamp: number;
};

export type IRound = {
    readonly no: number;
    readonly delegates: string[];
};
