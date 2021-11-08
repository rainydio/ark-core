import ByteBuffer from "bytebuffer";

import { TransactionType, TransactionTypeGroup } from "../enums";
import {
    MultiSignatureError,
    InvalidTransactionBytesError,
    TransactionVersionError,
    DuplicateParticipantError,
} from "../errors";
import { Address } from "../identities";
import { IDeserializeOptions, ITransaction, ITransactionData } from "../interfaces";
import { BigNumber, isSupportedTransactionVersion } from "../utils";
import { TransactionTypeFactory } from "./types";

// Reference: https://github.com/ArkEcosystem/AIPs/blob/master/AIPS/aip-11.md
export class Deserializer {
    public static applyV1Compatibility(transaction: ITransactionData): void {
        transaction.secondSignature = transaction.secondSignature || transaction.signSignature;
        transaction.typeGroup = TransactionTypeGroup.Core;

        if (transaction.type === TransactionType.Vote && transaction.senderPublicKey) {
            transaction.recipientId = Address.fromPublicKey(transaction.senderPublicKey, transaction.network);
        } else if (
            transaction.type === TransactionType.MultiSignature &&
            transaction.asset &&
            transaction.asset.multiSignatureLegacy
        ) {
            transaction.asset.multiSignatureLegacy.keysgroup = transaction.asset.multiSignatureLegacy.keysgroup.map(
                (k) => (k.startsWith("+") ? k : `+${k}`),
            );
        }
    }

    public static deserialize(serialized: string | Buffer, options: IDeserializeOptions = {}): ITransaction {
        const data = {} as ITransactionData;

        const buffer: ByteBuffer = this.getByteBuffer(serialized);
        this.deserializeCommon(data, buffer);

        const instance: ITransaction = TransactionTypeFactory.create(data);
        this.deserializeVendorField(instance, buffer);

        // Deserialize type specific parts
        instance.deserialize(buffer);

        this.deserializeSignatures(data, buffer);

        if (data.version) {
            if (
                options.acceptLegacyVersion ||
                options.disableVersionCheck ||
                isSupportedTransactionVersion(data.version)
            ) {
                if (data.version === 1) {
                    this.applyV1Compatibility(data);
                }
            } else {
                throw new TransactionVersionError(data.version);
            }
        }

        instance.serialized = buffer.flip().toBuffer();

        return instance;
    }

    public static deserializeCommon(transaction: ITransactionData, buf: ByteBuffer): void {
        buf.skip(1); // Skip 0xFF marker
        transaction.version = buf.readUint8();
        transaction.network = buf.readUint8();

        if (transaction.version === 1) {
            transaction.type = buf.readUint8();
            transaction.timestamp = buf.readUint32();
        } else {
            transaction.typeGroup = buf.readUint32();
            transaction.type = buf.readUint16();
            transaction.nonce = BigNumber.make(buf.readUint64().toString());
        }

        transaction.senderPublicKey = buf.readBytes(33).toString("hex");
        transaction.fee = BigNumber.make(buf.readUint64().toString());
        transaction.amount = BigNumber.ZERO;
    }

    private static deserializeVendorField(transaction: ITransaction, buf: ByteBuffer): void {
        const vendorFieldLength: number = buf.readUint8();
        if (vendorFieldLength > 0) {
            if (transaction.hasVendorField()) {
                const vendorFieldBuffer: Buffer = buf.readBytes(vendorFieldLength).toBuffer();
                transaction.data.vendorField = vendorFieldBuffer.toString("utf8");
            } else {
                buf.skip(vendorFieldLength);
            }
        }
    }

    private static deserializeSignatures(transaction: ITransactionData, buf: ByteBuffer): void {
        if (transaction.version === 1) {
            this.deserializeECDSA(transaction, buf);
        } else {
            this.deserializeSchnorrOrECDSA(transaction, buf);
        }
    }

    private static deserializeSchnorrOrECDSA(transaction: ITransactionData, buf: ByteBuffer): void {
        if (this.detectSchnorr(buf)) {
            this.deserializeSchnorr(transaction, buf);
        } else {
            this.deserializeECDSA(transaction, buf);
        }
    }

