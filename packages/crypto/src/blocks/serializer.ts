import ByteBuffer from "bytebuffer";

import { IBlockData, IBlockSignedSection, IBlockHeader } from "../interfaces";
import { configManager } from "../managers/config";
import { HashAlgorithms } from "../crypto";

export class Serializer {
    private static cachedIds = new WeakMap<IBlockHeader, string>();

    public static getId(header: IBlockHeader): string {
        let id = this.cachedIds.get(header);

        if (!id) {
            const constants = configManager.getMilestone(header.height);
            const serializedHeader = Serializer.serializeHeader(header);
            const hash = HashAlgorithms.sha256(serializedHeader);
            const computedId = constants.block.idFullSha256
                ? hash.toString("hex")
                : hash.readBigUInt64LE().toString(10);

            const outlookTable: Record<string, string> = configManager.get("exceptions").outlookTable ?? {};
            id = outlookTable[computedId] ?? computedId;
            this.cachedIds.set(header, id);
        }

        return id;
    }

    public static getIdHex(id: string): string {
        if (id.length === 64) {
            return id;
        } else {
            return BigInt(id).toString(16).padStart(16, "0");
        }
    }

    public static getSignedHash(candidateHeader: IBlockSignedSection): Buffer {
        const constants = configManager.getMilestone(candidateHeader.height);
        const buffer = new ByteBuffer(constants.block.maxPayload);
        this.writeSignedSection(buffer, candidateHeader);
        const serialized = buffer.flip().toBuffer();

        return HashAlgorithms.sha256(serialized);
    }

    public static serializeHeader(header: IBlockHeader): Buffer {
        const constants = configManager.getMilestone(header.height);
        const buffer = new ByteBuffer(constants.block.maxPayload);
        this.writeSignedSection(buffer, header);
        this.writeBlockSignature(buffer, header.blockSignature);
        return buffer.flip().toBuffer();
    }

    public static serializeData(data: IBlockData): Buffer {
        const constants = configManager.getMilestone(data.height);
        const buffer = new ByteBuffer(constants.block.maxPayload);
        this.writeSignedSection(buffer, data);
        this.writeBlockSignature(buffer, data.blockSignature);
        this.writeTransactions(buffer, data.transactions);
        return buffer.flip().toBuffer();
    }

    public static writeSignedSection(buffer: ByteBuffer, header: IBlockSignedSection): void {
        const previosBlockHex = this.getIdHex(header.previousBlock);

        buffer.writeUint8(header.version);
        buffer.writeUint32(header.timestamp);
        buffer.writeUint32(header.height);
        buffer.writeBytes(previosBlockHex, "hex");
        buffer.writeUint32(header.numberOfTransactions);
        // @ts-ignore: incorrect ByteBuffer types
        buffer.writeUint64(header.totalAmount.toString());
        // @ts-ignore: incorrect ByteBuffer types
        buffer.writeUint64(header.totalFee.toString());
        // @ts-ignore: incorrect ByteBuffer types
        buffer.writeUint64(header.reward.toString());
        buffer.writeUint32(header.payloadLength);
        buffer.writeBytes(header.payloadHash, "hex");
        buffer.writeBytes(header.generatorPublicKey, "hex");

        if (header.version === 1) {
            this.writePreviousBlockVotes(buffer, header.previousBlockVotes);
        }
    }

    public static writePreviousBlockVotes(buffer: ByteBuffer, previousBlockVotes: string[]): void {
        //
    }

    public static writeBlockSignature(buffer: ByteBuffer, blockSignature: string): void {
        buffer.writeBytes(blockSignature, "hex");
    }

    public static writeTransactions(buffer: ByteBuffer, transactions: Buffer[]): void {
        //
    }
}
