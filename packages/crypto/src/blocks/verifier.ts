import { IBlockHeader, ITransactionData, IBlockData, IBlockHeader0, ITransaction, IBlockHeader1 } from "../interfaces";
import { configManager } from "../managers";
import { Serializer } from "./serializer";
import { Hash, Slots } from "../crypto";

export class Verifier {
    public static getVerifiedBlock0(header: IBlockHeader0, transactions: ITransaction[]): IBlock0 {
        throw new Error();
    }

    // public static getVerifiedBlock1(header: IBlockHeader1, )

    public static verifyHeader0(header: IBlockHeader0): void {
        //
    }

    public static verifyHeader1(header: IBlockHeader1, validators: IBlockValidators): void {
        //
    }

    public static verify(data: IBlockData): VerificationErrors {
        const errors: VerificationErrors = [];
        const serialized = Serializer.serializeData(data);
        const constants = configManager.getMilestone(data.height);

        try {
            if (data.height !== 1) {
                if (!data.previousBlock) {
                    errors.push("Invalid previous block");
                }
            }

            if (!data.reward.isEqualTo(constants.reward)) {
                errors.push(`Invalid block reward: ${data.reward}, expected: ${constants.reward}`);
            }

            errors.push(...this.verifySignature(data));

            if (data.version !== constants.block.version) {
                errors.push("Invalid block version");
            }

            if (data.timestamp > Slots.getTime() + constants.blocktime) {
                errors.push("Invalid block timestamp");
            }

            if (serialized.length > constants.block.maxPayload) {
                errors.push(`Payload is too large: ${serialized.length} > ${constants.block.maxPayload}`);
            }

            const transactionErrors = data.transactions.map((transaction) => this.verifyTransaction(transaction));

            for (const transaction of data.transactions) {
            }
        } catch (error) {
            errors.push(error.message);
        }

        return errors;
    }

    public static verifySignature(header: IBlockHeader): VerificationErrors {
        if (!header.blockSignature) {
            return ["Missing block signature"]; // unreachable
        }

        if (!Hash.verifyECDSA(Serializer.getSignedHash(header), header.blockSignature, header.generatorPublicKey)) {
            return ["Invalid block signature"];
        }

        return [];
    }

    public static verifyTransaction(transaction: ITransactionData): VerificationErrors {
        return [];
    }
}
