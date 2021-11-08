import { IBlockSignedSection } from "../interfaces";

export class Signer {
    public static sign(nonSignedHeader: IBlockSignedSection, keys: IKeyPair): string {}
}
