import { Hash } from "../crypto/hash";
import { MultiSignatureError, InvalidMultiSignatureAssetError, DuplicateParticipantError } from "../errors";
import { IMultiSignatureAsset, ISchemaValidationResult, ITransactionData, IVerifyOptions } from "../interfaces";
import { configManager } from "../managers";
import { validator } from "../validation";
import { TransactionTypeFactory } from "./types/factory";
import { Utils } from "./utils";
import { Deserializer } from "./deserializer";
import { isExceptionTransactionData } from "../utils";

export class Verifier {
    public static verify(data: ITransactionData, options?: IVerifyOptions): boolean {
        if (isExceptionTransactionData(data)) {
            return true;
        }

        if (configManager.getMilestone().aip11 && (!data.version || data.version === 1)) {
            return false;
        }

        return Verifier.verifyHash(data, options?.disableVersionCheck);
    }

    public static verifySecondSignature(
        transaction: ITransactionData,
        publicKey: string,
        options?: IVerifyOptions,
    ): boolean {
        const secondSignature: string | undefined = transaction.secondSignature || transaction.signSignature;

        if (!secondSignature) {
            return false;
        }

        const hash: Buffer = Utils.toHash(transaction, {
            disableVersionCheck: options?.disableVersionCheck,
            excludeSecondSignature: true,
        });
        return this.internalVerifySignature(hash, secondSignature, publicKey);
    }

    public static verifySignatures(transaction: ITransactionData, multiSignature: IMultiSignatureAsset): boolean {
        if (!multiSignature) throw new InvalidMultiSignatureAssetError();
        if (!transaction.signatures) return false;

        const hash: Buffer = Utils.toHash(transaction, {
            excludeSignature: true,
            excludeSecondSignature: true,
            excludeMultiSignature: true,
        });

        const { publicKeys, min }: IMultiSignatureAsset = multiSignature;
        const indexes = new Set<number>();

        try {
            for (const multiSignature of transaction.signatures) {
                const index = Deserializer.getSchnorrMultiSignatureIndex(multiSignature);
                const signature = Deserializer.getSchnorrMultiSignatureSignature(multiSignature);
                const publicKey = publicKeys[index];

                if (!publicKey) throw new Error("Invalid index.");
                if (indexes.has(index)) throw new DuplicateParticipantError();
                if (!Hash.verifySchnorr(hash, signature, publicKey)) throw new Error("Invalid signature.");

                indexes.add(index);

                if (indexes.size === min) {
                    return true;
                }
            }
        } catch (error) {
            throw new MultiSignatureError(error.message);
        }

        return false;
    }

    public static verifyHash(data: ITransactionData, disableVersionCheck = false): boolean {
        const { signature, senderPublicKey } = data;

        if (!signature || !senderPublicKey) {
            return false;
        }

        const hash: Buffer = Utils.toHash(data, {
            disableVersionCheck,
            excludeSignature: true,
            excludeSecondSignature: true,
        });

        return this.internalVerifySignature(hash, signature, senderPublicKey);
    }

    public static verifySchema(data: ITransactionData, strict = true): ISchemaValidationResult {
        const transactionType = TransactionTypeFactory.get(data.type, data.typeGroup, data.version);

        if (!transactionType) {
            throw new Error();
        }

        const { $id } = transactionType.getSchema();

        return validator.validate(strict ? `${$id}Strict` : `${$id}`, data);
    }

    private static internalVerifySignature(hash: Buffer, signature: string, publicKey: string): boolean {
        const isSchnorr = Buffer.from(signature, "hex").byteLength === 64;
        if (isSchnorr) {
            return Hash.verifySchnorr(hash, signature, publicKey);
        }

        return Hash.verifyECDSA(hash, signature, publicKey);
    }
}
