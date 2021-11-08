import { IBlockData, IBlockSignedSection, IBlockHeader } from "../interfaces";
import { configManager } from "../managers";
import { BigNumber } from "../utils";
import ByteBuffer from "bytebuffer";

export class Deserializer {
    public static deseriaizeHeader(serialized: Buffer): IBlockHeader {
        const buffer = ByteBuffer.wrap(serialized);
        const signedSection = this.readSignedSection(buffer);
        const blockSignature = this.readBlockSignature(buffer);

        return { ...signedSection, blockSignature };
    }

    public static deserializeData(serialized: Buffer): IBlockData {
        const buffer = ByteBuffer.wrap(serialized);
        const signedSection = this.readSignedSection(buffer);
        const blockSignature = this.readBlockSignature(buffer);
        const transactions = this.readTransactions(buffer, signedSection.numberOfTransactions);

        return { ...signedSection, blockSignature, transactions };
    }

    public static readSignedSection(buffer: ByteBuffer): IBlockSignedSection {
        const section = {} as IBlockSignedSection;
        const version = buffer.readUint32();

        if (version !== 0 && version !== 1) {
            throw new Error("Unexpected block version.");
        }

        section.version = version;
        section.timestamp = buffer.readUint32();
        section.height = buffer.readUint32();
        section.previousBlock = this.readId(buffer, section.height - 1 || 1);
        section.numberOfTransactions = buffer.readUint32();
        section.totalAmount = BigNumber.make(buffer.readUint64().toString());
        section.totalFee = BigNumber.make(buffer.readUint64().toString());
        section.reward = BigNumber.make(buffer.readUint64().toString());
        section.payloadLength = buffer.readUint32();
        section.payloadHash = buffer.readBytes(32).toString("hex");
        section.generatorPublicKey = buffer.readBytes(33).toString("hex");

        if (section.version === 1) {
            section.previousBlockVotes = this.readPreviousBlockVotes(buffer);
        }

        return section;
    }

    public static readId(buffer: ByteBuffer, height: number): string {
        const constants = configManager.getMilestone(height);

        if (constants.block.idFullSha256) {
            return buffer.readBytes(32).toString("hex");
        } else {
            return buffer.readBytes(8).BE().readUint64().toString(10);
        }
    }

    public static readPreviousBlockVotes(buffer: ByteBuffer): string[] {
        return [];
    }

    public static readBlockSignature(buffer: ByteBuffer): string {
        if (buffer.readUint8(buffer.offset) !== 0x30) {
            throw new Error("Not ECDSA signature.");
        }

        return buffer.readBytes(2 + buffer.readUint8(buffer.offset + 1)).toString("hex");
    }

    public static readTransactions(buffer: ByteBuffer, count: number): Buffer[] {
        const lengths: number[] = [];
        for (let i = 0; i < count; i++) {
            lengths.push(buffer.readUint32());
        }

        const transactions: Buffer[] = [];
        for (const length of lengths) {
            const serialized = buffer.readBytes(length).toBuffer();
            transactions.push(serialized);
        }

        return transactions;
    }
}
