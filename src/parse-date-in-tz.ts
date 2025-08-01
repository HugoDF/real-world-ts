import { TZDate } from "@date-fns/tz";

/**
 * Function equivalent to [moment.parseZone](https://momentjscom.readthedocs.io/en/latest/moment/01-parsing/14-parse-zone/).
 * In other words: parse from ISO format, but configure the timezone offset in the Date object to equal what was in the timestamp.
 *
 * @returns date - a TZDate, see [@date-fns/tz](https://github.com/date-fns/tz?tab=readme-ov-file#tzdate).
 *
 * For example, assuming REPL run using `TZ=UTC node`:
 * ```js
 * new Date('2020-10-14T14:03:00+0200').getHours(); // 12
 * require('date-fns').parseISO('2020-10-14T14:03:00+0200').getHours(); // 12
 *
 * parseISOToDateInTimezone(`2020-10-14T14:03:00+0200`).getHours(); // 14
 * ```
 *
 * @example Display the departure time from a station in UTC+2 TZ
 * ```js
 * parseISOToDateInTimezone(`2020-10-14T14:03:00+0200`).getHours(); // 14
 * parseISOToDateInTimezone(`2020-10-14T14:03:00+0200`).getMinutes(); // 3
 * ```
 *
 * @example Calculate the duration of a journey between stations in different TZs.
 * ```js
 * require('date-fns').differenceInMinutes(
 *   parseISOToDateInTimezone('2019-03-02T07:19:00+00:00').withTimeZone('UTC'),
 *   parseISOToDateInTimezone('2019-03-02T07:18:00+01:00').withTimeZone('UTC'),
 * ); // 61
 * ```
 */
export function parseISOToDateInTimezone(dateStr: string): TZDate {
  if (!dateStr) {
    // `moment.parseZone()` is like `moment()`, follow same behaviour.
    // TypeScript should error when doing eg. parseISOToDateInTimezone(undefined)
    // but we have a lot of JS still so include a runtime fallback.
    // Regardless, it also handles `parseISOToDateInTimezone('')`.
    return new TZDate();
  }
  if (typeof dateStr !== "string") {
    // This triggers eg. when tests pass a `moment()` object instead of `moment().toISOString()`.
    console.warn(
      `[parseISOToDateInTimezone] received non-string dateStr parameter`,
      dateStr,
    );

    // if it does happen on prod, try to coerce it back to a string
    if (process.env.NODE_ENV === "production") {
      dateStr = String(dateStr);
    }
  }
  // new Date(dateStr)/new TZDate(dateStr) doesn't handle timezone offset (`+0200`)
  // part of dateStr (`2020-10-14T14:03:00+0200`)
  return new TZDate(dateStr, getISOTimezoneOffset(dateStr));
}

import { differenceInMinutes } from "date-fns/differenceInMinutes";

test("parseISOToDateInTimezone - examples", () => {
  assert.equal(
    parseISOToDateInTimezone(`2020-10-14T14:03:00+0200`).getHours(),
    14,
  );
  assert.equal(
    differenceInMinutes(
      parseISOToDateInTimezone("2019-03-02T07:19:00+00:00").withTimeZone("UTC"),
      parseISOToDateInTimezone("2019-03-02T07:18:00+01:00").withTimeZone("UTC"),
    ),
    61,
  );
});

/**
 * Converts date strings to their timezone offset defaulting to UTC if no offset found:
 * - "2020-10-14T14:03:00+0200" -> "+0200"
 * - "2020-10-14T14:03:00-0200" -> "-0200"
 * - "2020-10-14T14:03:00" -> "UTC"
 * - "2020-10-14T14:03:00Z" -> "UTC"
 *
 * See `parseISO` implementation of TZ extraction: https://github.com/date-fns/date-fns/blob/main/src/parseISO/index.ts#L152
 */
function getISOTimezoneOffset(dateStr: string): string {
  // when not a valid TZ offset, ensure this function returns `undefined` or 'UTC' (not empty string etc)
  // to avoid `new TZDate(..., ...) // "Invalid Date"`
  if (!dateStr) {
    return "UTC";
  }

  // ISO string that doesn't include the "time" component
  if (!dateStr.includes("T")) {
    return "UTC";
  }

  const isDateUTC = dateStr.at(-1) === "Z";
  // short-circuit on dateStr that advertises as UTC, eg. "2022-03-23T08:55:00Z"
  if (isDateUTC) {
    return "UTC";
  }

  // Use a .lastIndex based approach because the input date string is not sanitized
  // better not to parse assuming a specific format eg. avoid the following:
  // const [_date, time] = dateStr.split('T'); const tzStr = time.slice(8);
  const positiveTzOffsetStartIndex = dateStr.lastIndexOf("+");
  if (positiveTzOffsetStartIndex > -1) {
    return dateStr.slice(positiveTzOffsetStartIndex);
  }

  const negativeTzOffsetStartIndex = dateStr.lastIndexOf("-");
  const lastColonCharacterIndex = dateStr.lastIndexOf(":");
  // Example: '2020-10-14T14:03:00-0200"
  //                           ^  ^
  //                      "colon" "minus"
  // we want to skip this block if the "last minus" is from "YYYY-MM-DD"
  if (
    negativeTzOffsetStartIndex > -1 &&
    lastColonCharacterIndex > -1 &&
    negativeTzOffsetStartIndex > lastColonCharacterIndex
  ) {
    return dateStr.slice(negativeTzOffsetStartIndex);
  }

  return "UTC";
}

import test, { describe } from "node:test";
import assert from "node:assert";

describe("getISOTimeZoneOffset", () => {
  [
    { dateStr: "2020-10-14T14:03:00+0200", expected: "+0200" },
    { dateStr: "2020-10-14T14:03:00-0200", expected: "-0200" },
    { dateStr: "2020-10-14T14:03:00", expected: "UTC" },
    { dateStr: "2020-10-14T14:03:00Z", expected: "UTC" },
    { dateStr: "2020-10-14", expected: "UTC" },
    { dateStr: "", expected: "UTC" },
    { dateStr: undefined as any, expected: "UTC" },
  ].forEach(({ dateStr, expected }) => {
    test(`returns ${expected} when called with "${dateStr}"`, () => {
      assert.deepStrictEqual(getISOTimezoneOffset(dateStr), expected);
    });
  });
});

/**
 * Benchmark
 */

import { Bench } from "tinybench";
import moment from "moment";

const bench = new Bench({ name: "tz-aware ISO parsing" });

bench
  .add("moment.parseZone()", () => {
    moment.parseZone("2020-10-14T14:03:00+0200");
  })
  .add("parseISOToDateInTimezone()", () => {
    parseISOToDateInTimezone("2020-10-14T14:03:00+0200");
  });

test(`Benchmark: ${bench.name}`, { skip: !process.env.BENCHMARK }, async () => {
  console.log("Starting benchmark run");
  await bench.run();
  console.table(bench.table());
});
