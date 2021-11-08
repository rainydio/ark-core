import { BigNumber } from "../utils";
import { ITransaction, ITransactionJson } from "./transactions";

export type IBlock = IBlock0 | IBlock1;
export type IBlockData = IBlockData0 | IBlockData1;
export type IBlockHeader = IBlockHeader0 | IBlockHeader1;
export type IBlockSignedSection = IBlockSignedSection0 | IBlockSignedSection1;

export type IBlockJson = {
    id: string;
    idHex: string;
    serialized: string;

    timestamp: number;
    version: number;
    height: number;
    previousBlock: string;
    previousBlockHex: string;
    numberOfTransactions: number;
    totalAmount: string;
    totalFee: string;
    reward: string;
    payloadLength: number;
    payloadHash: string;
    generatorPublicKey: string;
    previousBlockVotes?: string[];
    blockSignature: string;
    transactions: ITransactionJson[];
};

// Block version=0

export interface IBlock0 {
    readonly serialized: Buffer;
    readonly id: string;
    readonly header: IBlockHeader0;
    readonly transactions: ITransaction[];

    toJson(): IBlockJson;
}

export type IBlockSignedSection0 = {
    version: 0;
    timestamp: number;
    height: number;
    previousBlock: string;
    numberOfTransactions: number;
    totalAmount: BigNumber;
    totalFee: BigNumber;
    reward: BigNumber;
    payloadLength: number;
    payloadHash: string;
    generatorPublicKey: string;
};

export type IBlockHeader0 = IBlockSignedSection0 & { blockSignature: string };
export type IBlockData0 = IBlockHeader0 & { transactions: Buffer[] };

// Block version=1

export interface IBlock1 {
    readonly serialized: Buffer;
    readonly id: string;
    readonly header: IBlockHeader1;
    readonly transactions: ITransaction[];

    toJson(): IBlockJson;
}

export type IBlockSignedSection1 = {
    version: 1;
    timestamp: number;
    height: number;
    previousBlock: string;
    numberOfTransactions: number;
    totalAmount: BigNumber;
    totalFee: BigNumber;
    reward: BigNumber;
    payloadLength: number;
    payloadHash: string;
    generatorPublicKey: string;
    previousBlockVotes: string[];
};

export type IBlockHeader1 = IBlockSignedSection1 & { blockSignature: string };
export type IBlockData1 = IBlockHeader1 & { transactions: Buffer[] };
