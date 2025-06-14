import { expectTypeOf } from "expect-type";

/* Enum To String Union */

export enum TransactionTypes {
  CC = "CC",
  BACS = "BACS",
}

export type AsValue = `${TransactionTypes}`;

expectTypeOf<AsValue>().toEqualTypeOf<"CC" | "BACS">();

/* Omit/Pick */

export type Product = {
  price: number;
  description: string;
};

export type Cart = {
  lineItems: {
    product: Product;
    amount: number;
  };
  total: number;
};

expectTypeOf<Pick<Cart, "total">>().toEqualTypeOf<{ total: number }>();
expectTypeOf<Omit<Cart["lineItems"], "amount">>().toEqualTypeOf<{
  product: Product;
}>();

/* Include/Exclude from union */

type ValueType1 = { myField: string };
type ValueType2 = {
  myOtherField: string;
};
type ValueType3 = { myField2: string };
type PossibleValues = ValueType1 | ValueType2 | ValueType3;

expectTypeOf<Exclude<PossibleValues, ValueType1>>().toEqualTypeOf<
  ValueType2 | ValueType3
>();

/* Looping/zipping through a type */

interface Fields {
  amount: number;
  formattedAmount: string;
}
type FieldDefs = NonNullable<{
  [K in keyof Fields]: {
    name: K;
    value: Fields[K];
  };
}>[keyof Fields];

expectTypeOf<FieldDefs>().toEqualTypeOf<
  { name: "amount"; value: number } | { name: "formattedAmount"; value: string }
>();

type FieldNames = keyof Fields;
type FieldValues = Fields[keyof Fields];

expectTypeOf<FieldNames>().toEqualTypeOf<"amount" | "formattedAmount">();
expectTypeOf<FieldValues>().toEqualTypeOf<number | string>();
// note the lack of relationship between amount <-> number and formattedAmount <-> string;

/* Simulating tuples */

enum DoorState {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
}
function getInverseValue<T>(val: T, possibleVals: [T, T]): T {
  return possibleVals[0] === val ? possibleVals[1] : possibleVals[0];
}

import assert from "node:assert";
import test from "node:test";

test("inverts the enum value", () => {
  assert.equal(
    getInverseValue<DoorState>(DoorState.OPEN, [
      DoorState.OPEN,
      DoorState.CLOSED,
    ]),
    DoorState.CLOSED,
  );
  assert.equal(
    getInverseValue<DoorState>(DoorState.CLOSED, [
      DoorState.OPEN,
      DoorState.CLOSED,
    ]),
    DoorState.OPEN,
  );
});
