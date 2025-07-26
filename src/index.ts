import { expectTypeOf } from "expect-type";

/* Enum To String Union */

export enum TransactionTypes {
  CC = "CC",
  BACS = "BACS",
}

export type AsValue = `${TransactionTypes}`;

expectTypeOf<AsValue>().toEqualTypeOf<"CC" | "BACS">();

function MyComp({
  txType,
  txTypeStr,
}: {
  txType: TransactionTypes;
  txTypeStr: AsValue;
}) {
  //...
}
MyComp({ txType: TransactionTypes.CC, txTypeStr: "CC" });
// @ts-expect-error Type '"CC"' is not assignable to type 'TransactionTypes'.
MyComp({ txType: "CC", txTypeStr: TransactionTypes.CC });

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

function setFieldNaive(name: FieldNames, value: FieldValues) {}
setFieldNaive("amount", "200"); // no error

function setFieldStrict(update: FieldDefs) {}
// @ts-expect-error
// Argument of type '{ name: "amount"; value: string; }' is not assignable to parameter of type 'FieldDefs'.
//  Types of property 'value' are incompatible.
//    Type 'string' is not assignable to type 'number'.
setFieldStrict({ name: "amount", value: "200" });
// no error
setFieldStrict({ name: "amount", value: 200 });

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

/* Enum value reverse mapping */

enum PaymentType {
  CC = 1,
  BACS = 2,
}
enum Platform {
  WEB,
  MOBILE,
}
enum PlatformStringValues {
  WEB = "web",
  MOBILE = "mobile",
}

const paymentType = PaymentType.CC;
const platform = Platform.MOBILE;
const platformString = Platform.WEB;

test("reverse mapping of enum with set numeric values", () => {
  assert.equal(PaymentType[paymentType], "CC");
});
test("reverse mapping of enum with implicit numeric values", () => {
  assert.equal(Platform[platform], "MOBILE");
});
test("reverse mapping of enum with string values - does not work", () => {
  expectTypeOf(PlatformStringValues).not.toHaveProperty(platformString);
  // @ts-expect-error
  // Element implicitly has an 'any' type because expression of type 'Platform.WEB' can't be used to index type 'typeof PlatformStringValues'.
  // Property '[Platform.WEB]' does not exist on type 'typeof PlatformStringValues'
  assert.equal(PlatformStringValues[platformString], undefined);
});

/* Exhaustive switch match over union */
type PlatformType = "MOBILE" | "WEB";
function generateAnalyticsPlatform(platform: PlatformType) {
  switch (platform) {
    case "MOBILE":
      return "mobile";
    case "WEB":
      return "web";
    default:
      assertNever(platform);
  }
}

function assertNever(value: never) {
  if (value) {
    throw new Error(`Unexpected value "${value}"`);
  }
}

[
  { platformValue: "WEB", expected: "web" } as const,
  { platformValue: "MOBILE", expected: "mobile" } as const,
].map(({ platformValue, expected }) => {
  test(`generateAnalyticsPlatform(${platformValue}) outputs '${expected}'`, () => {
    assert.equal(generateAnalyticsPlatform(platformValue), expected);
  });
});