    private static deserializeECDSA(transaction: ITransactionData, buf: ByteBuffer): void {
        const currentSignatureLength = (): number => {
            buf.mark();

            const lengthHex: string = buf.skip(1).readBytes(1).toString("hex");

            buf.reset();
            return parseInt(lengthHex, 16) + 2;
        };

        // Signature
        if (buf.remaining()) {
            const signatureLength: number = currentSignatureLength();
            transaction.signature = buf.readBytes(signatureLength).toString("hex");
        }

        const beginningMultiSignature = () => {
            buf.mark();

            const marker: number = buf.readUint8();

            buf.reset();

            return marker === 255;
        };

        // Second Signature
        if (buf.remaining() && !beginningMultiSignature()) {
            const secondSignatureLength: number = currentSignatureLength();
            transaction.secondSignature = buf.readBytes(secondSignatureLength).toString("hex");
        }

        // Multi Signatures
        if (buf.remaining() && beginningMultiSignature()) {
            buf.skip(1);
            const multiSignature: string = buf.readBytes(buf.limit - buf.offset).toString("hex");
            transaction.signatures = [multiSignature];
        }

        if (buf.remaining()) {
            throw new InvalidTransactionBytesError("signature buffer not exhausted");
        }
    }

    private static deserializeSchnorr(transaction: ITransactionData, buf: ByteBuffer): void {
        const canReadNonMultiSignature = () => {
            return buf.remaining() && (buf.remaining() % 64 === 0 || buf.remaining() % 65 !== 0);
        };

        if (canReadNonMultiSignature()) {
            transaction.signature = buf.readBytes(64).toString("hex");
        }

        if (canReadNonMultiSignature()) {
            transaction.secondSignature = buf.readBytes(64).toString("hex");
        }

        if (buf.remaining()) {
            if (buf.remaining() % 65 === 0) {
                try {
                    transaction.signatures = this.readSchnorrMultiSignatures(buf, buf.remaining() / 65);
                } catch (error) {
                    throw new MultiSignatureError(error.message);
                }
            } else {
                throw new InvalidTransactionBytesError("signature buffer not exhausted");
            }
        }
    }

    private static detectSchnorr(buf: ByteBuffer): boolean {
        const remaining: number = buf.remaining();

        // `signature` / `secondSignature`
        if (remaining === 64 || remaining === 128) {
            return true;
        }

        // `signatures` of a multi signature transaction (type != 4)
        if (remaining % 65 === 0) {
            return true;
        }

        // only possiblity left is a type 4 transaction with and without a `secondSignature`.
        if ((remaining - 64) % 65 === 0 || (remaining - 128) % 65 === 0) {
            return true;
        }

        return false;
    }

    private static getByteBuffer(serialized: Buffer | string): ByteBuffer {
        if (!(serialized instanceof Buffer)) {
            serialized = Buffer.from(serialized, "hex");
        }

        const buffer: ByteBuffer = new ByteBuffer(serialized.length, true);
        buffer.append(serialized);
        buffer.reset();

        return buffer;
    }

    public static readSchnorrMultiSignatures(buffer: ByteBuffer, count: number): string[] {
        const indexes = new Set<number>();
        const signatures: string[] = [];

        for (let i = 0; i < count; i++) {
            const index = buffer.readUint8(buffer.offset);
            buffer.readBytes(64, buffer.offset + 1); // touch signature

            if (indexes.has(index)) {
                throw new DuplicateParticipantError();
            }

            signatures.push(buffer.readBytes(65).toString("hex"));
            indexes.add(index);
        }

        return signatures;
    }

    public static getSchnorrMultiSignatureIndex(multiSignature: string): number {
        if (multiSignature.length !== 130) {
            throw new MultiSignatureError("Invalid signature string.");
        }

        const index = parseInt(`${multiSignature[0]}${multiSignature[1]}`, 16);
        if (isNaN(index)) {
            throw new MultiSignatureError("Invalid signature string.");
        }

        return index;
    }

    public static getSchnorrMultiSignatureSignature(multiSignature: string): string {
        if (multiSignature.length !== 130) {
            throw new MultiSignatureError("Invalid signature string.");
        }

        return multiSignature.slice(2);
    }
}
