import { SATOSHI } from "../constants";
import { ITransactionData, IBlockData } from "../interfaces";
import { configManager } from "../managers";
import { Base58 } from "./base58";
import { BigNumber } from "./bignum";
import { calculateBlockTime, isNewBlockTime } from "./block-time-calculator";
import { isLocalHost, isValidPeer } from "./is-valid-peer";
import { Transactions } from "..";
import memoizeOne from "memoize-one";
import * as Blocks from "../blocks";

export const getExceptionBlockIds = memoizeOne((network: number): Set<string> => {
    return new Set<string>(configManager.get("exceptions.blocks"));
});

export const getExceptionTransactionIds = memoizeOne((network: number): Set<string> => {
    return new Set<string>(configManager.get("exceptions.transactions"));
});

export const getGenesisTransactionIds = memoizeOne((network: number): Set<string> => {
    const genesisTransactions = configManager.get("genesisBlock.transactions") ?? [];
    const genesisTxIds = genesisTransactions.map((txData: ITransactionData) => txData.id!);

    return new Set<string>(genesisTxIds);
});

export const isExceptionBlockData = (blockData: IBlockData): boolean => {
    const blockId = Blocks.Serializer.getId(blockData);

    if (blockId.length === 64) {
        const network: number = configManager.get("network.pubKeyHash");
        return getExceptionBlockIds(network).has(blockId);
    }

    const whitelist = configManager.get("exceptions.blocksTransactions");
    const expectedTxIds: string[] = whitelist[blockId] ?? [];
    const actualTxIds = blockData.transactions?.map((txData) => Transactions.Transaction.getId(txData)) ?? [];

    const everyExpectedFound = expectedTxIds.every((id) => actualTxIds.includes(id));
    const everyActualFound = actualTxIds.every((id) => expectedTxIds.includes(id));

    return everyExpectedFound && everyActualFound;
};

export const isExceptionTransactionData = (transactionData: ITransactionData): boolean => {
    const txId = Transactions.Transaction.getId(transactionData);
    const network: number = configManager.get("network.pubKeyHash");

    return getExceptionTransactionIds(network).has(txId);
};

export const isGenesisTransactionId = (transactionId: string): boolean => {
    const network: number = configManager.get("network.pubKeyHash");
    return getGenesisTransactionIds(network).has(transactionId);
};

/**
 * Get human readable string from satoshis
 */
export const formatSatoshi = (amount: BigNumber): string => {
    const localeString = (+amount / SATOSHI).toLocaleString("en", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8,
    });

    return `${localeString} ${configManager.get("network.client.symbol")}`;
};

export const numberToHex = (num: number, padding = 2): string => {
    const indexHex: string = Number(num).toString(16);

    return "0".repeat(padding - indexHex.length) + indexHex;
};

export const maxVendorFieldLength = (height?: number): number => configManager.getMilestone(height).vendorFieldLength;

export const isSupportedTransactionVersion = (version: number): boolean => {
    const aip11: boolean = configManager.getMilestone().aip11;

    if (aip11 && version !== 2) {
        return false;
    }

    if (!aip11 && version !== 1) {
        return false;
    }

    return true;
};

export { Base58, BigNumber, isValidPeer, isLocalHost, calculateBlockTime, isNewBlockTime };
