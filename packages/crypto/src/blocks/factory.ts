import { IBlockHeader, ITransaction, IBlock, IBlockData0, IBlockData1 } from "../interfaces";

export class Factory {
    public fromData0(data: IBlockData0, transactionFactory: ITransactionFactory[]): IBlock0 {
        throw new Error();
    }

    public fromData1(data: IBlockData1, transactionFactory: ITransactionFactory[]): IBlock1 {
        throw new Error();
    }
}
