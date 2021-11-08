export interface IDecryptResult {
    privateKey: Buffer;
    compressed: boolean;
}

export type IVote = {
    index: number;
    publicKey: string;
};
