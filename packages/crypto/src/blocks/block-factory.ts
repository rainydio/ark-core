import { Hash } from "../crypto";
import {
    IBlock,
    IBlockData,
    IBlockJson,
    IKeyPair,
    ITransaction,
    IBlockSignedSection,
    IBlockHeader,
} from "../interfaces";
import { BigNumber, isExceptionBlockData } from "../utils";
import { Block } from "./block";
import { Deserializer } from "./deserializer";
import { Serializer } from "./serializer";
import { validator } from "../validation";
import { BlockSchemaError } from "../errors";

export class BlockFactory {
    // @todo: add a proper type hint for data
    public static make(nonSignedHeader: IBlockSignedSection, keys: IKeyPair): IBlockHeader {
        const hash = Serializer.getSignedHash(nonSignedHeader);
        const blockSignature = Hash.signECDSA(hash, keys);

        return { ...nonSignedHeader, blockSignature };
    }

    public static fromHex(hex: string): IBlock {
        return this.fromSerialized(Buffer.from(hex, "hex"));
    }

    public static fromBytes(buffer: Buffer): IBlock {
        return this.fromSerialized(buffer);
    }

    public static fromJson(json: IBlockJson): IBlock | undefined {
        // @ts-ignore
        const data: IBlockData = { ...json };
        data.totalAmount = BigNumber.make(data.totalAmount);
        data.totalFee = BigNumber.make(data.totalFee);
        data.reward = BigNumber.make(data.reward);

        if (data.transactions) {
            for (const transaction of data.transactions) {
                transaction.amount = BigNumber.make(transaction.amount);
                transaction.fee = BigNumber.make(transaction.fee);
            }
        }

        return this.fromData(data);
    }

    public static fromData(
        data: IBlockData,
        options: { deserializeTransactionsUnchecked?: boolean } = {},
    ): IBlock | undefined {
        this.applySchema(data);

        if (block) {
            const serialized: Buffer = Serializer.serializeWithTransactions(data);
            const block: IBlock = new Block({
                ...Deserializer.deserializeData(serialized, false, options),
                id: data.id,
            });
            block.serialized = serialized.toString("hex");

            return block;
        }

        return undefined;
    }

    private static fromSerialized(serialized: Buffer): IBlock {
        const deserialized: { data: IBlockData; transactions: ITransaction[] } =
            Deserializer.deserializeData(serialized);

        const validated: IBlockData | undefined = Block.applySchema(deserialized.data);

        if (validated) {
            deserialized.data = validated;
        }

        const block: IBlock = new Block(deserialized);
        block.serialized = serialized.toString("hex");

        return block;
    }

    public static applySchema(data: IBlockData): void {
        const errors = validator.validate("block", data);

        for (const err of errors) {
            const match = err.dataPath.match(/\.transactions\[([0-9]+)\]/);
            const txData = match && match[1] && data.transactions[parseInt(match[1])];

            if (txData && isExceptionTransactionData(txData)) continue;
            if (isExceptionBlockData(data)) break;

            throw new BlockSchemaError(
                data.height,
                `Invalid data${err.dataPath ? `at ${err.dataPath}` : ""}: ` +
                    `${err.message}: ${JSON.stringify(err.data)}`,
            );
        }
    }
}
