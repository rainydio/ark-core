import { IStateNext, IStateData } from "../interfaces";
import { State } from "./state";

export class Factory {
    public static createState(data: IStateData): IStateNext {
        return new State(data);
    }
}
